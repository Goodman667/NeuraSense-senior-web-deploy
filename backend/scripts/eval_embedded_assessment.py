"""
Evaluation Script — Innovation Point 1
嵌入式多模态评估离线评估脚本

Compares three experimental conditions (thesis design §4.9):
    C1: text-only embedded assessment
    C2: multimodal embedded assessment (quality gating + confidence calibration)
    C3: multimodal ablation (NO quality gating, NO confidence calibration)
    R1: post-session PHQ-9 questionnaire (ground truth)

Metrics (thesis §4.10):
    Confirmatory:
        M1: paired diff in mean item-level weighted kappa (C2 vs C1)
        M2: paired diff in mean item-level MAE (C2 vs C1)
    Secondary:
        - targeted-item gain contrast (PHQ-3,4,7,8 vs others)
        - severity-band classification (macro-F1, balanced accuracy)
        - Brier score / calibration summary
        - sensor quality statistics
        - fallback frequency
        - C1 vs C2 vs C3 full comparison

Usage:
    python scripts/eval_embedded_assessment.py --data assessment_data.json

Data format: JSON array of sessions, each with:
    - session_id: str
    - conditions: {"C1": {...final_scores}, "C2": {...}, "C3": {...}}
    - groundtruth: {phq9_total, phq9_items_json, ...}
    - turns: list of TurnAssessmentResult dicts
"""

import json
import argparse
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# PHQ-9 severity bands
SEVERITY_BANDS = [
    (4, "none"),
    (9, "mild"),
    (14, "moderate"),
    (19, "mod_severe"),
    (27, "severe"),
]

TARGETED_ITEMS = {3, 4, 7, 8}
ALL_ITEMS = set(range(1, 10))


def load_data(filepath: str) -> list[dict]:
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def score_to_severity(score: int) -> str:
    for threshold, label in SEVERITY_BANDS:
        if score <= threshold:
            return label
    return "severe"


# ========== M1: Weighted Kappa ==========

def _weighted_kappa_4x4(y_true: list[int], y_pred: list[int]) -> float:
    """
    Compute quadratic weighted kappa for ordinal 0-3 scores.
    Standard implementation following Cohen (1968).
    """
    n = len(y_true)
    if n == 0:
        return 0.0

    k = 4  # PHQ-9 items are 0-3
    # Observed confusion matrix
    O = [[0] * k for _ in range(k)]
    for t, p in zip(y_true, y_pred):
        t_c = max(0, min(k - 1, t))
        p_c = max(0, min(k - 1, p))
        O[t_c][p_c] += 1

    # Expected matrix (outer product of marginals)
    row_sums = [sum(O[i]) for i in range(k)]
    col_sums = [sum(O[i][j] for i in range(k)) for j in range(k)]
    E = [[row_sums[i] * col_sums[j] / n for j in range(k)] for i in range(k)]

    # Quadratic weight matrix
    W = [[(i - j) ** 2 / (k - 1) ** 2 for j in range(k)] for i in range(k)]

    num = sum(W[i][j] * O[i][j] for i in range(k) for j in range(k))
    den = sum(W[i][j] * E[i][j] for i in range(k) for j in range(k))

    if den == 0:
        return 1.0 if num == 0 else 0.0
    return 1.0 - num / den


def compute_item_weighted_kappa(sessions: list[dict]) -> dict:
    """
    M1: per-item weighted kappa for each condition vs ground truth.
    Returns {item_id: {C1: kappa, C2: kappa, C3: kappa}}
    """
    # Collect per-item true/pred pairs by condition
    pairs = defaultdict(lambda: defaultdict(lambda: {"true": [], "pred": []}))

    for session in sessions:
        gt_items = session.get("groundtruth", {}).get("phq9_items_json", {})
        if not gt_items:
            continue

        conditions = session.get("conditions", {})
        for cond in ["C1", "C2", "C3"]:
            cond_scores = conditions.get(cond, {})
            if not cond_scores:
                continue
            for item_id_str, gt_score in gt_items.items():
                pred = cond_scores.get(item_id_str, 0)
                pairs[item_id_str][cond]["true"].append(gt_score)
                pairs[item_id_str][cond]["pred"].append(pred)

    result = {}
    for item_id in sorted(pairs.keys()):
        result[item_id] = {}
        for cond in ["C1", "C2", "C3"]:
            data = pairs[item_id][cond]
            if data["true"]:
                result[item_id][cond] = round(
                    _weighted_kappa_4x4(data["true"], data["pred"]), 4
                )
            else:
                result[item_id][cond] = None
    return result


# ========== M2: Item-level MAE ==========

def compute_item_mae(sessions: list[dict]) -> dict:
    """Per-item MAE for C1/C2/C3 vs ground truth."""
    errors = defaultdict(lambda: defaultdict(list))

    for session in sessions:
        gt_items = session.get("groundtruth", {}).get("phq9_items_json", {})
        if not gt_items:
            continue

        conditions = session.get("conditions", {})
        for cond in ["C1", "C2", "C3"]:
            cond_scores = conditions.get(cond, {})
            if not cond_scores:
                continue
            for item_id_str, gt_score in gt_items.items():
                pred = cond_scores.get(item_id_str, 0)
                errors[item_id_str][cond].append(abs(pred - gt_score))

    result = {}
    for item_id in sorted(errors.keys()):
        result[item_id] = {}
        for cond in ["C1", "C2", "C3"]:
            e = errors[item_id][cond]
            result[item_id][cond] = {
                "mae": round(sum(e) / max(len(e), 1), 4),
                "n": len(e),
            }
    return result


# ========== Total Score MAE ==========

def compute_total_score_mae(sessions: list[dict]) -> dict:
    errors = defaultdict(list)
    for session in sessions:
        gt_total = session.get("groundtruth", {}).get("phq9_total")
        if gt_total is None:
            continue
        conditions = session.get("conditions", {})
        for cond in ["C1", "C2", "C3"]:
            cond_scores = conditions.get(cond, {})
            if cond_scores:
                pred_total = sum(cond_scores.values())
                errors[cond].append(abs(pred_total - gt_total))

    return {
        cond: {
            "mae": round(sum(e) / max(len(e), 1), 4),
            "n": len(e),
        }
        for cond, e in errors.items()
    }


# ========== Severity Classification ==========

def compute_severity_metrics(sessions: list[dict]) -> dict:
    """Macro-F1 and balanced accuracy for severity classification."""
    labels = sorted(set(label for _, label in SEVERITY_BANDS))
    results = {}

    for cond in ["C1", "C2", "C3"]:
        y_true, y_pred = [], []
        for session in sessions:
            gt_total = session.get("groundtruth", {}).get("phq9_total")
            if gt_total is None:
                continue
            cond_scores = session.get("conditions", {}).get(cond, {})
            if not cond_scores:
                continue
            pred_total = sum(cond_scores.values())
            y_true.append(score_to_severity(gt_total))
            y_pred.append(score_to_severity(pred_total))

        if not y_true:
            results[cond] = {"macro_f1": 0, "balanced_acc": 0, "n": 0}
            continue

        # Per-class precision, recall, F1
        per_class_f1 = []
        per_class_recall = []
        for label in labels:
            tp = sum(1 for t, p in zip(y_true, y_pred) if t == label and p == label)
            fp = sum(1 for t, p in zip(y_true, y_pred) if t != label and p == label)
            fn = sum(1 for t, p in zip(y_true, y_pred) if t == label and p != label)
            support = tp + fn
            if support == 0:
                continue
            prec = tp / (tp + fp) if (tp + fp) > 0 else 0
            rec = tp / (tp + fn) if (tp + fn) > 0 else 0
            f1 = 2 * prec * rec / (prec + rec) if (prec + rec) > 0 else 0
            per_class_f1.append(f1)
            per_class_recall.append(rec)

        macro_f1 = sum(per_class_f1) / max(len(per_class_f1), 1)
        balanced_acc = sum(per_class_recall) / max(len(per_class_recall), 1)

        results[cond] = {
            "macro_f1": round(macro_f1, 4),
            "balanced_acc": round(balanced_acc, 4),
            "n": len(y_true),
        }

    return results


# ========== Brier Score ==========

def compute_brier_score(sessions: list[dict]) -> dict:
    """
    Brier score for ordinal severity prediction.
    Treats severity as 5-class one-hot and computes mean squared error.
    """
    labels = [label for _, label in SEVERITY_BANDS]
    results = {}

    for cond in ["C1", "C2", "C3"]:
        brier_sum = 0.0
        count = 0
        for session in sessions:
            gt_total = session.get("groundtruth", {}).get("phq9_total")
            if gt_total is None:
                continue
            cond_scores = session.get("conditions", {}).get(cond, {})
            if not cond_scores:
                continue

            pred_total = sum(cond_scores.values())
            gt_sev = score_to_severity(gt_total)
            pred_sev = score_to_severity(pred_total)

            # One-hot Brier: sum of squared differences
            for label in labels:
                gt_val = 1.0 if label == gt_sev else 0.0
                pred_val = 1.0 if label == pred_sev else 0.0
                brier_sum += (pred_val - gt_val) ** 2
            count += 1

        results[cond] = {
            "brier": round(brier_sum / max(count * len(labels), 1), 4),
            "n": count,
        }

    return results


# ========== Targeted vs Non-targeted Item Gain ==========

def compute_targeted_gain(item_mae: dict) -> dict:
    """
    H2: Compare average MAE improvement (C1→C2) for targeted items
    (3,4,7,8) vs non-targeted items.
    """
    targeted_gains = []
    nontargeted_gains = []

    for item_id_str, scores in item_mae.items():
        item_num = int(item_id_str)
        c1_mae = scores.get("C1", {}).get("mae", 0)
        c2_mae = scores.get("C2", {}).get("mae", 0)
        gain = c1_mae - c2_mae  # positive = C2 improved

        if item_num in TARGETED_ITEMS:
            targeted_gains.append(gain)
        else:
            nontargeted_gains.append(gain)

    return {
        "targeted_mean_gain": round(
            sum(targeted_gains) / max(len(targeted_gains), 1), 4
        ),
        "nontargeted_mean_gain": round(
            sum(nontargeted_gains) / max(len(nontargeted_gains), 1), 4
        ),
        "h2_supported": (
            sum(targeted_gains) / max(len(targeted_gains), 1)
            > sum(nontargeted_gains) / max(len(nontargeted_gains), 1)
        ),
    }


# ========== Sensor Quality + Fallback Stats ==========

def compute_deployment_stats(sessions: list[dict]) -> dict:
    """Sensor quality, fallback frequency, modality availability."""
    qualities = []
    fallback_count = 0
    total_turns = 0
    fallback_reasons = defaultdict(int)

    for session in sessions:
        for turn in session.get("turns", []):
            total_turns += 1
            sq = turn.get("sensor_quality", {})
            if sq and sq.get("overall", 0) > 0:
                qualities.append(sq["overall"])

            reasons = turn.get("fallback_reasons_json", [])
            if reasons:
                fallback_count += 1
                for r in reasons:
                    fallback_reasons[r] += 1

    return {
        "sensor_quality": {
            "mean": round(sum(qualities) / max(len(qualities), 1), 3),
            "min": round(min(qualities), 3) if qualities else 0,
            "max": round(max(qualities), 3) if qualities else 0,
            "n": len(qualities),
        },
        "fallback": {
            "rate": round(fallback_count / max(total_turns, 1), 3),
            "count": fallback_count,
            "total_turns": total_turns,
            "reasons": dict(fallback_reasons),
        },
    }


# ========== Main ==========

def main():
    parser = argparse.ArgumentParser(
        description="Evaluate Innovation Point 1: Embedded Multimodal Assessment",
    )
    parser.add_argument(
        "--data", type=str, required=True,
        help="Path to evaluation data JSON file",
    )
    parser.add_argument(
        "--output", type=str, default=None,
        help="Path to save results JSON",
    )
    args = parser.parse_args()

    sessions = load_data(args.data)
    print(f"Loaded {len(sessions)} sessions\n")

    # Run all evaluations
    kappa = compute_item_weighted_kappa(sessions)
    item_mae = compute_item_mae(sessions)
    total_mae = compute_total_score_mae(sessions)
    severity = compute_severity_metrics(sessions)
    brier = compute_brier_score(sessions)
    targeted = compute_targeted_gain(item_mae)
    deployment = compute_deployment_stats(sessions)

    # ===== Print Report =====
    print("=" * 70)
    print("M1: ITEM-LEVEL WEIGHTED KAPPA (vs R1 ground truth)")
    print("=" * 70)
    print(f"{'Item':>6} | {'C1 (text)':>10} | {'C2 (multi)':>10} | {'C3 (ablat)':>10}")
    print("-" * 70)
    for item_id in sorted(kappa.keys()):
        vals = kappa[item_id]
        c1 = f"{vals.get('C1', 0):.4f}" if vals.get("C1") is not None else "   N/A"
        c2 = f"{vals.get('C2', 0):.4f}" if vals.get("C2") is not None else "   N/A"
        c3 = f"{vals.get('C3', 0):.4f}" if vals.get("C3") is not None else "   N/A"
        marker = " *" if int(item_id) in TARGETED_ITEMS else ""
        print(f"PHQ-{item_id:>2} | {c1:>10} | {c2:>10} | {c3:>10}{marker}")
    print("  (* = targeted biosignal items)")

    print(f"\n{'M2: ITEM-LEVEL MAE':=^70}")
    print(f"{'Item':>6} | {'C1 MAE':>8} | {'C2 MAE':>8} | {'C3 MAE':>8} | {'C1→C2 Δ':>8}")
    print("-" * 70)
    for item_id in sorted(item_mae.keys()):
        c1 = item_mae[item_id].get("C1", {}).get("mae", 0)
        c2 = item_mae[item_id].get("C2", {}).get("mae", 0)
        c3 = item_mae[item_id].get("C3", {}).get("mae", 0)
        delta = c1 - c2
        marker = " *" if int(item_id) in TARGETED_ITEMS else ""
        print(f"PHQ-{item_id:>2} | {c1:>8.3f} | {c2:>8.3f} | {c3:>8.3f} | {delta:>+8.3f}{marker}")

    print(f"\n{'TOTAL SCORE MAE':=^70}")
    for cond in ["C1", "C2", "C3"]:
        d = total_mae.get(cond, {})
        print(f"  {cond}: MAE={d.get('mae', 0):.3f} (n={d.get('n', 0)})")

    print(f"\n{'SEVERITY CLASSIFICATION (macro-F1 / balanced acc)':=^70}")
    for cond in ["C1", "C2", "C3"]:
        d = severity.get(cond, {})
        print(f"  {cond}: F1={d.get('macro_f1', 0):.3f}  bal_acc={d.get('balanced_acc', 0):.3f}  (n={d.get('n', 0)})")

    print(f"\n{'BRIER SCORE':=^70}")
    for cond in ["C1", "C2", "C3"]:
        d = brier.get(cond, {})
        print(f"  {cond}: Brier={d.get('brier', 0):.4f} (n={d.get('n', 0)})")

    print(f"\n{'H2: TARGETED vs NON-TARGETED GAIN (C1→C2)':=^70}")
    print(f"  Targeted items (3,4,7,8) mean gain: {targeted['targeted_mean_gain']:+.4f}")
    print(f"  Non-targeted items mean gain:       {targeted['nontargeted_mean_gain']:+.4f}")
    print(f"  H2 supported: {targeted['h2_supported']}")

    print(f"\n{'DEPLOYMENT STATS':=^70}")
    sq = deployment["sensor_quality"]
    fb = deployment["fallback"]
    print(f"  Sensor quality: mean={sq['mean']:.3f} min={sq['min']:.3f} max={sq['max']:.3f} (n={sq['n']})")
    print(f"  Fallback rate: {fb['rate']:.1%} ({fb['count']}/{fb['total_turns']} turns)")
    if fb["reasons"]:
        print(f"  Fallback reasons: {dict(fb['reasons'])}")

    # Save
    if args.output:
        results = {
            "item_weighted_kappa": kappa,
            "item_mae": item_mae,
            "total_score_mae": total_mae,
            "severity_metrics": severity,
            "brier_score": brier,
            "targeted_gain": targeted,
            "deployment_stats": deployment,
        }
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\nResults saved to {args.output}")


if __name__ == "__main__":
    main()
