/**
 * Daily Tasks Panel
 * 
 * Shows today's tasks progress with check marks
 */

import { useGamificationStore } from '../../store/useGamificationStore';

interface DailyTasksPanelProps {
    onTaskClick?: (taskId: string) => void;
}

export const DailyTasksPanel = ({ onTaskClick }: DailyTasksPanelProps) => {
    const { dailyTasks, todayPoints } = useGamificationStore();

    const completedCount = dailyTasks.filter(t => t.completed).length;
    const progress = (completedCount / dailyTasks.length) * 100;

    const handleTaskClick = (taskId: string) => {
        if (onTaskClick) {
            onTaskClick(taskId);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-warm-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <span className="text-2xl">📋</span>
                    <h3 className="text-lg font-bold text-warm-800">今日任务</h3>
                </div>
                <div className="text-sm text-warm-500">
                    {completedCount}/{dailyTasks.length} 已完成
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-warm-100 rounded-full mb-4 overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Tasks List */}
            <div className="space-y-3">
                {dailyTasks.map(task => (
                    <button
                        key={task.id}
                        onClick={() => handleTaskClick(task.id)}
                        disabled={task.completed}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${task.completed
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-warm-50 hover:bg-warm-100 border border-transparent'
                            }`}
                    >
                        <div className="flex items-center space-x-3">
                            <span className="text-xl">{task.icon}</span>
                            <div className="text-left">
                                <div className={`font-medium ${task.completed ? 'text-green-700 line-through' : 'text-warm-800'}`}>
                                    {task.name}
                                </div>
                                <div className="text-xs text-warm-500">{task.description}</div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${task.completed ? 'text-green-600' : 'text-amber-600'}`}>
                                +{task.points}
                            </span>
                            {task.completed ? (
                                <span className="text-green-500 text-lg">✓</span>
                            ) : (
                                <span className="text-warm-300 text-lg">○</span>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {/* Today's Total */}
            <div className="mt-4 pt-4 border-t border-warm-100 flex items-center justify-between">
                <span className="text-warm-600">今日获得积分</span>
                <span className="text-xl font-bold text-amber-600">⭐ {todayPoints}</span>
            </div>
        </div>
    );
};

export default DailyTasksPanel;
