import type { ReactNode } from 'react';

interface GradientTextProps {
    children: ReactNode;
    className?: string;
    colors?: string[];
    animationSpeed?: number;
}

export default function GradientText({
    children,
    className = '',
    colors = ['#0f172a', '#0891b2', '#14b8a6', '#0f172a'],
    animationSpeed = 8,
}: GradientTextProps) {
    const gradient = `linear-gradient(90deg, ${colors.join(', ')})`;

    return (
        <span
            className={`landing-gradient-text inline-block bg-clip-text text-transparent ${className}`}
            style={{
                backgroundImage: gradient,
                backgroundSize: '240% 100%',
                animationDuration: `${animationSpeed}s`,
            }}
        >
            {children}
        </span>
    );
}
