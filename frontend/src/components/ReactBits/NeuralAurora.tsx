const paths = [
    'M80 260 C220 80 360 360 520 150 S820 210 980 80',
    'M20 420 C220 250 330 500 520 320 S760 210 1040 360',
    'M160 120 C360 190 420 40 620 120 S820 280 1060 180',
];

const nodes = [
    [10, 30],
    [23, 18],
    [34, 42],
    [48, 24],
    [62, 36],
    [77, 18],
    [88, 46],
    [16, 66],
    [35, 72],
    [57, 62],
    [73, 78],
    [92, 70],
];

export default function NeuralAurora() {
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
            <div className="landing-aurora absolute left-1/2 top-[-18rem] h-[44rem] w-[72rem] -translate-x-1/2 rounded-full opacity-80 blur-3xl" />
            <div className="absolute right-[-16rem] top-20 h-[38rem] w-[38rem] rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="absolute left-[-14rem] top-48 h-[34rem] w-[34rem] rounded-full bg-teal-300/20 blur-3xl" />
            <svg className="absolute inset-x-0 top-0 h-[52rem] w-full opacity-60" viewBox="0 0 1100 620" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="neural-line" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor="#0891b2" stopOpacity="0" />
                        <stop offset="42%" stopColor="#22d3ee" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                    </linearGradient>
                    <filter id="neural-glow">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                {paths.map((path, index) => (
                    <path
                        key={path}
                        d={path}
                        fill="none"
                        stroke="url(#neural-line)"
                        strokeWidth={index === 1 ? 1.3 : 1}
                        strokeDasharray="8 18"
                        className="landing-neural-line"
                        style={{ animationDelay: `${index * 0.8}s` }}
                        filter="url(#neural-glow)"
                    />
                ))}
                {nodes.map(([cx, cy], index) => (
                    <circle
                        key={`${cx}-${cy}`}
                        cx={`${cx}%`}
                        cy={`${cy}%`}
                        r={index % 3 === 0 ? 3.2 : 2.2}
                        className="landing-neural-node"
                        style={{ animationDelay: `${index * 0.18}s` }}
                    />
                ))}
            </svg>
        </div>
    );
}
