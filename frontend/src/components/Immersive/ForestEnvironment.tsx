/**
 * ForestEnvironment.tsx
 * 
 * 3D Low-poly Forest Environment with Biofeedback Particles
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cloud, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

interface ForestEnvironmentProps {
    windIntensity: number;
    lightWarmth: number;
    particleSpeed: number;
}

export const ForestEnvironment: React.FC<ForestEnvironmentProps> = ({
    windIntensity,
    lightWarmth,
    particleSpeed
}) => {
    // 光照颜色插值: 蓝色(冷) -> 橙色(暖)
    const lightColor = useMemo(() => {
        const color = new THREE.Color();
        color.lerpColors(new THREE.Color('#4fd1c5'), new THREE.Color('#f6ad55'), lightWarmth);
        return color;
    }, [lightWarmth]);

    // 树木引用
    const groupRef = useRef<THREE.Group>(null);

    // 简单的树生成
    const trees = useMemo(() => {
        return new Array(20).fill(0).map(() => ({
            position: [
                (Math.random() - 0.5) * 40,
                0,
                (Math.random() - 0.5) * 40 - 10
            ] as [number, number, number],
            scale: 0.8 + Math.random() * 0.5,
        }));
    }, []);

    useFrame((state) => {
        if (groupRef.current) {
            // 轻微的树木摇动 (风效)
            groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.02 * windIntensity;
        }
    });

    return (
        <group>
            {/* 环境光照 */}
            <ambientLight intensity={0.4} />
            <pointLight position={[10, 10, 10]} intensity={1.5} color={lightColor} />
            <fog attach="fog" args={[lightColor.getStyle(), 5, 30]} />

            {/* 地面 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#2f4858" />
            </mesh>

            {/* 树林 */}
            <group ref={groupRef}>
                {trees.map((tree, i) => (
                    <group key={i} position={tree.position} scale={tree.scale}>
                        {/* 树干 */}
                        <mesh position={[0, 1, 0]}>
                            <cylinderGeometry args={[0.2, 0.4, 2, 6]} />
                            <meshStandardMaterial color="#5d4037" />
                        </mesh>
                        {/* 树叶 */}
                        <mesh position={[0, 2.5, 0]}>
                            <coneGeometry args={[1.2, 2.5, 6]} />
                            <meshStandardMaterial color={lightWarmth > 0.6 ? "#4ade80" : "#059669"} />
                        </mesh>
                    </group>
                ))}
            </group>

            {/* 呼吸粒子 (Prana) */}
            <Sparkles
                count={100}
                scale={10}
                size={4}
                speed={particleSpeed}
                opacity={0.6}
                color={lightColor}
            />

            {/* 云层 */}
            <Cloud
                opacity={0.5}
                speed={0.2 * windIntensity} // 风速影响云速
                bounds={[10, 2, 10]}
                segments={20}
                position={[0, 5, -10]}
            />
        </group>
    );
};
