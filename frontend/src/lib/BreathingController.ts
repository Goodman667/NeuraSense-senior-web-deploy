/**
 * BreathingController - 呼吸夹带控制器
 * 
 * 实现呼吸频率同步算法：
 * P(t) = A · sin(2π ∫₀ᵗ f(τ)dτ) + Offset
 * 
 * 通过线性插值将用户呼吸频率从高频(如18BPM)逐渐引导至
 * 副交感神经激活频率(6BPM, 0.1Hz)，实现生理-心理同频共振
 */

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface BreathingConfig {
    // 起始呼吸频率 (BPM)
    startBPM: number;
    // 目标呼吸频率 (BPM)
    targetBPM: number;
    // 过渡时间 (秒)
    transitionDuration: number;
    // 呼吸幅度 (0-1)
    amplitude: number;
    // 呼吸偏移量 (0-1)
    offset: number;
}

export interface BreathingState {
    // 当前呼吸频率 (BPM)
    currentBPM: number;
    // 当前呼吸相位 (0-1, 0=完全呼气, 1=完全吸气)
    breathPhase: number;
    // 是否处于吸气阶段
    isInhaling: boolean;
    // 干预进度 (0-1)
    interventionProgress: number;
    // 累积时间 (秒)
    totalTime: number;
    // 是否正在干预模式
    isEntraining: boolean;
}

// =====================================================
// DEFAULT CONFIGURATION
// =====================================================

const DEFAULT_CONFIG: BreathingConfig = {
    startBPM: 18,           // 焦虑状态典型呼吸频率
    targetBPM: 6,           // 副交感激活最优频率 (0.1Hz)
    transitionDuration: 60, // 60秒完成过渡
    amplitude: 0.5,         // 呼吸动作幅度
    offset: 0.5,            // 中心偏移
};

// =====================================================
// BREATHING CONTROLLER CLASS
// =====================================================

export class BreathingController {
    private config: BreathingConfig;
    private state: BreathingState;
    private phaseAccumulator: number = 0;
    private onStateChange?: (state: BreathingState) => void;

    constructor(config: Partial<BreathingConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.state = {
            currentBPM: this.config.startBPM,
            breathPhase: 0.5,
            isInhaling: true,
            interventionProgress: 0,
            totalTime: 0,
            isEntraining: false,
        };
    }

    /**
     * 开始呼吸夹带干预
     */
    startEntrainment(onStateChange?: (state: BreathingState) => void): void {
        this.onStateChange = onStateChange;
        this.state.isEntraining = true;
        this.state.totalTime = 0;
        this.state.interventionProgress = 0;
        this.state.currentBPM = this.config.startBPM;
        this.phaseAccumulator = 0;
    }

    /**
     * 停止干预
     */
    stopEntrainment(): void {
        this.state.isEntraining = false;
    }

    /**
     * 每帧更新
     * 
     * 核心算法：
     * 1. 线性插值更新当前BPM: currentBPM = lerp(startBPM, targetBPM, t/duration)
     * 2. 计算瞬时频率: f(t) = currentBPM / 60 (Hz)
     * 3. 相位积分: phase += f(t) * deltaTime
     * 4. 生成呼吸值: P(t) = A * sin(2π * phase) + offset
     * 
     * @param deltaTime 帧间隔时间 (秒)
     * @returns 当前呼吸参数值 (0-1)
     */
    update(deltaTime: number): number {
        if (!this.state.isEntraining) {
            // 非干预模式，使用自然呼吸频率
            return this.calculateBreathValue(this.config.startBPM, deltaTime);
        }

        // 更新总时间
        this.state.totalTime += deltaTime;

        // 计算干预进度 (0-1)
        this.state.interventionProgress = Math.min(
            1,
            this.state.totalTime / this.config.transitionDuration
        );

        // 线性插值计算当前BPM
        this.state.currentBPM = this.lerp(
            this.config.startBPM,
            this.config.targetBPM,
            this.state.interventionProgress
        );

        // 计算呼吸值
        const breathValue = this.calculateBreathValue(this.state.currentBPM, deltaTime);

        // 更新呼吸相位状态
        this.state.breathPhase = breathValue;
        this.state.isInhaling = breathValue > 0.5;

        // 触发状态变化回调
        if (this.onStateChange) {
            this.onStateChange({ ...this.state });
        }

        return breathValue;
    }

    /**
     * 计算呼吸参数值
     * 
     * 实现公式: P(t) = A · sin(2π ∫₀ᵗ f(τ)dτ) + Offset
     * 
     * 由于 f(τ) 在小时间间隔内近似恒定，积分简化为：
     * ∫₀ᵗ f(τ)dτ ≈ Σ f(tᵢ) * Δtᵢ (黎曼和)
     */
    private calculateBreathValue(bpm: number, deltaTime: number): number {
        // 转换 BPM 到 Hz
        const frequencyHz = bpm / 60;

        // 相位积分 (累加)
        this.phaseAccumulator += frequencyHz * deltaTime;

        // 保持相位在 [0, 1) 范围内（避免浮点数溢出）
        this.phaseAccumulator = this.phaseAccumulator % 1;

        // 生成正弦波
        // sin 范围 [-1, 1]，需要映射到 [0, 1]
        const sineValue = Math.sin(2 * Math.PI * this.phaseAccumulator);

        // 映射到参数范围
        const breathValue = this.config.amplitude * sineValue + this.config.offset;

        // 确保值在 [0, 1] 范围内
        return Math.max(0, Math.min(1, breathValue));
    }

    /**
     * 线性插值
     */
    private lerp(start: number, end: number, t: number): number {
        return start + (end - start) * t;
    }

    /**
     * 设置自定义起始BPM（根据用户检测值）
     */
    setStartBPM(bpm: number): void {
        this.config.startBPM = Math.max(6, Math.min(30, bpm));
        if (!this.state.isEntraining) {
            this.state.currentBPM = this.config.startBPM;
        }
    }

    /**
     * 获取当前状态
     */
    getState(): BreathingState {
        return { ...this.state };
    }

    /**
     * 获取配置
     */
    getConfig(): BreathingConfig {
        return { ...this.config };
    }

    /**
     * 重置控制器
     */
    reset(): void {
        this.state = {
            currentBPM: this.config.startBPM,
            breathPhase: 0.5,
            isInhaling: true,
            interventionProgress: 0,
            totalTime: 0,
            isEntraining: false,
        };
        this.phaseAccumulator = 0;
    }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let breathingControllerInstance: BreathingController | null = null;

export const getBreathingController = (config?: Partial<BreathingConfig>): BreathingController => {
    if (!breathingControllerInstance) {
        breathingControllerInstance = new BreathingController(config);
    }
    return breathingControllerInstance;
};

export const resetBreathingController = (): void => {
    breathingControllerInstance = null;
};
