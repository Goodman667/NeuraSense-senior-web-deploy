/**
 * PageSkeleton — 页面级骨架屏
 *
 * 用于 React.lazy 的 Suspense fallback，
 * 以及首屏加载时给用户视觉反馈。
 */

interface SkeletonBlockProps {
    className?: string;
}

function SkeletonBlock({ className = '' }: SkeletonBlockProps) {
    return <div className={`skeleton ${className}`} />;
}

/** 通用页面骨架 */
export function PageSkeleton() {
    return (
        <div className="space-y-4 animate-fadeIn">
            {/* 顶部标题区 */}
            <SkeletonBlock className="h-8 w-48" />
            <SkeletonBlock className="h-4 w-72" />

            {/* 卡片区 */}
            <div className="rounded-2xl overflow-hidden">
                <SkeletonBlock className="h-40 w-full rounded-2xl" />
            </div>

            {/* 列表项 */}
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                        <SkeletonBlock className="w-12 h-12 rounded-xl flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <SkeletonBlock className="h-4 w-3/4" />
                            <SkeletonBlock className="h-3 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** 聊天页骨架 */
export function ChatSkeleton() {
    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-4 animate-fadeIn">
            {/* 聊天头部 */}
            <SkeletonBlock className="h-24 w-full rounded-t-3xl" />

            {/* 气泡 */}
            <div className="space-y-4 px-4">
                <div className="flex justify-start">
                    <SkeletonBlock className="h-16 w-3/4 rounded-2xl" />
                </div>
                <div className="flex justify-end">
                    <SkeletonBlock className="h-12 w-2/3 rounded-2xl" />
                </div>
                <div className="flex justify-start">
                    <SkeletonBlock className="h-20 w-4/5 rounded-2xl" />
                </div>
            </div>

            {/* 输入框 */}
            <SkeletonBlock className="h-16 w-full rounded-b-3xl mt-auto" />
        </div>
    );
}

/** 工具箱骨架 */
export function ToolboxSkeleton() {
    return (
        <div className="space-y-4 animate-fadeIn">
            <SkeletonBlock className="h-8 w-32" />
            {/* 分类标签 */}
            <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                    <SkeletonBlock key={i} className="h-8 w-20 rounded-full" />
                ))}
            </div>
            {/* 工具卡片网格 */}
            <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <SkeletonBlock key={i} className="h-32 rounded-2xl" />
                ))}
            </div>
        </div>
    );
}

/** 课程页骨架 */
export function ProgramsSkeleton() {
    return (
        <div className="space-y-4 animate-fadeIn">
            <SkeletonBlock className="h-8 w-40" />
            <SkeletonBlock className="h-4 w-64" />
            {[1, 2, 3].map((i) => (
                <SkeletonBlock key={i} className="h-36 w-full rounded-2xl" />
            ))}
        </div>
    );
}

/** "我的"页骨架 */
export function MeSkeleton() {
    return (
        <div className="space-y-6 animate-fadeIn">
            {/* 用户卡片 */}
            <SkeletonBlock className="h-48 w-full rounded-2xl" />
            {/* 菜单组 */}
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                        <SkeletonBlock className="w-10 h-10 rounded-xl flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <SkeletonBlock className="h-4 w-1/3" />
                            <SkeletonBlock className="h-3 w-2/3" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
