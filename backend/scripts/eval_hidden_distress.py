"""
Evaluation Script — Innovation Point 3
隐性痛苦检测离线评估脚本

Evaluates (thesis §4.10):
    Confirmatory:
        M3: incremental AUC of HDI in low-linguistic-severity subgroup
    Secondary:
        - Spearman correlation (HDI vs PHQ-9, GAD-7, distress VAS)
        - subgroup detection rate
        - risk distribution
        - discordance explanation quality

Usage:
    python scripts/eval_hidden_distress.py --data hidden_distress_data.json

Data format: JSON array of sessions, each with:
    - hdi_events: list of hidden_distress_events records
    - text_risk_score: float (text-only risk proxy for AUC comparison)
    - groundtruth: {phq9_total, gad7_total, distress_vas, ...}
"""

import json
import argparse
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def load_data(filepath: str) -> list[dict]:
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def spearman_rank_correlation(x: list[float], y: list[float]) -> float:
    """Compute Spearman rank correlation coefficient."""
    n = len(x)
    if n < 3:
        return 0.0

    def rank(values):
        sorted_indices = sorted(range(n), key=lambda i: values[i])
        ranks = [0.0] * n
        for rank_val, idx in enumerate(sorted_indices):
            ranks[idx] = rank_val + 1
        return ranks

    rx = rank(x)
    ry = rank(y)

    d_squared_sum = sum((rx[i] - ry[i]) ** 2 for i in range(n))
    rho = 1 - (6 * d_squared_sum) / (n * (n ** 2 - 1))
    return round(rho, 4)


def compute_hdi_correlations(sessions: list[dict]) -> dict:
    """
    Compute Spearman correlation between HDI and ground truth measures.
    """
    hdi_values = []
    phq9_values = []
    gad7_values = []
    distress_values = []

    for session in sessions:
        gt = session.get("groundtruth", {})
        events = session.get("hdi_events", [])
        if not events or not gt:
            continue

        # Use the maximum HDI across the session
        max_hdi = max(e.get("hdi", 0) for e in events)

        phq9 = gt.get("phq9_total")
        gad7 = gt.get("gad7_total")
        distress = gt.get("distress_vas")

        if phq9 is not None:
            hdi_values.append(max_hdi)
            phq9_values.append(phq9)
        if gad7 is not None:
            gad7_values.append(gad7)
        if distress is not None:
            distress_values.append(distress)

    result = {}
    if len(hdi_values) >= 3 and len(phq9_values) >= 3:
        result["hdi_phq9_spearman"] = spearman_rank_correlation(
            hdi_values[:len(phq9_values)], phq9_values,
        )
        result["hdi_phq9_n"] = len(phq9_values)

    if len(hdi_values) >= 3 and len(gad7_values) >= 3:
        result["hdi_gad7_spearman"] = spearman_rank_correlation(
            hdi_values[:len(gad7_values)], gad7_values,
        )
        result["hdi_gad7_n"] = len(gad7_values)

    if len(hdi_values) >= 3 and len(distress_values) >= 3:
        result["hdi_distress_spearman"] = spearman_rank_correlation(
            hdi_values[:len(distress_values)], distress_values,
        )
        result["hdi_distress_n"] = len(distress_values)

    return result


def compute_subgroup_detection(sessions: list[dict]) -> dict:
    """
    Analyze HDI's ability to detect hidden distress in the
    'self-report low but objective distress high' subgroup.

    This is the key analysis for Innovation Point 3.
    """
    # Define "self-report low" as PHQ-9 total <= 9 (none/mild)
    subgroup_sessions = []
    for session in sessions:
        gt = session.get("groundtruth", {})
        phq9 = gt.get("phq9_total", 0)
        if phq9 <= 9:  # self-report low
            subgroup_sessions.append(session)

    if not subgroup_sessions:
        return {"subgroup_size": 0, "message": "No low-self-report sessions found"}

    # Among these, check how many HDI flagged as moderate/high
    flagged = 0
    not_flagged = 0

    for session in subgroup_sessions:
        events = session.get("hdi_events", [])
        if not events:
            not_flagged += 1
            continue

        max_risk = "low"
        for e in events:
            risk = e.get("risk_level", "low")
            if risk == "high":
                max_risk = "high"
                break
            elif risk == "moderate":
                max_risk = "moderate"

        if max_risk in ("moderate", "high"):
            flagged += 1
        else:
            not_flagged += 1

    return {
        "subgroup_size": len(subgroup_sessions),
        "flagged_moderate_or_high": flagged,
        "not_flagged": not_flagged,
        "flag_rate": flagged / max(len(subgroup_sessions), 1),
    }


def _roc_auc(scores: list[float], labels: list[int]) -> float:
    """
    Compute AUC via trapezoidal Wilcoxon-Mann-Whitney statistic.
    labels: 1 = positive (distressed), 0 = negative.
    """
    n = len(scores)
    if n < 2 or len(set(labels)) < 2:
        return 0.5

    # Sort by score descending
    pairs = sorted(zip(scores, labels), key=lambda x: -x[0])

    tp = 0
    fp = 0
    tp_prev = 0
    fp_prev = 0
    auc = 0.0
    pos_count = sum(labels)
    neg_count = n - pos_count
    prev_score = None

    for score, label in pairs:
        if score != prev_score and prev_score is not None:
            # Trapezoidal area
            auc += (fp - fp_prev) * (tp + tp_prev) / 2.0
            tp_prev = tp
            fp_prev = fp
        if label == 1:
            tp += 1
        else:
            fp += 1
        prev_score = score

    auc += (fp - fp_prev) * (tp + tp_prev) / 2.0

    if pos_count == 0 or neg_count == 0:
        return 0.5
    return round(auc / (pos_count * neg_count), 4)


def compute_incremental_auc(sessions: list[dict]) -> dict:
    """
    M3: Compare AUC of HDI vs text-only risk score for identifying
    distressed participants in the low-linguistic-severity subgroup.

    "Distressed" = post-session PHQ-9 >= 10 (moderate+).
    "Low linguistic severity" = text-only assessment total <= 9.
    """
    hdi_scores = []
    text_scores = []
    labels = []

    for session in sessions:
        gt = session.get("groundtruth", {})
        phq9 = gt.get("phq9_total")
        if phq9 is None:
            continue

        events = session.get("hdi_events", [])
        text_risk = session.get("text_risk_score", 0.0)

        # Low linguistic severity: text-based assessment suggests low
        # (use text_risk_score or text-only condition total)
        conditions = session.get("conditions", {})
        c1_total = sum(conditions.get("C1", {}).values()) if conditions.get("C1") else 0
        if c1_total > 9:
            continue  # only analyze low-linguistic-severity subgroup

        max_hdi = max((e.get("hdi", 0) for e in events), default=0)
        label = 1 if phq9 >= 10 else 0  # actually distressed

        hdi_scores.append(max_hdi)
        text_scores.append(text_risk)
        labels.append(label)

    if len(labels) < 5 or len(set(labels)) < 2:
        return {
            "subgroup_n": len(labels),
            "message": "Insufficient data for AUC (need 5+ with both classes)",
        }

    auc_hdi = _roc_auc(hdi_scores, labels)
    auc_text = _roc_auc(text_scores, labels)

    return {
        "subgroup_n": len(labels),
        "positive_n": sum(labels),
        "negative_n": len(labels) - sum(labels),
        "auc_hdi": auc_hdi,
        "auc_text_only": auc_text,
        "auc_difference": round(auc_hdi - auc_text, 4),
        "h3_supported": auc_hdi > auc_text,
    }


def compute_reason_quality(sessions: list[dict]) -> dict:
    """Analyze the distribution and quality of discordance reasons."""
    all_reasons = defaultdict(int)
    all_signals = defaultdict(int)
    events_with_reasons = 0
    total_events = 0

    for session in sessions:
        for event in session.get("hdi_events", []):
            total_events += 1
            reasons = event.get("reasons", [])
            if reasons:
                events_with_reasons += 1
            for r in reasons:
                all_reasons[r[:80]] += 1  # truncate for grouping

            signals = event.get("signals", {})
            for sig_name, sig_val in signals.items():
                if sig_val:
                    all_signals[sig_name] += 1

    return {
        "total_events": total_events,
        "events_with_reasons": events_with_reasons,
        "reason_coverage": events_with_reasons / max(total_events, 1),
        "top_reasons": dict(
            sorted(all_reasons.items(), key=lambda x: -x[1])[:10]
        ),
        "signal_frequency": dict(
            sorted(all_signals.items(), key=lambda x: -x[1])
        ),
    }


def compute_risk_distribution(sessions: list[dict]) -> dict:
    """Distribution of risk levels across all events."""
    distribution = defaultdict(int)
    for session in sessions:
        for event in session.get("hdi_events", []):
            risk = event.get("risk_level", "low")
            distribution[risk] += 1

    total = sum(distribution.values())
    return {
        risk: {"count": count, "pct": count / max(total, 1) * 100}
        for risk, count in sorted(distribution.items())
    }


def main():
    parser = argparse.ArgumentParser(
        description="Evaluate Innovation Point 3: Hidden Distress Detection",
    )
    parser.add_argument(
        "--data", type=str, required=True,
        help="Path to evaluation data JSON file",
    )
    parser.add_argument(
        "--output", type=str, default=None,
        help="Path to save results JSON (optional)",
    )
    args = parser.parse_args()

    sessions = load_data(args.data)
    print(f"Loaded {len(sessions)} sessions\n")

    correlations = compute_hdi_correlations(sessions)
    subgroup = compute_subgroup_detection(sessions)
    auc_result = compute_incremental_auc(sessions)
    reasons = compute_reason_quality(sessions)
    risk_dist = compute_risk_distribution(sessions)

    print("=" * 60)
    print("HDI CORRELATIONS (Spearman)")
    print("=" * 60)
    for key, val in correlations.items():
        print(f"  {key}: {val}")

    print(f"\n{'M3: INCREMENTAL AUC (low-linguistic-severity subgroup)':=^60}")
    for key, val in auc_result.items():
        print(f"  {key}: {val}")

    print(f"\n{'SUBGROUP ANALYSIS':=^60}")
    print("(Self-report low: PHQ-9 <= 9)")
    for key, val in subgroup.items():
        print(f"  {key}: {val}")

    print(f"\n{'RISK DISTRIBUTION':=^60}")
    for risk, info in risk_dist.items():
        print(f"  {risk}: {info['count']} ({info['pct']:.1f}%)")

    print(f"\n{'REASON QUALITY':=^60}")
    print(f"  Coverage: {reasons['reason_coverage']:.1%}")
    print(f"  Total events: {reasons['total_events']}")
    print("  Top signals:")
    for sig, count in reasons.get("signal_frequency", {}).items():
        print(f"    {sig}: {count}")

    if args.output:
        results = {
            "correlations": correlations,
            "incremental_auc": auc_result,
            "subgroup_analysis": subgroup,
            "risk_distribution": risk_dist,
            "reason_quality": reasons,
        }
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\nResults saved to {args.output}")


if __name__ == "__main__":
    main()
