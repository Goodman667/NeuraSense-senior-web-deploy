/**
 * EmbodiedAvatar Component
 * 
 * 具身疗愈核心组件：集成Live2D模型的呼吸夹带与情感镜像系统
 * 
 * 功能：
 * 1. 呼吸夹带：通过正弦波控制胸部起伏，引导用户呼吸同步
 * 2. 情感镜像：根据用户生理数据调整表情，建立治疗同盟
 * 3. 渐进引导：从镜像状态逐步引导至平静微笑状态
 */

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
    BreathingController,
    BreathingState,
    BreathingConfig,
} from '../../lib/BreathingController';
import {
    AffectiveMirror,
    AffectiveMirrorState,
    PhysiologicalInput,
    Live2DParameters,
} from '../../lib/AffectiveMirror';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface EmbodiedAvatarProps {
    // 模型路径
    modelPath?: string;
    // 容器尺寸
    width?: number;
    height?: number;
    // 生理信号输入
    userFatigue?: number;
    voiceJitter?: number;
    blinkRate?: number;
    isSpeaking?: boolean;
    // 呼吸配置
    breathingConfig?: Partial<BreathingConfig>;
    // 是否启用干预模式
    enableEntrainment?: boolean;
    // 回调
    onBreathingUpdate?: (state: BreathingState) => void;
    onAffectiveUpdate?: (state: AffectiveMirrorState) => void;
    onModelLoaded?: () => void;
    // 样式
    className?: string;
}

export interface EmbodiedAvatarRef {
    startEntrainment: () => void;
    stopEntrainment: () => void;
    getBreathingState: () => BreathingState | null;
    getAffectiveState: () => AffectiveMirrorState | null;
    setEmotion: (emotion: 'happy' | 'sad' | 'calm' | 'concerned') => void;
}

// =====================================================
// LIVE2D PARAMETER IDS
// =====================================================

const PARAM_IDS = {
    // 呼吸相关
    BREATH: 'ParamBreath',
    SHOULDER_Y: 'ParamShoulderY',
    CHEST: 'ParamChest',

    // 表情相关
    EYE_L_OPEN: 'ParamEyeLOpen',
    EYE_R_OPEN: 'ParamEyeROpen',
    MOUTH_FORM: 'ParamMouthForm',
    BROW_L_Y: 'ParamBrowLY',
    BROW_R_Y: 'ParamBrowRY',

    // 姿态相关
    ANGLE_X: 'ParamAngleX',
    ANGLE_Y: 'ParamAngleY',
    ANGLE_Z: 'ParamAngleZ',
    BODY_ANGLE_X: 'ParamBodyAngleX',
    BODY_ANGLE_Y: 'ParamBodyAngleY',
};

// =====================================================
// COMPONENT
// =====================================================

export const EmbodiedAvatar = forwardRef<EmbodiedAvatarRef, EmbodiedAvatarProps>(
    (
        {
            // 修正模型路径为实际位置
            modelPath = '/models/kei/kei_basic_free.model3.json',
            width = 400,
            height = 600,
            userFatigue = 0,
            voiceJitter = 0,
            blinkRate = 15,
            isSpeaking = false,
            breathingConfig,
            enableEntrainment = false,
            onBreathingUpdate,
            onAffectiveUpdate,
            onModelLoaded,
            className = '',
        },
        ref
    ) => {
        // Refs
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const appRef = useRef<any>(null);
        const modelRef = useRef<any>(null);
        const breathingControllerRef = useRef<BreathingController | null>(null);
        const affectiveMirrorRef = useRef<AffectiveMirror | null>(null);
        const animationFrameRef = useRef<number | null>(null);
        const lastTimeRef = useRef<number>(0);

        // State
        const [isModelLoaded, setIsModelLoaded] = useState(false);
        const [isEntraining, setIsEntraining] = useState(false);
        const [breathingState, setBreathingState] = useState<BreathingState | null>(null);
        const [affectiveState, setAffectiveState] = useState<AffectiveMirrorState | null>(null);

        // 初始化控制器
        useEffect(() => {
            breathingControllerRef.current = new BreathingController(breathingConfig);
            affectiveMirrorRef.current = new AffectiveMirror();

            return () => {
                breathingControllerRef.current = null;
                affectiveMirrorRef.current = null;
            };
        }, []);

        // 初始化Live2D模型
        useEffect(() => {
            const initLive2D = async () => {
                if (!canvasRef.current) return;

                try {
                    // 动态导入 pixi.js 和 pixi-live2d-display
                    const PIXI = await import('pixi.js');
                    const { Live2DModel } = await import('pixi-live2d-display');

                    // 注册插件
                    Live2DModel.registerTicker(PIXI.Ticker);

                    // 创建 PIXI 应用
                    const app = new PIXI.Application({
                        view: canvasRef.current,
                        width,
                        height,
                        backgroundAlpha: 0,
                        resolution: window.devicePixelRatio || 1,
                        autoDensity: true,
                    });
                    appRef.current = app;

                    // 加载模型
                    const model = await Live2DModel.from(modelPath, {
                        autoInteract: false,
                        autoUpdate: false, // 我们手动控制更新
                    });
                    modelRef.current = model;

                    // 设置模型位置和缩放
                    model.anchor.set(0.5, 0.5);
                    model.x = width / 2;
                    model.y = height / 2;

                    const scale = Math.min(width / model.width, height / model.height) * 0.9;
                    model.scale.set(scale);

                    app.stage.addChild(model);

                    setIsModelLoaded(true);
                    onModelLoaded?.();

                    // 开始渲染循环
                    startRenderLoop();

                } catch (error) {
                    console.error('Failed to initialize Live2D:', error);
                }
            };

            initLive2D();

            return () => {
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
                if (appRef.current) {
                    appRef.current.destroy(true);
                }
            };
        }, [modelPath, width, height]);

        // 渲染循环
        const startRenderLoop = useCallback(() => {
            const loop = (timestamp: number) => {
                const deltaTime = (timestamp - lastTimeRef.current) / 1000;
                lastTimeRef.current = timestamp;

                if (deltaTime > 0 && deltaTime < 1) {
                    updateParameters(deltaTime);
                }

                animationFrameRef.current = requestAnimationFrame(loop);
            };

            lastTimeRef.current = performance.now();
            animationFrameRef.current = requestAnimationFrame(loop);
        }, []);

        // 更新Live2D参数
        const updateParameters = useCallback((deltaTime: number) => {
            const model = modelRef.current;
            if (!model || !model.internalModel) return;

            const coreModel = model.internalModel.coreModel;
            if (!coreModel) return;

            // 1. 更新呼吸控制器
            let breathValue = 0;
            if (breathingControllerRef.current) {
                breathValue = breathingControllerRef.current.update(deltaTime);
                const state = breathingControllerRef.current.getState();
                setBreathingState(state);
                onBreathingUpdate?.(state);
            }

            // 2. 更新情感镜像
            let affectiveParams: Partial<Live2DParameters> = {};
            if (affectiveMirrorRef.current && isEntraining) {
                const input: PhysiologicalInput = {
                    fatigue: userFatigue,
                    jitter: voiceJitter,
                    blinkRate,
                    isSpeaking,
                };
                affectiveParams = affectiveMirrorRef.current.update(deltaTime, input);
                const state = affectiveMirrorRef.current.getState();
                setAffectiveState(state);
                onAffectiveUpdate?.(state);
            }

            // 3. 应用呼吸参数
            setParam(coreModel, PARAM_IDS.BREATH, breathValue);
            // 肩膀和胸部随呼吸起伏
            setParam(coreModel, PARAM_IDS.SHOULDER_Y, (breathValue - 0.5) * 0.3);
            setParam(coreModel, PARAM_IDS.CHEST, breathValue);

            // 4. 应用表情参数
            if (isEntraining && Object.keys(affectiveParams).length > 0) {
                if (affectiveParams.ParamEyeLOpen !== undefined) {
                    setParam(coreModel, PARAM_IDS.EYE_L_OPEN, affectiveParams.ParamEyeLOpen);
                }
                if (affectiveParams.ParamEyeROpen !== undefined) {
                    setParam(coreModel, PARAM_IDS.EYE_R_OPEN, affectiveParams.ParamEyeROpen);
                }
                if (affectiveParams.ParamMouthForm !== undefined) {
                    setParam(coreModel, PARAM_IDS.MOUTH_FORM, affectiveParams.ParamMouthForm);
                }
                if (affectiveParams.ParamBrowLY !== undefined) {
                    setParam(coreModel, PARAM_IDS.BROW_L_Y, affectiveParams.ParamBrowLY);
                }
                if (affectiveParams.ParamBrowRY !== undefined) {
                    setParam(coreModel, PARAM_IDS.BROW_R_Y, affectiveParams.ParamBrowRY);
                }
                if (affectiveParams.ParamAngleY !== undefined) {
                    setParam(coreModel, PARAM_IDS.ANGLE_Y, affectiveParams.ParamAngleY);
                }
            }

            // 5. 更新模型
            model.update(deltaTime);

        }, [userFatigue, voiceJitter, blinkRate, isSpeaking, isEntraining, onBreathingUpdate, onAffectiveUpdate]);

        // 设置参数辅助函数
        const setParam = (coreModel: any, paramId: string, value: number) => {
            try {
                const index = coreModel.getParameterIndex(paramId);
                if (index >= 0) {
                    coreModel.setParameterValueByIndex(index, value);
                }
            } catch {
                // 参数可能不存在于此模型
            }
        };

        // 开始干预
        const startEntrainment = useCallback(() => {
            setIsEntraining(true);
            breathingControllerRef.current?.startEntrainment((state) => {
                setBreathingState(state);
                onBreathingUpdate?.(state);
            });
            affectiveMirrorRef.current?.start((state) => {
                setAffectiveState(state);
                onAffectiveUpdate?.(state);
            });
        }, [onBreathingUpdate, onAffectiveUpdate]);

        // 停止干预
        const stopEntrainment = useCallback(() => {
            setIsEntraining(false);
            breathingControllerRef.current?.stopEntrainment();
            affectiveMirrorRef.current?.reset();
        }, []);

        // 设置表情
        const setEmotion = useCallback((emotion: 'happy' | 'sad' | 'calm' | 'concerned') => {
            const model = modelRef.current;
            if (!model || !model.internalModel) return;

            const coreModel = model.internalModel.coreModel;
            if (!coreModel) return;

            switch (emotion) {
                case 'happy':
                    setParam(coreModel, PARAM_IDS.MOUTH_FORM, 0.8);
                    setParam(coreModel, PARAM_IDS.EYE_L_OPEN, 0.7);
                    setParam(coreModel, PARAM_IDS.EYE_R_OPEN, 0.7);
                    break;
                case 'sad':
                    setParam(coreModel, PARAM_IDS.MOUTH_FORM, -0.5);
                    setParam(coreModel, PARAM_IDS.BROW_L_Y, -0.3);
                    setParam(coreModel, PARAM_IDS.BROW_R_Y, -0.3);
                    break;
                case 'calm':
                    setParam(coreModel, PARAM_IDS.MOUTH_FORM, 0.2);
                    setParam(coreModel, PARAM_IDS.EYE_L_OPEN, 0.85);
                    setParam(coreModel, PARAM_IDS.EYE_R_OPEN, 0.85);
                    break;
                case 'concerned':
                    setParam(coreModel, PARAM_IDS.BROW_L_Y, -0.4);
                    setParam(coreModel, PARAM_IDS.BROW_R_Y, -0.4);
                    setParam(coreModel, PARAM_IDS.MOUTH_FORM, -0.2);
                    break;
            }
        }, []);

        // 自动启动干预（如果配置了enableEntrainment）
        useEffect(() => {
            if (enableEntrainment && isModelLoaded) {
                startEntrainment();
            }
            return () => {
                if (enableEntrainment) {
                    stopEntrainment();
                }
            };
        }, [enableEntrainment, isModelLoaded]);

        // 暴露方法给父组件
        useImperativeHandle(ref, () => ({
            startEntrainment,
            stopEntrainment,
            getBreathingState: () => breathingState,
            getAffectiveState: () => affectiveState,
            setEmotion,
        }), [startEntrainment, stopEntrainment, breathingState, affectiveState, setEmotion]);

        return (
            <div className={`relative ${className}`}>
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    className="block"
                />

                {/* CSS 呼吸动画 - 作为 Live2D 的替代或补充 */}
                {(!isModelLoaded || isEntraining) && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                            className={`rounded-full bg-gradient-to-br from-primary-300 to-accent-300 ${isEntraining ? 'animate-breathe' : ''}`}
                            style={{
                                width: isEntraining ? 120 : 80,
                                height: isEntraining ? 120 : 80,
                                animation: isEntraining ? 'breathe 4s ease-in-out infinite' : 'pulse 2s ease-in-out infinite',
                            }}
                        />
                    </div>
                )}

                {/* 呼吸指示器覆盖层 */}
                {isEntraining && breathingState && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
                        <div className="flex items-center space-x-3">
                            {/* 呼吸动画圆圈 */}
                            <div
                                className="w-8 h-8 rounded-full bg-primary-400 transition-transform duration-200"
                                style={{
                                    transform: `scale(${0.5 + breathingState.breathPhase * 0.5})`,
                                    opacity: 0.7 + breathingState.breathPhase * 0.3,
                                }}
                            />
                            <div className="text-sm">
                                <p className="text-warm-700 font-medium">
                                    {breathingState.isInhaling ? '吸气...' : '呼气...'}
                                </p>
                                <p className="text-warm-500 text-xs">
                                    {breathingState.currentBPM.toFixed(0)} 次/分钟
                                </p>
                            </div>
                            {/* 进度条 */}
                            <div className="w-20 h-1.5 bg-warm-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary-500 transition-all duration-500"
                                    style={{ width: `${breathingState.interventionProgress * 100}%` }}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-warm-500 text-center mt-2">
                            跟随呼吸圆圈，慢慢放松...
                        </p>
                    </div>
                )}

                {/* CSS 动画样式 */}
                <style>{`
                    @keyframes breathe {
                        0%, 100% { transform: scale(0.8); opacity: 0.6; }
                        50% { transform: scale(1.2); opacity: 1; }
                    }
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); opacity: 0.7; }
                        50% { transform: scale(1.05); opacity: 0.9; }
                    }
                `}</style>
            </div>
        );
    }
);

EmbodiedAvatar.displayName = 'EmbodiedAvatar';
