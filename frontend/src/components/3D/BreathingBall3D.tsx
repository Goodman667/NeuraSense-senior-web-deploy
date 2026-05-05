/**
 * BreathingBall3D Component
 * 
 * A 3D particle sphere that breathes (expands/contracts) to guide user breathing.
 * Uses @react-three/fiber for WebGL rendering with smooth animations.
 */

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface BreathingBallProps {
    /** Breathing rate in BPM (breaths per minute) */
    bpm?: number;
    /** Whether the ball is actively breathing */
    isActive?: boolean;
    /** Primary color for the particles */
    color?: string;
    /** Size of the component */
    size?: 'sm' | 'md' | 'lg';
    /** Callback when breath phase changes */
    onPhaseChange?: (phase: 'inhale' | 'hold' | 'exhale' | 'rest') => void;
    /** Show breathing guide text */
    showGuide?: boolean;
    className?: string;
}

interface ParticleSphereProps {
    bpm: number;
    isActive: boolean;
    color: string;
    onPhaseChange?: (phase: 'inhale' | 'hold' | 'exhale' | 'rest') => void;
}

/**
 * Generate random points on a sphere surface
 */
function generateSpherePoints(count: number, radius: number): Float32Array {
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        // Fibonacci sphere distribution for even coverage
        const phi = Math.acos(1 - 2 * (i + 0.5) / count);
        const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);
    }

    return positions;
}

/**
 * ParticleSphere - The animated 3D sphere with breathing effect
 */
const ParticleSphere = ({ bpm, isActive, color, onPhaseChange }: ParticleSphereProps) => {
    const pointsRef = useRef<THREE.Points>(null);
    const materialRef = useRef<THREE.PointsMaterial>(null);

    // Generate initial particle positions
    const particleCount = 2000;
    const baseRadius = 2;

    const basePositions = useMemo(() => {
        return generateSpherePoints(particleCount, baseRadius);
    }, []);

    const positions = useMemo(() => {
        return new Float32Array(basePositions);
    }, [basePositions]);

    // Calculate breathing cycle parameters
    const cycleDuration = (60 / bpm) * 1000; // ms per breath cycle
    const phases = {
        inhale: 0.4,   // 40% of cycle
        hold: 0.1,     // 10% of cycle
        exhale: 0.4,   // 40% of cycle
        rest: 0.1,     // 10% of cycle
    };

    const lastPhaseRef = useRef<string>('rest');

    // Animation loop
    useFrame((state) => {
        if (!pointsRef.current || !materialRef.current) return;

        const time = state.clock.getElapsedTime() * 1000;

        if (isActive) {
            // Calculate current phase in cycle
            const cycleProgress = (time % cycleDuration) / cycleDuration;

            let scaleFactor: number;
            let currentPhase: 'inhale' | 'hold' | 'exhale' | 'rest';

            if (cycleProgress < phases.inhale) {
                // Inhale: expand
                const progress = cycleProgress / phases.inhale;
                scaleFactor = 1 + 0.3 * easeInOutQuad(progress);
                currentPhase = 'inhale';
            } else if (cycleProgress < phases.inhale + phases.hold) {
                // Hold: stay expanded
                scaleFactor = 1.3;
                currentPhase = 'hold';
            } else if (cycleProgress < phases.inhale + phases.hold + phases.exhale) {
                // Exhale: contract
                const progress = (cycleProgress - phases.inhale - phases.hold) / phases.exhale;
                scaleFactor = 1.3 - 0.3 * easeInOutQuad(progress);
                currentPhase = 'exhale';
            } else {
                // Rest: stay at base
                scaleFactor = 1;
                currentPhase = 'rest';
            }

            // Notify phase change
            if (currentPhase !== lastPhaseRef.current) {
                lastPhaseRef.current = currentPhase;
                onPhaseChange?.(currentPhase);
            }

            // Update particle positions
            const geometry = pointsRef.current.geometry;
            const posArray = geometry.attributes.position.array as Float32Array;

            for (let i = 0; i < particleCount; i++) {
                const baseX = basePositions[i * 3];
                const baseY = basePositions[i * 3 + 1];
                const baseZ = basePositions[i * 3 + 2];

                // Add some noise for organic feel
                const noise = Math.sin(time * 0.001 + i * 0.1) * 0.05;

                posArray[i * 3] = baseX * scaleFactor * (1 + noise);
                posArray[i * 3 + 1] = baseY * scaleFactor * (1 + noise);
                posArray[i * 3 + 2] = baseZ * scaleFactor * (1 + noise);
            }

            geometry.attributes.position.needsUpdate = true;

            // Pulsing opacity
            materialRef.current.opacity = 0.6 + 0.2 * Math.sin(time * 0.003);
        }

        // Slow rotation
        pointsRef.current.rotation.y += 0.001;
        pointsRef.current.rotation.x += 0.0005;
    });

    return (
        <Points ref={pointsRef} positions={positions}>
            <PointMaterial
                ref={materialRef}
                transparent
                color={color}
                size={0.05}
                sizeAttenuation={true}
                depthWrite={false}
                opacity={0.7}
            />
        </Points>
    );
};

/**
 * Easing function for smooth animation
 */
function easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * BreathingBall3D - Main component with Canvas and controls
 */
export const BreathingBall3D = ({
    bpm = 6,
    isActive = true,
    color = '#8B5CF6',
    size = 'md',
    onPhaseChange,
    showGuide = true,
    className = '',
}: BreathingBallProps) => {
    const [currentPhase, setCurrentPhase] = useState<'inhale' | 'hold' | 'exhale' | 'rest'>('rest');
    const [internalActive, setInternalActive] = useState(isActive);

    const handlePhaseChange = useCallback((phase: 'inhale' | 'hold' | 'exhale' | 'rest') => {
        setCurrentPhase(phase);
        onPhaseChange?.(phase);
    }, [onPhaseChange]);

    useEffect(() => {
        setInternalActive(isActive);
    }, [isActive]);

    const sizeClasses = {
        sm: 'h-48 w-48',
        md: 'h-64 w-64',
        lg: 'h-80 w-80',
    };

    const phaseLabels = {
        inhale: { text: 'Breathe In', color: 'text-blue-500' },
        hold: { text: 'Hold', color: 'text-purple-500' },
        exhale: { text: 'Breathe Out', color: 'text-green-500' },
        rest: { text: 'Rest', color: 'text-warm-400' },
    };

    return (
        <div className={`flex flex-col items-center ${className}`}>
            {/* 3D Canvas */}
            <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gradient-to-br from-indigo-900 to-purple-900`}>
                <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} />

                    <ParticleSphere
                        bpm={bpm}
                        isActive={internalActive}
                        color={color}
                        onPhaseChange={handlePhaseChange}
                    />

                    <OrbitControls
                        enableZoom={false}
                        enablePan={false}
                        autoRotate={!internalActive}
                        autoRotateSpeed={0.5}
                    />
                </Canvas>
            </div>

            {/* Breathing Guide */}
            {showGuide && (
                <div className="mt-4 text-center">
                    <div className={`text-2xl font-bold ${phaseLabels[currentPhase].color} transition-colors`}>
                        {phaseLabels[currentPhase].text}
                    </div>
                    <div className="text-sm text-warm-500 mt-1">
                        {bpm} breaths per minute
                    </div>
                </div>
            )}

            {/* Control button */}
            <button
                onClick={() => setInternalActive(!internalActive)}
                className={`mt-4 px-6 py-2 rounded-full font-medium transition-all ${internalActive
                        ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                        : 'bg-purple-500 text-white hover:bg-purple-600'
                    }`}
            >
                {internalActive ? 'Pause' : 'Start Breathing'}
            </button>
        </div>
    );
};

BreathingBall3D.displayName = 'BreathingBall3D';
