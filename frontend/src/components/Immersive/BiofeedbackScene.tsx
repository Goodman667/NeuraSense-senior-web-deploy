/**
 * BiofeedbackScene.tsx
 * 
 * 主沉浸式场景容器
 * 集成 WebXR 和 R3F
 */

import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { OrbitControls, Html } from '@react-three/drei';
import { ForestEnvironment } from './ForestEnvironment';
import { BreathingGuide3D } from './BreathingGuide3D';
import { useImmersiveBiofeedback } from '../../hooks/useImmersiveBiofeedback';

interface BiofeedbackSceneProps {
    hrv: number;
    onExit: () => void;
}

const store = createXRStore();

export const BiofeedbackScene: React.FC<BiofeedbackSceneProps> = ({
    hrv,
    onExit
}) => {
    // 使用Hook获取反馈参数
    const bioState = useImmersiveBiofeedback(hrv);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // 全屏切换
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // 监听全屏变化
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // 5秒后自动隐藏控制提示
    useEffect(() => {
        const timer = setTimeout(() => setShowControls(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="w-full h-screen fixed top-0 left-0 z-50 bg-black">
            {/* UI Overlay */}
            <div className="absolute top-4 left-4 z-50 flex gap-4">
                <button
                    onClick={onExit}
                    className="px-4 py-2 bg-white/20 backdrop-blur rounded-lg text-white hover:bg-white/30"
                >
                    ← 退出
                </button>
                <div className="px-4 py-2 bg-black/40 backdrop-blur rounded-lg text-white text-sm">
                    HRV: {Math.round(hrv)} ms | 状态: {bioState.stressLevel > 0.6 ? '紧张' : '平静'}
                </div>
                <button
                    onClick={toggleFullscreen}
                    className="px-4 py-2 bg-primary-500 rounded-lg text-white hover:bg-primary-600"
                >
                    {isFullscreen ? '退出全屏' : '全屏模式'}
                </button>
                <button
                    onClick={() => setShowControls(!showControls)}
                    className="px-4 py-2 bg-white/20 backdrop-blur rounded-lg text-white hover:bg-white/30"
                >
                    {showControls ? '隐藏提示' : '显示提示'}
                </button>
            </div>

            {/* 控制提示面板 */}
            {showControls && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 bg-black/60 backdrop-blur-lg rounded-2xl px-8 py-6 text-white">
                    <h3 className="text-lg font-bold mb-4 text-center">🎮 操作指南</h3>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
                        <div className="flex items-center gap-3">
                            <span className="bg-white/20 px-3 py-1 rounded font-mono">鼠标拖拽</span>
                            <span className="text-white/80">旋转视角</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="bg-white/20 px-3 py-1 rounded font-mono">滚轮</span>
                            <span className="text-white/80">缩放场景</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="bg-white/20 px-3 py-1 rounded font-mono">双指捏合</span>
                            <span className="text-white/80">移动端缩放</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="bg-white/20 px-3 py-1 rounded font-mono">ESC</span>
                            <span className="text-white/80">退出全屏</span>
                        </div>
                    </div>
                    <p className="text-center text-white/50 text-xs mt-4">提示将在5秒后自动隐藏</p>
                </div>
            )}

            <Canvas>
                <XR store={store}>
                    <Suspense fallback={<Html center>加载 3D 场景中...</Html>}>
                        <ForestEnvironment
                            windIntensity={bioState.windIntensity}
                            lightWarmth={bioState.lightWarmth}
                            particleSpeed={bioState.particleSpeed}
                        />
                        <BreathingGuide3D
                            phase={bioState.breathingPhase}
                            isInhaling={bioState.isInhaling}
                        />
                        <OrbitControls enableZoom={true} enablePan={false} />
                    </Suspense>
                </XR>
            </Canvas>
        </div>
    );
};
