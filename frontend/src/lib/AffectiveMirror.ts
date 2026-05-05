/**
 * AffectiveMirror - 情感镜像系统
 * 
 * 基于镜像神经元理论，通过Live2D Avatar模仿用户情绪状态，
 * 建立治疗同盟后逐渐引导向积极情绪。
 * 
 * 输入信号:
 * - userFatigue: 来自眼动分析的疲劳指数 (0-100)
 * - voiceJitter: 来自语音分析的抖动指数 (0-100)
 * 
 * 输出参数:
 * - Live2D表情参数 (ParamEyeLOpen, ParamMouthForm, ParamBrowLY等)
 */

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface PhysiologicalInput {
    // 疲劳指数 (0-100, 来自PERCLOS)
    fatigue: number;
    // 语音抖动 (0-100, 来自Jitter分析)
    jitter: number;
    // 眨眼频率 (BPM)
    blinkRate?: number;
    // 是否检测到语音
    isSpeaking?: boolean;
}

export interface Live2DParameters {
    // 左眼张开度 (0=闭眼, 1=睁眼)
    ParamEyeLOpen: number;
    // 右眼张开度
    ParamEyeROpen: number;
    // 嘴型 (-1=皱眉, 0=中性, 1=微笑)
    ParamMouthForm: number;
    // 左眉Y位置 (-1=皱眉, 0=中性, 1=抬眉)
    ParamBrowLY: number;
    // 右眉Y位置
    ParamBrowRY: number;
    // 头部X角度
    ParamAngleX: number;
    // 头部Y角度
    ParamAngleY: number;
    // 头部Z角度
    ParamAngleZ: number;
    // 呼吸参数
    ParamBreath: number;
    // 身体X角度
    ParamBodyAngleX: number;
    // 身体Y角度  
    ParamBodyAngleY: number;
}

export interface AffectiveMirrorConfig {
    // 镜像模式持续时间 (秒)
    mirrorDuration: number;
    // 引导间隔 (秒)
    guidanceInterval: number;
    // 每次引导的插值步长 (0-1)
    guidanceStep: number;
    // 情绪惯性 (0-1, 越大越平滑)
    emotionInertia: number;
}

export interface AffectiveMirrorState {
    // 当前阶段: mirror(镜像) -> guide(引导) -> calm(平静)
    phase: 'mirror' | 'guide' | 'calm';
    // 阶段进度 (0-1)
    phaseProgress: number;
    // 引导进度 (0-1, 从用户情绪到目标情绪)
    guidanceProgress: number;
    // 当前输出参数
    currentParams: Partial<Live2DParameters>;
    // 总时间
    totalTime: number;
}

// =====================================================
// DEFAULT CONFIGURATION
// =====================================================

const DEFAULT_CONFIG: AffectiveMirrorConfig = {
    mirrorDuration: 30,      // 30秒镜像建立同盟
    guidanceInterval: 10,    // 每10秒引导一次
    guidanceStep: 0.05,      // 每次向目标插值5%
    emotionInertia: 0.85,    // 高惯性保证平滑过渡
};

// 目标"平静微笑"状态参数
const CALM_STATE: Partial<Live2DParameters> = {
    ParamEyeLOpen: 0.9,
    ParamEyeROpen: 0.9,
    ParamMouthForm: 0.3,     // 轻微微笑
    ParamBrowLY: 0.1,        // 眉毛略抬
    ParamBrowRY: 0.1,
    ParamAngleX: 0,
    ParamAngleY: 0,
    ParamAngleZ: 0,
    ParamBodyAngleX: 0,
    ParamBodyAngleY: 0,
};

// =====================================================
// AFFECTIVE MIRROR CLASS
// =====================================================

export class AffectiveMirror {
    private config: AffectiveMirrorConfig;
    private state: AffectiveMirrorState;
    private lastGuidanceTime: number = 0;
    private mirroredParams: Partial<Live2DParameters> = {};
    private onStateChange?: (state: AffectiveMirrorState) => void;

    constructor(config: Partial<AffectiveMirrorConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.state = {
            phase: 'mirror',
            phaseProgress: 0,
            guidanceProgress: 0,
            currentParams: { ...CALM_STATE },
            totalTime: 0,
        };
    }

    /**
     * 开始情感镜像干预
     */
    start(onStateChange?: (state: AffectiveMirrorState) => void): void {
        this.onStateChange = onStateChange;
        this.state.phase = 'mirror';
        this.state.totalTime = 0;
        this.state.phaseProgress = 0;
        this.state.guidanceProgress = 0;
        this.lastGuidanceTime = 0;
    }

    /**
     * 每帧更新
     * 
     * @param deltaTime 帧间隔 (秒)
     * @param input 生理信号输入
     * @returns 输出的Live2D参数
     */
    update(deltaTime: number, input: PhysiologicalInput): Partial<Live2DParameters> {
        this.state.totalTime += deltaTime;

        // 阶段转换逻辑
        this.updatePhase();

        // 计算镜像参数 (基于用户生理状态)
        const mirrorParams = this.calculateMirrorParams(input);

        // 根据当前阶段混合参数
        let outputParams: Partial<Live2DParameters>;

        switch (this.state.phase) {
            case 'mirror':
                // 纯镜像模式：完全反映用户状态
                outputParams = mirrorParams;
                this.mirroredParams = { ...mirrorParams };
                break;

            case 'guide':
                // 引导模式：每隔一段时间向目标状态插值
                if (this.state.totalTime - this.lastGuidanceTime >= this.config.guidanceInterval) {
                    this.state.guidanceProgress = Math.min(
                        1,
                        this.state.guidanceProgress + this.config.guidanceStep
                    );
                    this.lastGuidanceTime = this.state.totalTime;
                }
                // 混合镜像状态和目标状态
                outputParams = this.blendParams(
                    this.mirroredParams,
                    CALM_STATE,
                    this.state.guidanceProgress
                );
                break;

            case 'calm':
                // 平静模式：保持目标状态
                outputParams = CALM_STATE;
                break;

            default:
                outputParams = mirrorParams;
        }

        // 应用情绪惯性（平滑过渡）
        this.state.currentParams = this.applyInertia(
            this.state.currentParams,
            outputParams,
            this.config.emotionInertia
        );

        // 触发状态变化回调
        if (this.onStateChange) {
            this.onStateChange({ ...this.state });
        }

        return this.state.currentParams;
    }

    /**
     * 更新阶段
     */
    private updatePhase(): void {
        if (this.state.phase === 'mirror') {
            this.state.phaseProgress = Math.min(
                1,
                this.state.totalTime / this.config.mirrorDuration
            );
            if (this.state.phaseProgress >= 1) {
                this.state.phase = 'guide';
                this.lastGuidanceTime = this.state.totalTime;
            }
        } else if (this.state.phase === 'guide') {
            if (this.state.guidanceProgress >= 1) {
                this.state.phase = 'calm';
            }
        }
    }

    /**
     * 根据生理输入计算镜像参数
     * 
     * 映射规则:
     * - fatigue > 80: 微眯眼 + 头部下垂
     * - jitter > 70: 皱眉 (表达共情)
     * - 低疲劳低抖动: 中性表情
     */
    private calculateMirrorParams(input: PhysiologicalInput): Partial<Live2DParameters> {
        const { fatigue, jitter } = input;

        // 基础参数
        const params: Partial<Live2DParameters> = {
            ParamEyeLOpen: 1.0,
            ParamEyeROpen: 1.0,
            ParamMouthForm: 0,
            ParamBrowLY: 0,
            ParamBrowRY: 0,
            ParamAngleX: 0,
            ParamAngleY: 0,
            ParamAngleZ: 0,
        };

        // 疲劳映射: fatigue > 80 → 微眯眼 + 头部微垂
        if (fatigue > 80) {
            // 眼睛微眯 (0.6-0.8)
            params.ParamEyeLOpen = 0.7;
            params.ParamEyeROpen = 0.7;
            // 头部略微下垂
            params.ParamAngleY = -5;
        } else if (fatigue > 50) {
            // 中度疲劳: 略微眯眼
            params.ParamEyeLOpen = 0.85;
            params.ParamEyeROpen = 0.85;
        }

        // 焦虑映射: jitter > 70 → 皱眉 (共情表达)
        if (jitter > 70) {
            // 眉毛下压 (皱眉表达关切)
            params.ParamBrowLY = -0.4;
            params.ParamBrowRY = -0.4;
            // 嘴角略微下垂
            params.ParamMouthForm = -0.2;
        } else if (jitter > 40) {
            // 中度焦虑: 略微皱眉
            params.ParamBrowLY = -0.2;
            params.ParamBrowRY = -0.2;
        }

        // 如果用户正在说话，保持专注姿态
        if (input.isSpeaking) {
            params.ParamAngleX = 2; // 略微侧头表示倾听
        }

        return params;
    }

    /**
     * 混合两组参数
     */
    private blendParams(
        from: Partial<Live2DParameters>,
        to: Partial<Live2DParameters>,
        t: number
    ): Partial<Live2DParameters> {
        const result: Partial<Live2DParameters> = {};

        const keys = Object.keys(to) as (keyof Live2DParameters)[];
        for (const key of keys) {
            const fromVal = from[key] ?? 0;
            const toVal = to[key] ?? 0;
            result[key] = this.lerp(fromVal, toVal, t);
        }

        return result;
    }

    /**
     * 应用情绪惯性（指数移动平均）
     */
    private applyInertia(
        current: Partial<Live2DParameters>,
        target: Partial<Live2DParameters>,
        inertia: number
    ): Partial<Live2DParameters> {
        return this.blendParams(target, current, inertia);
    }

    /**
     * 线性插值
     */
    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    /**
     * 获取当前状态
     */
    getState(): AffectiveMirrorState {
        return { ...this.state };
    }

    /**
     * 重置
     */
    reset(): void {
        this.state = {
            phase: 'mirror',
            phaseProgress: 0,
            guidanceProgress: 0,
            currentParams: { ...CALM_STATE },
            totalTime: 0,
        };
        this.lastGuidanceTime = 0;
        this.mirroredParams = {};
    }
}

// =====================================================
// EXPORTS
// =====================================================

export { CALM_STATE };
