/**
 * Shared pieces of the scale result pages (PHQ-9, GAD-7, SDS, SAS, PSS-10):
 * - ScaleAdviceCard: the AI interpretation, dark text on a white card so it stays readable
 *   on any page background;
 * - DimensionScores: group (factor / subscale) scores and per-item scores as bars;
 * - buildScoreBreakdown: the same numbers in plain form, sent to the PDF report.
 */
import { MarkdownText } from './MarkdownText';

export interface ScaleItemDef {
    /** short name shown next to the bar */
    label: string;
    /** full question text */
    text: string;
    /** reverse-scored item */
    reverse?: boolean;
}

export interface ScaleGroupDef {
    label: string;
    /** zero-based item indexes */
    items: number[];
    note?: string;
}

export interface ScoreRow {
    label: string;
    text?: string;
    score: number;
    min: number;
    max: number;
}

export interface ScoreBreakdown {
    groups: ScoreRow[];
    items: ScoreRow[];
}

/** Item score after reverse scoring, on the scale's own range (e.g. 0–3 or 1–4). */
export function scoredItem(answer: number | null | undefined, item: ScaleItemDef, min: number, max: number) {
    const a = answer ?? min;
    return item.reverse ? min + max - a : a;
}

export function buildScoreBreakdown(
    items: ScaleItemDef[],
    answers: (number | null)[],
    min: number,
    max: number,
    groups: ScaleGroupDef[] = [],
): ScoreBreakdown {
    const scored = items.map((item, i) => scoredItem(answers[i], item, min, max));
    return {
        groups: groups.map((g) => ({
            label: g.label,
            score: g.items.reduce((sum, i) => sum + scored[i], 0),
            min: g.items.length * min,
            max: g.items.length * max,
        })),
        items: items.map((item, i) => ({ label: item.label, text: item.text, score: scored[i], min, max })),
    };
}

const level = (row: ScoreRow) => {
    const f = row.max === row.min ? 0 : (row.score - row.min) / (row.max - row.min);
    if (f < 0.25) return { bar: 'bg-green-400', text: 'text-green-600' };
    if (f < 0.5) return { bar: 'bg-yellow-400', text: 'text-yellow-600' };
    if (f < 0.75) return { bar: 'bg-orange-400', text: 'text-orange-600' };
    return { bar: 'bg-red-500', text: 'text-red-600' };
};

function ScoreBar({ row, showText }: { row: ScoreRow; showText?: boolean }) {
    const c = level(row);
    const pct = row.max === row.min ? 0 : ((row.score - row.min) / (row.max - row.min)) * 100;
    return (
        <div>
            <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-warm-800">{row.label}</span>
                <span className={`shrink-0 text-sm font-bold ${c.text}`}>{row.score}/{row.max}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-warm-100">
                <div className={`h-full rounded-full transition-all duration-500 ${c.bar}`} style={{ width: `${Math.max(pct, row.score > row.min ? 4 : 0)}%` }} />
            </div>
            {showText && row.text ? <p className="mt-1 text-xs leading-5 text-warm-500">{row.text}</p> : null}
        </div>
    );
}

export function DimensionScores({ breakdown, groupNote }: { breakdown: ScoreBreakdown; groupNote?: string }) {
    const { groups, items } = breakdown;
    return (
        <div className="rounded-2xl border border-warm-100 bg-white p-6 shadow-lg">
            <h3 className="mb-4 flex items-center font-bold text-warm-800">
                <span className="mr-2 text-xl">📊</span>
                各维度得分分析
            </h3>
            {groups.length > 0 ? (
                <div className="mb-6 space-y-4">
                    {groups.map((g) => <ScoreBar key={g.label} row={g} />)}
                    {groupNote ? <p className="text-xs leading-5 text-warm-500">{groupNote}</p> : null}
                </div>
            ) : null}
            {groups.length > 0 ? <h4 className="mb-3 text-sm font-semibold text-warm-700">逐题得分</h4> : null}
            <div className={`grid gap-x-8 gap-y-4 ${items.length > 10 ? 'md:grid-cols-2' : ''}`}>
                {items.map((row, i) => <ScoreBar key={i} row={row} showText={items.length > 10 ? false : true} />)}
            </div>
        </div>
    );
}

export function ScaleAdviceCard({ text, title = '小心的建议' }: { text: string; title?: string }) {
    return (
        <div className="rounded-2xl border border-warm-100 bg-white p-6 shadow-lg">
            <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50">
                    <span className="text-xl">💬</span>
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="mb-3 text-lg font-bold text-warm-800">{title}</h3>
                    <MarkdownText text={text} light className="[&_div]:!text-slate-700 [&_span]:!text-slate-700 [&_strong]:!text-slate-900" />
                </div>
            </div>
        </div>
    );
}
