/**
 * PDF Download Button Component
 * 
 * Reusable component to download assessment results as PDF
 */

import { useState } from 'react';
import { API_BASE } from '../../config/api';

interface PDFDownloadButtonProps {
    scaleType: string;
    totalScore: number;
    answers: number[];
    aiInterpretation?: string;
    userName?: string;
    className?: string;
}

export const PDFDownloadButton = ({
    scaleType,
    totalScore,
    answers,
    aiInterpretation,
    userName,
    className = '',
}: PDFDownloadButtonProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDownload = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/report/pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scale_type: scaleType,
                    total_score: totalScore,
                    answers: answers,
                    ai_interpretation: aiInterpretation,
                    user_name: userName,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'PDF 生成失败');
            }

            const data = await response.json();

            // 将 Base64 转换为 Blob 并下载
            const byteCharacters = atob(data.pdf_base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });

            // 创建下载链接
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = data.filename || `心理评估报告_${scaleType.toUpperCase()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (err) {
            console.error('PDF download failed:', err);
            setError(err instanceof Error ? err.message : 'PDF 下载失败');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleDownload}
                disabled={isLoading}
                className={`flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>生成中...</span>
                    </>
                ) : (
                    <>
                        <span className="text-lg">📄</span>
                        <span>下载 PDF 报告</span>
                    </>
                )}
            </button>

            {error && (
                <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-red-50 text-red-600 text-sm rounded-lg text-center">
                    {error}
                </div>
            )}
        </div>
    );
};

export default PDFDownloadButton;
