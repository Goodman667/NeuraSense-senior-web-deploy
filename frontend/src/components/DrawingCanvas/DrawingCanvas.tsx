/**
 * DrawingCanvas Component
 * 
 * Canvas component for Clock Drawing Test with drawing tools and submission.
 * 用于画钟测验的画布组件
 */

import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

export interface DrawingCanvasProps {
    width?: number;
    height?: number;
    onSubmit?: (imageBase64: string) => void;
    isLoading?: boolean;
}

export interface DrawingCanvasRef {
    clear: () => void;
    getImageBase64: () => string;
    undo: () => void;
}

interface Point {
    x: number;
    y: number;
}

export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
    ({ width = 400, height = 400, onSubmit, isLoading = false }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const [isDrawing, setIsDrawing] = useState(false);
        const [brushSize, setBrushSize] = useState(3);
        const [brushColor, setBrushColor] = useState('#1a1a2e');
        const [history, setHistory] = useState<ImageData[]>([]);
        const lastPointRef = useRef<Point | null>(null);

        // Initialize canvas with white background
        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Set white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);

            // Draw light circle guide
            ctx.strokeStyle = '#e5e5e5';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, Math.min(width, height) / 2 - 20, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Save initial state
            saveHistory();
        }, [width, height]);

        // Save current canvas state to history
        const saveHistory = useCallback(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const imageData = ctx.getImageData(0, 0, width, height);
            setHistory(prev => [...prev.slice(-20), imageData]); // Keep last 20 states
        }, [width, height]);

        // Get coordinates from mouse or touch event
        const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent): Point => {
            const canvas = canvasRef.current;
            if (!canvas) return { x: 0, y: 0 };

            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            if ('touches' in e) {
                const touch = e.touches[0];
                return {
                    x: (touch.clientX - rect.left) * scaleX,
                    y: (touch.clientY - rect.top) * scaleY,
                };
            } else {
                return {
                    x: (e.clientX - rect.left) * scaleX,
                    y: (e.clientY - rect.top) * scaleY,
                };
            }
        }, []);

        // Start drawing
        const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
            e.preventDefault();
            setIsDrawing(true);
            const point = getCoordinates(e);
            lastPointRef.current = point;

            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Draw a dot at starting point
            ctx.beginPath();
            ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = brushColor;
            ctx.fill();
        }, [getCoordinates, brushSize, brushColor]);

        // Draw line
        const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
            if (!isDrawing) return;
            e.preventDefault();

            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const point = getCoordinates(e);

            if (lastPointRef.current) {
                ctx.beginPath();
                ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
                ctx.lineTo(point.x, point.y);
                ctx.strokeStyle = brushColor;
                ctx.lineWidth = brushSize;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();
            }

            lastPointRef.current = point;
        }, [isDrawing, getCoordinates, brushSize, brushColor]);

        // Stop drawing
        const stopDrawing = useCallback(() => {
            if (isDrawing) {
                setIsDrawing(false);
                lastPointRef.current = null;
                saveHistory();
            }
        }, [isDrawing, saveHistory]);

        // Clear canvas
        const clear = useCallback(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);

            // Redraw circle guide
            ctx.strokeStyle = '#e5e5e5';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, Math.min(width, height) / 2 - 20, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            saveHistory();
        }, [width, height, saveHistory]);

        // Undo last action
        const undo = useCallback(() => {
            if (history.length < 2) return;

            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const newHistory = history.slice(0, -1);
            const previousState = newHistory[newHistory.length - 1];

            if (previousState) {
                ctx.putImageData(previousState, 0, 0);
                setHistory(newHistory);
            }
        }, [history]);

        // Get canvas as Base64
        const getImageBase64 = useCallback((): string => {
            const canvas = canvasRef.current;
            if (!canvas) return '';

            return canvas.toDataURL('image/png');
        }, []);

        // Handle submit
        const handleSubmit = useCallback(() => {
            const imageBase64 = getImageBase64();
            onSubmit?.(imageBase64);
        }, [getImageBase64, onSubmit]);

        // Expose methods via ref
        useImperativeHandle(ref, () => ({
            clear,
            getImageBase64,
            undo,
        }), [clear, getImageBase64, undo]);

        return (
            <div className="flex flex-col items-center space-y-4">
                {/* Canvas Container */}
                <div className="relative bg-white rounded-2xl shadow-lg p-4 border border-warm-200">
                    {/* Instructions */}
                    <div className="absolute -top-3 left-4 bg-warm-100 px-3 py-1 rounded-full text-sm text-warm-700 font-medium">
                        请画一个时钟，显示 11:10 时间
                    </div>

                    <canvas
                        ref={canvasRef}
                        width={width}
                        height={height}
                        className="rounded-xl cursor-crosshair touch-none border border-warm-100"
                        style={{ width, height }}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                </div>

                {/* Tools */}
                <div className="flex items-center space-x-4 bg-white/80 backdrop-blur px-4 py-2 rounded-xl shadow">
                    {/* Brush Size */}
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-warm-600">粗细</span>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={brushSize}
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                            className="w-20 accent-primary-500"
                        />
                    </div>

                    {/* Color Selection */}
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-warm-600">颜色</span>
                        <div className="flex space-x-1">
                            {['#1a1a2e', '#3b82f6', '#ef4444'].map((color) => (
                                <button
                                    key={color}
                                    className={`w-6 h-6 rounded-full border-2 transition-transform ${brushColor === color ? 'border-primary-500 scale-110' : 'border-warm-200'
                                        }`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setBrushColor(color)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Undo */}
                    <button
                        onClick={undo}
                        disabled={history.length < 2}
                        className="px-3 py-1.5 text-sm bg-warm-100 text-warm-700 rounded-lg hover:bg-warm-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        撤销
                    </button>

                    {/* Clear */}
                    <button
                        onClick={clear}
                        className="px-3 py-1.5 text-sm bg-warm-100 text-warm-700 rounded-lg hover:bg-warm-200 transition-colors"
                    >
                        清空
                    </button>
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className={`
            px-8 py-3 rounded-xl font-medium text-white
            bg-gradient-to-r from-primary-500 to-accent-500
            hover:from-primary-600 hover:to-accent-600
            disabled:opacity-50 disabled:cursor-not-allowed
            transform hover:scale-105 active:scale-95
            transition-all duration-200 shadow-lg hover:shadow-xl
            ${isLoading ? 'animate-pulse' : ''}
          `}
                >
                    {isLoading ? (
                        <span className="flex items-center space-x-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>评估中...</span>
                        </span>
                    ) : (
                        '提交评估'
                    )}
                </button>
            </div>
        );
    }
);

DrawingCanvas.displayName = 'DrawingCanvas';
