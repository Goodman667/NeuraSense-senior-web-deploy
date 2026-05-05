/**
 * useBioSignalAggregator - 生物信号聚合器
 * 
 * 实现前端节流优化：
 * - 每 5 秒聚合一次生物信号数据
 * - 计算平均值后随消息发送或独立上报
 * - 避免每帧发送造成的网络开销
 */

import { useRef, useState, useCallback, useEffect } from 'react';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface BioSignalSample {
    blinkRate?: number;
    ear?: number;
    fatigue?: number;
    jitter?: number;
    shimmer?: number;
    timestamp: number;
}

export interface AggregatedBioSignals {
    avg_blink_rate: number;
    avg_ear: number;
    fatigue_index: number;
    voice_jitter: number;
    shimmer: number;
    sample_count: number;
    aggregation_period_ms: number;
}

export interface BioSignalAggregatorConfig {
    // 聚合间隔 (毫秒)
    aggregationInterval: number;
    // 最大样本数
    maxSamples: number;
    // 是否自动上报
    autoReport: boolean;
    // 上报回调
    onReport?: (signals: AggregatedBioSignals) => void;
}

// =====================================================
// DEFAULT CONFIGURATION
// =====================================================

const DEFAULT_CONFIG: BioSignalAggregatorConfig = {
    aggregationInterval: 5000, // 5秒
    maxSamples: 300,           // 5秒 @ 60fps
    autoReport: false,
    onReport: undefined,
};

// =====================================================
// HOOK: useBioSignalAggregator
// =====================================================

export const useBioSignalAggregator = (
    config: Partial<BioSignalAggregatorConfig> = {}
) => {
    const cfg: BioSignalAggregatorConfig = { ...DEFAULT_CONFIG, ...config };

    // 样本缓冲区
    const samplesRef = useRef<BioSignalSample[]>([]);
    const lastAggregationRef = useRef<number>(Date.now());
    const aggregationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // 状态
    const [latestAggregation, setLatestAggregation] = useState<AggregatedBioSignals | null>(null);
    const [isCollecting, setIsCollecting] = useState(false);

    /**
     * 添加样本
     */
    const addSample = useCallback((sample: Omit<BioSignalSample, 'timestamp'>) => {
        const fullSample: BioSignalSample = {
            ...sample,
            timestamp: Date.now(),
        };

        samplesRef.current.push(fullSample);

        // 限制最大样本数
        if (samplesRef.current.length > cfg.maxSamples) {
            samplesRef.current.shift();
        }
    }, [cfg.maxSamples]);

    /**
     * 执行聚合
     */
    const aggregate = useCallback((): AggregatedBioSignals => {
        const samples = samplesRef.current;
        const now = Date.now();
        const period = now - lastAggregationRef.current;

        if (samples.length === 0) {
            // Return zeros with sample_count=0 to indicate no data available
            // Consumers MUST check sample_count > 0 before using these values
            return {
                avg_blink_rate: 0,
                avg_ear: 0,
                fatigue_index: 0,
                voice_jitter: 0,
                shimmer: 0,
                sample_count: 0,
                aggregation_period_ms: period,
            };
        }

        // 计算平均值
        let sumBlinkRate = 0, countBlinkRate = 0;
        let sumEar = 0, countEar = 0;
        let sumFatigue = 0, countFatigue = 0;
        let sumJitter = 0, countJitter = 0;
        let sumShimmer = 0, countShimmer = 0;

        for (const s of samples) {
            if (s.blinkRate !== undefined) { sumBlinkRate += s.blinkRate; countBlinkRate++; }
            if (s.ear !== undefined) { sumEar += s.ear; countEar++; }
            if (s.fatigue !== undefined) { sumFatigue += s.fatigue; countFatigue++; }
            if (s.jitter !== undefined) { sumJitter += s.jitter; countJitter++; }
            if (s.shimmer !== undefined) { sumShimmer += s.shimmer; countShimmer++; }
        }

        const result: AggregatedBioSignals = {
            avg_blink_rate: countBlinkRate > 0 ? sumBlinkRate / countBlinkRate : 0,
            avg_ear: countEar > 0 ? sumEar / countEar : 0,
            fatigue_index: countFatigue > 0 ? sumFatigue / countFatigue : 0,
            voice_jitter: countJitter > 0 ? sumJitter / countJitter : 0,
            shimmer: countShimmer > 0 ? sumShimmer / countShimmer : 0,
            sample_count: samples.length,
            aggregation_period_ms: period,
        };

        // 更新状态
        setLatestAggregation(result);
        lastAggregationRef.current = now;

        // 清空缓冲区
        samplesRef.current = [];

        // 触发回调
        if (cfg.onReport) {
            cfg.onReport(result);
        }

        return result;
    }, [cfg]);

    /**
     * 获取当前聚合值（不清空缓冲区）
     */
    const getLatestSignals = useCallback((): AggregatedBioSignals | null => {
        return latestAggregation;
    }, [latestAggregation]);

    /**
     * 获取并清空（用于发送消息时附带）
     */
    const consumeAggregation = useCallback((): AggregatedBioSignals => {
        return aggregate();
    }, [aggregate]);

    /**
     * 开始自动聚合
     */
    const startCollecting = useCallback(() => {
        setIsCollecting(true);
        lastAggregationRef.current = Date.now();

        if (cfg.autoReport) {
            aggregationTimerRef.current = setInterval(() => {
                aggregate();
            }, cfg.aggregationInterval);
        }
    }, [cfg.aggregationInterval, cfg.autoReport, aggregate]);

    /**
     * 停止自动聚合
     */
    const stopCollecting = useCallback(() => {
        setIsCollecting(false);

        if (aggregationTimerRef.current) {
            clearInterval(aggregationTimerRef.current);
            aggregationTimerRef.current = null;
        }
    }, []);

    /**
     * 重置
     */
    const reset = useCallback(() => {
        samplesRef.current = [];
        lastAggregationRef.current = Date.now();
        setLatestAggregation(null);
    }, []);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (aggregationTimerRef.current) {
                clearInterval(aggregationTimerRef.current);
            }
        };
    }, []);

    return {
        // 添加样本
        addSample,

        // 手动聚合
        aggregate,

        // 获取最新聚合值
        getLatestSignals,

        // 消费聚合值（获取并清空）
        consumeAggregation,

        // 控制
        startCollecting,
        stopCollecting,
        reset,

        // 状态
        isCollecting,
        latestAggregation,
        sampleCount: samplesRef.current.length,
    };
};

export default useBioSignalAggregator;
