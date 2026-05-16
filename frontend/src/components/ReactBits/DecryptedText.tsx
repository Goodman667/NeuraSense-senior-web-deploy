import { useEffect, useMemo, useState } from 'react';

interface DecryptedTextProps {
    text: string;
    className?: string;
    delay?: number;
    speed?: number;
}

const glyphs = '心眠晴绪息光慢松安澈呼吸云月星0123456789';

export default function DecryptedText({
    text,
    className = '',
    delay = 120,
    speed = 36,
}: DecryptedTextProps) {
    const [visibleCount, setVisibleCount] = useState(0);

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            setVisibleCount(text.length);
            return;
        }

        let timer: number | undefined;
        const start = window.setTimeout(() => {
            timer = window.setInterval(() => {
                setVisibleCount((current) => {
                    if (current >= text.length) {
                        if (timer) window.clearInterval(timer);
                        return text.length;
                    }
                    return current + 1;
                });
            }, speed);
        }, delay);

        return () => {
            window.clearTimeout(start);
            if (timer) window.clearInterval(timer);
        };
    }, [delay, speed, text]);

    const rendered = useMemo(() => {
        return Array.from(text).map((char, index) => {
            if (char.trim() === '') return '\u00A0';
            if (index < visibleCount) return char;
            return glyphs[(index + visibleCount) % glyphs.length];
        }).join('');
    }, [text, visibleCount]);

    return (
        <span className={className} aria-label={text}>
            <span aria-hidden="true">{rendered}</span>
        </span>
    );
}
