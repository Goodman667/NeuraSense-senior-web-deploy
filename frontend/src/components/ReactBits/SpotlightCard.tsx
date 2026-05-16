import type { CSSProperties, ReactNode } from 'react';
import { useRef, useState } from 'react';

interface SpotlightCardProps {
    children: ReactNode;
    className?: string;
    spotlightColor?: string;
    radius?: number;
}

export default function SpotlightCard({
    children,
    className = '',
    spotlightColor = 'rgba(20, 184, 166, 0.18)',
    radius = 420,
}: SpotlightCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [visible, setVisible] = useState(false);

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (!rect) return;

        setPosition({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        });
    };

    const spotlightStyle: CSSProperties = {
        opacity: visible ? 1 : 0,
        background: `radial-gradient(${radius}px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 42%)`,
    };

    return (
        <div
            ref={cardRef}
            onPointerMove={handlePointerMove}
            onPointerEnter={() => setVisible(true)}
            onPointerLeave={() => setVisible(false)}
            className={`relative overflow-hidden ${className}`}
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500"
                style={spotlightStyle}
            />
            <div className="relative z-10">{children}</div>
        </div>
    );
}
