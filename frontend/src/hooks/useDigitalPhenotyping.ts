/**
 * useDigitalPhenotyping - 数字表型特征工程Hook
 * 
 * 本地计算活动熵、睡眠质量、生理压力指数等特征
 * 融合可穿戴数据、眼动/语音/击键数据、EMA
 */

import { useState, useCallback, useMemo } from 'react';
import type { HealthData } from './useHealthConnect';
import type { AggregatedBioSignals } from './useBioSignalAggregator';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface EMAFeatures {
    moodAvg: number;           // 平均心情 (1-10)
    stressCount: number;       // 压力源数量
    activityLevel: string;     // 活动类型
}

export interface PhenotypingFeatures {
    // 可穿戴被动数据
    hrvMean: number;           // 心率变异性均值
    hrvBaseline: number;       // HRV基线
    sleepDuration: number;     // 睡眠时长 (小时)
    sleepQuality: number;      // 睡眠质量 0-100
    activityEntropy: number;   // 活动熵 (规律性)
    stepCount: number;         // 步数
    restingHR: number;         // 静息心率

    // 主动生物信号
    blinkRate: number;         // 眨眼率
    fatigueIndex: number;      // 疲劳指数
    voiceJitter: number;       // 语音抖动
    keystrokeVariability: number; // 击键变异性

    // EMA数据
    emaMoodAvg: number;        // EMA心情均值
    emaStressCount: number;    // 压力源数量

    // 派生特征
    physiologicalStressIndex: number;  // 生理压力指数
    socialExposureProxy: number;       // 社会暴露代理
    overallWellbeingScore: number;     // 综合健康评分
}

export interface PhenotypingResult {
    features: PhenotypingFeatures;
    timestamp: Date;
    dataQuality: number;       // 数据质量 0-1
}

// =====================================================
// FEATURE ENGINEERING FUNCTIONS
// =====================================================

/**
 * 计算活动熵 - 衡量活动规律性
 * 熵越高表示活动越不规律
 */
const calculateActivityEntropy = (heartRates: number[]): number => {
    if (heartRates.length === 0) return 0.5;

    // 将心率分成bins计算熵
    const bins = 5;
    const min = Math.min(...heartRates);
    const max = Math.max(...heartRates);
    const range = max - min || 1;

    const counts = new Array(bins).fill(0);
    heartRates.forEach(hr => {
        const binIndex = Math.min(Math.floor((hr - min) / range * bins), bins - 1);
        counts[binIndex]++;
    });

    // 计算Shannon熵
    let entropy = 0;
    const total = heartRates.length;
    counts.forEach(count => {
        if (count > 0) {
            const p = count / total;
            entropy -= p * Math.log2(p);
        }
    });

    // 归一化到0-1
    return entropy / Math.log2(bins);
};

/**
 * 计算生理压力指数
 * 基于HRV偏离基线的程度
 */
const calculateStressIndex = (hrv: number, baseline: number = 50): number => {
    if (hrv <= 0) return 0.5;
    // HRV越低，压力越大
    const ratio = hrv / baseline;
    return Math.max(0, Math.min(1, 1 - ratio + 0.5));
};

/**
 * 计算社会暴露代理
 * 基于活动时间和步数推断
 */
const calculateSocialExposure = (steps: number, activeMinutes: number): number => {
    // 简化模型：更多步数和活动时间 = 更多社交机会
    const stepsScore = Math.min(steps / 10000, 1);
    const activeScore = Math.min(activeMinutes / 60, 1);
    return (stepsScore * 0.6 + activeScore * 0.4);
};

/**
 * 计算综合健康评分
 */
const calculateWellbeingScore = (
    sleepQuality: number,
    activityLevel: number,
    stressIndex: number,
    moodAvg: number
): number => {
    // 加权平均
    const sleepScore = sleepQuality / 100;
    const activityScore = activityLevel;
    const stressScore = 1 - stressIndex; // 压力低 = 分数高
    const moodScore = moodAvg / 10;

    return (
        sleepScore * 0.25 +
        activityScore * 0.20 +
        stressScore * 0.25 +
        moodScore * 0.30
    );
};

// =====================================================
// MAIN HOOK
// =====================================================

export const useDigitalPhenotyping = () => {
    const [result, setResult] = useState<PhenotypingResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // 基线值 (可从历史数据学习)
    const baselines = useMemo(() => ({
        hrvBaseline: 50,      // ms
        blinkRateBaseline: 15, // bpm
        sleepBaseline: 7,     // hours
    }), []);

    /**
     * 计算数字表型特征
     */
    const computeFeatures = useCallback((
        healthData: HealthData | null,
        bioSignals: AggregatedBioSignals | null,
        emaFeatures: EMAFeatures | null
    ): PhenotypingResult => {
        setIsProcessing(true);

        // 从可穿戴数据提取特征
        const hrvMean = healthData?.hrv || baselines.hrvBaseline;
        const sleepDuration = (healthData?.sleepMinutes || 420) / 60;
        const sleepQuality = healthData?.sleepQuality || 70;
        const stepCount = healthData?.steps || 5000;
        const restingHR = healthData?.restingHeartRate || 70;
        const activityEntropy = calculateActivityEntropy(healthData?.heartRate || []);

        // 从生物信号提取特征
        const blinkRate = bioSignals?.avg_blink_rate || baselines.blinkRateBaseline;
        const fatigueIndex = bioSignals?.fatigue_index || 0.3;
        const voiceJitter = bioSignals?.voice_jitter || 0.5;
        const keystrokeVariability = 0.5; // 未来从击键数据获取

        // EMA特征
        const emaMoodAvg = emaFeatures?.moodAvg || 6;
        const emaStressCount = emaFeatures?.stressCount || 1;

        // 计算派生特征
        const physiologicalStressIndex = calculateStressIndex(hrvMean, baselines.hrvBaseline);
        const socialExposureProxy = calculateSocialExposure(stepCount, healthData?.activeMinutes || 30);
        const overallWellbeingScore = calculateWellbeingScore(
            sleepQuality,
            socialExposureProxy,
            physiologicalStressIndex,
            emaMoodAvg
        );

        // 计算数据质量
        const dataQuality = [
            healthData !== null ? 0.4 : 0,
            bioSignals !== null ? 0.3 : 0,
            emaFeatures !== null ? 0.3 : 0,
        ].reduce((a, b) => a + b, 0);

        const features: PhenotypingFeatures = {
            hrvMean,
            hrvBaseline: baselines.hrvBaseline,
            sleepDuration,
            sleepQuality,
            activityEntropy,
            stepCount,
            restingHR,
            blinkRate,
            fatigueIndex,
            voiceJitter,
            keystrokeVariability,
            emaMoodAvg,
            emaStressCount,
            physiologicalStressIndex,
            socialExposureProxy,
            overallWellbeingScore,
        };

        const resultData: PhenotypingResult = {
            features,
            timestamp: new Date(),
            dataQuality,
        };

        setResult(resultData);
        setIsProcessing(false);

        return resultData;
    }, [baselines]);

    /**
     * 获取用于雷达图的五维数据
     */
    const getRadarData = useCallback(() => {
        if (!result) return null;

        const { features } = result;

        return {
            dimensions: [
                { name: '心率变异性', value: Math.min(features.hrvMean / 100, 1), color: '#10B981' },
                { name: '睡眠质量', value: features.sleepQuality / 100, color: '#6366F1' },
                { name: '活动水平', value: features.socialExposureProxy, color: '#F59E0B' },
                { name: '压力水平', value: 1 - features.physiologicalStressIndex, color: '#EF4444' },
                { name: '情绪状态', value: features.emaMoodAvg / 10, color: '#8B5CF6' },
            ],
            overallScore: features.overallWellbeingScore,
        };
    }, [result]);

    return {
        result,
        isProcessing,
        computeFeatures,
        getRadarData,
    };
};

export default useDigitalPhenotyping;
