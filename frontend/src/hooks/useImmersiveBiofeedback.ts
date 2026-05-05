/**
 * useImmersiveBiofeedback.ts
 * 
 * 沉浸式生物反馈逻辑Hook
 * 链接生理信号与环境参数（光照、风速、粒子速度）
 */

import { useState, useEffect, useRef } from 'react';

interface BiofeedbackState {
    stressLevel: number;        // 0-1 (0=Calm, 1=Stressed)
    breathingPhase: number;     // 0-1 (Inhale/Exhale cycle)
    windIntensity: number;      // 0-10
    lightWarmth: number;        // 0-1 (0=Cold/Blue, 1=Warm/Orange)
    particleSpeed: number;      // 0.1-2.0
    isInhaling: boolean;
}

export const useImmersiveBiofeedback = (
    hrv: number,
    respirationRate: number = 12
) => {
    // 状态
    const [state, setState] = useState<BiofeedbackState>({
        stressLevel: 0.5,
        breathingPhase: 0,
        windIntensity: 1,
        lightWarmth: 0.5,
        particleSpeed: 1,
        isInhaling: true,
    });

    // 呼吸动画Timer
    const startTimeRef = useRef(Date.now());

    // 每一帧更新逻辑 (可以在 useFrame 中调用，这里模拟)
    // 实际应用中，环境参数通常平滑过渡

    // 计算压力水平 (基于HRV)
    // HRV越高 -> 压力越低 -> 环境越平静温暖
    // 基线HRV假设为 50ms
    useEffect(() => {
        const normalizedHRV = Math.min(Math.max(hrv / 100, 0), 1);
        const stress = 1 - normalizedHRV;

        setState(prev => ({
            ...prev,
            stressLevel: stress,
            // 压力大 -> 风大 (强风拂过带走烦恼)
            windIntensity: 0.5 + stress * 5,
            // 压力大 -> 冷色调 (冷静), 压力小 -> 暖色调 (舒适)
            lightWarmth: normalizedHRV,
        }));
    }, [hrv]);

    // 呼吸循环模拟 (用于引导动画)
    // 60 / respirationRate = 单次呼吸秒数
    useEffect(() => {
        const cycleDuration = (60 / Math.max(respirationRate, 6)) * 1000;

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - startTimeRef.current;
            const phase = (elapsed % cycleDuration) / cycleDuration;

            // 吸气 0-0.4, 屏息 0.4-0.5, 呼气 0.5-0.9, 屏息 0.9-1.0
            const isInhaling = phase < 0.45;

            setState(prev => ({
                ...prev,
                breathingPhase: phase,
                isInhaling,
                // 吸气时粒子加速聚集，呼气时扩散
                particleSpeed: isInhaling ? 1.5 : 0.8,
            }));
        }, 50); // 20fps for logic update

        return () => clearInterval(interval);
    }, [respirationRate]);

    return state;
};
