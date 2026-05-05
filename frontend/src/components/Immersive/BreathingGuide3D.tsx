/**
 * BreathingGuide3D.tsx
 * 
 * 3D 呼吸引导球
 * 随呼吸节奏缩放，引导用户
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface BreathingGuide3DProps {
    phase: number; // 0-1
    isInhaling: boolean;
}

export const BreathingGuide3D: React.FC<BreathingGuide3DProps> = ({
    phase,
    isInhaling
}) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            // 简单的正弦波呼吸
            const scale = 1 + Math.sin(phase * Math.PI * (isInhaling ? 1 : 1)) * 0.5;
            const smoothScale = THREE.MathUtils.lerp(meshRef.current.scale.x, scale, 0.1);

            meshRef.current.scale.set(smoothScale, smoothScale, smoothScale);
            meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
        }
    });

    return (
        <mesh ref={meshRef} position={[0, 1.5, -3]}>
            <sphereGeometry args={[0.5, 64, 64]} />
            <MeshDistortMaterial
                color={isInhaling ? "#60a5fa" : "#a78bfa"}
                attach="material"
                distort={0.4}
                speed={2}
                roughness={0.2}
                metalness={0.8}
            />
        </mesh>
    );
};
