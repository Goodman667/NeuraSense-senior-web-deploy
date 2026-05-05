/**
 * MarkdownText — lightweight Markdown-to-JSX renderer
 *
 * Handles: newlines, **bold**, bullet lists (- / * / •),
 * numbered lists (1. ), ### headings, and preserves emoji.
 * No external dependencies.
 */

import { type ReactNode } from 'react';

/** Parse inline **bold** markers into <strong> elements. */
function parseInline(text: string): ReactNode[] {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return (
                <strong key={i} className="font-semibold">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        return part;
    });
}

interface MarkdownTextProps {
    text: string;
    /** Extra Tailwind classes for the container */
    className?: string;
    /** If true, use dark-on-light text colors (for light backgrounds) */
    light?: boolean;
}

export function MarkdownText({ text, className = '', light = false }: MarkdownTextProps) {
    if (!text) return null;

    const lines = text.split('\n');
    const textClass = light ? 'text-warm-700' : 'text-white/95';
    const headingClass = light ? 'text-warm-800' : 'text-white';
    const bulletColor = light ? 'bg-primary-400' : 'bg-white/70';
    const numColor = light ? 'text-primary-600' : 'text-white/80';

    const elements: ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trimStart();

        // Empty line → spacer
        if (!trimmed) {
            elements.push(<div key={i} className="h-1.5" />);
            i++;
            continue;
        }

        // ### Heading
        if (trimmed.startsWith('### ')) {
            elements.push(
                <div key={i} className={`font-bold text-sm mt-2 mb-1 ${headingClass}`}>
                    {parseInline(trimmed.slice(4))}
                </div>,
            );
            i++;
            continue;
        }
        if (trimmed.startsWith('## ')) {
            elements.push(
                <div key={i} className={`font-bold text-base mt-3 mb-1 ${headingClass}`}>
                    {parseInline(trimmed.slice(3))}
                </div>,
            );
            i++;
            continue;
        }

        // Bullet list: - / * / •
        if (/^[-*•]\s/.test(trimmed)) {
            elements.push(
                <div key={i} className="flex items-start gap-2 pl-1 py-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${bulletColor} mt-1.5 flex-shrink-0`} />
                    <span className={`text-sm leading-relaxed ${textClass}`}>
                        {parseInline(trimmed.replace(/^[-*•]\s+/, ''))}
                    </span>
                </div>,
            );
            i++;
            continue;
        }

        // Numbered list: 1. / 2. / etc.
        const numMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
        if (numMatch) {
            elements.push(
                <div key={i} className="flex items-start gap-2 pl-1 py-0.5">
                    <span className={`text-xs font-bold ${numColor} mt-0.5 min-w-[1.2rem] flex-shrink-0`}>
                        {numMatch[1]}.
                    </span>
                    <span className={`text-sm leading-relaxed ${textClass}`}>
                        {parseInline(numMatch[2])}
                    </span>
                </div>,
            );
            i++;
            continue;
        }

        // Regular paragraph
        elements.push(
            <div key={i} className={`text-sm leading-relaxed py-0.5 ${textClass}`}>
                {parseInline(trimmed)}
            </div>,
        );
        i++;
    }

    return <div className={`space-y-0 ${className}`}>{elements}</div>;
}

export default MarkdownText;
