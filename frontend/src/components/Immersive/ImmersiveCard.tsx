/**
 * ImmersiveCard.tsx
 * 
 * 主页沉浸式体验入口卡片
 * 点击进入 VR/3D 生物反馈场景
 */

import React from 'react';

interface ImmersiveCardProps {
    onEnter: () => void;
    recommended: boolean;
}

export const ImmersiveCard: React.FC<ImmersiveCardProps> = ({
    onEnter,
    recommended
}) => {
    return (
        <div className={`relative overflow-hidden rounded-2xl p-6 border transition-all hover:shadow-xl cursor-pointer
            ${recommended
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-transparent'
                : 'bg-white border-warm-200 hover:border-indigo-300'
            }`}
            onClick={onEnter}
        >
            {/* 背景装饰 */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🌲</span>
                        <h3 className={`font-bold text-lg ${recommended ? 'text-white' : 'text-warm-800'}`}>
                            沉浸式疗愈
                        </h3>
                    </div>

                    <p className={`text-sm mb-4 max-w-[80%] ${recommended ? 'text-indigo-100' : 'text-warm-500'}`}>
                        进入 3D 森林场景，通过生物反馈调节身心平衡。
                    </p>

                    {recommended && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 rounded-lg text-xs font-medium text-white mb-2">
                            ✨ JITAI 推荐
                        </div>
                    )}

                    <button
                        className={`mt-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors
                            ${recommended
                                ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                            }`}
                    >
                        开始体验
                    </button>
                </div>

                {/* 3D 预览图 (静态占位) */}
                <div className="w-20 h-20 rounded-xl bg-indigo-900/20 backdrop-blur-sm flex items-center justify-center border border-white/10">
                    <span className="text-3xl opacity-50">👓</span>
                </div>
            </div>
        </div>
    );
};
