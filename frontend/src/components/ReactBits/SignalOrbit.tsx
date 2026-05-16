interface SignalOrbitProps {
    className?: string;
}

const orbitLabels = ['CALM', 'SLEEP', 'MOOD'];

export default function SignalOrbit({ className = '' }: SignalOrbitProps) {
    return (
        <div aria-hidden="true" className={`landing-signal-orbit pointer-events-none ${className}`}>
            <div className="landing-orbit-ring landing-orbit-ring-outer" />
            <div className="landing-orbit-ring landing-orbit-ring-inner" />
            <div className="landing-orbit-core" />
            {orbitLabels.map((label, index) => (
                <span key={label} className={`landing-orbit-chip landing-orbit-chip-${index}`}>
                    {label}
                </span>
            ))}
        </div>
    );
}
