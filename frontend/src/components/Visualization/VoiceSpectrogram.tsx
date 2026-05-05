/**
 * VoiceSpectrogram Component
 * 
 * Real-time audio waveform and spectrogram visualization using Canvas.
 * Displays voice frequency patterns that respond to audio input.
 */

import { useRef, useEffect, useCallback } from 'react';

interface VoiceSpectrogramProps {
    audioData?: Float32Array;
    frequencyData?: Uint8Array;
    isActive?: boolean;
    mode?: 'waveform' | 'bars' | 'spectrum';
    primaryColor?: string;
    height?: number;
    className?: string;
}

export const VoiceSpectrogram = ({
    audioData,
    frequencyData,
    isActive = false,
    mode = 'bars',
    primaryColor = '#8B5CF6',
    height = 120,
    className = '',
}: VoiceSpectrogramProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);

    // Draw waveform
    const drawWaveform = useCallback((ctx: CanvasRenderingContext2D, data: Float32Array) => {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const centerY = height / 2;

        ctx.clearRect(0, 0, width, height);

        // Draw center line
        ctx.beginPath();
        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 1;
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Draw waveform
        ctx.beginPath();
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2;

        const sliceWidth = width / data.length;
        let x = 0;

        for (let i = 0; i < data.length; i++) {
            const v = data[i];
            const y = centerY + v * centerY * 0.8;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }

        ctx.stroke();

        // Add glow effect
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }, [primaryColor]);

    // Draw frequency bars
    const drawBars = useCallback((ctx: CanvasRenderingContext2D, data: Uint8Array) => {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        ctx.clearRect(0, 0, width, height);

        // Use only lower frequencies (more relevant for voice)
        const barCount = Math.min(32, data.length);
        const barWidth = (width / barCount) - 2;

        for (let i = 0; i < barCount; i++) {
            const value = data[i];
            const barHeight = (value / 255) * height * 0.9;
            const x = i * (barWidth + 2);
            const y = height - barHeight;

            // Create gradient
            const gradient = ctx.createLinearGradient(x, y, x, height);
            gradient.addColorStop(0, primaryColor);
            gradient.addColorStop(1, `${primaryColor}40`);

            ctx.fillStyle = gradient;

            // Draw rounded bars
            const radius = Math.min(4, barWidth / 2);
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, [radius, radius, 0, 0]);
            ctx.fill();
        }
    }, [primaryColor]);

    // Draw spectrum (mirrored waveform)
    const drawSpectrum = useCallback((ctx: CanvasRenderingContext2D, data: Uint8Array) => {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const centerY = height / 2;

        ctx.clearRect(0, 0, width, height);

        // Draw mirrored spectrum
        const barCount = Math.min(64, data.length);
        const barWidth = width / barCount;

        for (let i = 0; i < barCount; i++) {
            const value = data[i];
            const barHeight = (value / 255) * centerY * 0.8;
            const x = i * barWidth;

            const gradient = ctx.createLinearGradient(x, centerY - barHeight, x, centerY + barHeight);
            gradient.addColorStop(0, primaryColor);
            gradient.addColorStop(0.5, `${primaryColor}80`);
            gradient.addColorStop(1, primaryColor);

            ctx.fillStyle = gradient;
            ctx.fillRect(x, centerY - barHeight, barWidth - 1, barHeight * 2);
        }
    }, [primaryColor]);

    // Animation loop for demo mode
    const animateDemo = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const time = Date.now() / 1000;

        ctx.clearRect(0, 0, width, height);

        if (mode === 'bars') {
            // Generate demo frequency data
            const barCount = 32;
            const barWidth = (width / barCount) - 2;

            for (let i = 0; i < barCount; i++) {
                // Create natural-looking audio pattern
                const freq = i / barCount;
                const amplitude = Math.sin(time * 2 + i * 0.3) * 0.3 + 0.4;
                const breathingEffect = Math.sin(time * 0.5) * 0.2 + 0.8;
                const value = amplitude * breathingEffect * (1 - freq * 0.5);

                const barHeight = value * height * 0.9;
                const x = i * (barWidth + 2);
                const y = height - barHeight;

                const gradient = ctx.createLinearGradient(x, y, x, height);
                gradient.addColorStop(0, primaryColor);
                gradient.addColorStop(1, `${primaryColor}40`);

                ctx.fillStyle = gradient;
                const radius = Math.min(4, barWidth / 2);
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, barHeight, [radius, radius, 0, 0]);
                ctx.fill();
            }
        } else if (mode === 'waveform') {
            const centerY = height / 2;

            ctx.beginPath();
            ctx.strokeStyle = '#E5E7EB';
            ctx.lineWidth = 1;
            ctx.moveTo(0, centerY);
            ctx.lineTo(width, centerY);
            ctx.stroke();

            ctx.beginPath();
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 2;

            for (let x = 0; x < width; x++) {
                const freq = x / width * 10;
                const wave1 = Math.sin(time * 3 + freq) * 0.3;
                const wave2 = Math.sin(time * 5 + freq * 2) * 0.15;
                const envelope = Math.sin(time * 0.8) * 0.3 + 0.5;
                const y = centerY + (wave1 + wave2) * centerY * envelope;

                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        animationRef.current = requestAnimationFrame(animateDemo);
    }, [mode, primaryColor]);

    // Main render effect
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas resolution
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        if (!isActive) {
            // Draw idle state
            ctx.clearRect(0, 0, rect.width, rect.height);
            ctx.fillStyle = '#E5E7EB';
            ctx.fillRect(0, rect.height / 2 - 1, rect.width, 2);
            return;
        }

        // If we have real data, draw it
        if (frequencyData && mode !== 'waveform') {
            if (mode === 'bars') {
                drawBars(ctx, frequencyData);
            } else {
                drawSpectrum(ctx, frequencyData);
            }
        } else if (audioData && mode === 'waveform') {
            drawWaveform(ctx, audioData);
        } else if (isActive) {
            // Demo animation when no real data
            animateDemo();
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [audioData, frequencyData, isActive, mode, drawWaveform, drawBars, drawSpectrum, animateDemo]);

    return (
        <div className={`relative ${className}`}>
            <canvas
                ref={canvasRef}
                className="w-full rounded-lg bg-warm-50"
                style={{ height }}
            />

            {/* Inactive overlay */}
            {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-warm-50/50 rounded-lg">
                    <span className="text-warm-400 text-sm">等待语音输入...</span>
                </div>
            )}
        </div>
    );
};

VoiceSpectrogram.displayName = 'VoiceSpectrogram';
