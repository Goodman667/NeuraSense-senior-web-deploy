/**
 * ThemeToggle Component
 * 
 * Toggle between light and dark mode with animated icon
 */

import { useState, useEffect } from 'react';

export const ThemeToggle = () => {
    const [isDark, setIsDark] = useState(() => {
        // Check localStorage or system preference
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme');
            if (saved) return saved === 'dark';
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    return (
        <button
            onClick={() => setIsDark(!isDark)}
            className="relative w-14 h-7 bg-warm-200 dark:bg-gray-700 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="切换主题"
        >
            {/* Sun icon */}
            <span className={`absolute left-1 top-1 w-5 h-5 flex items-center justify-center transition-opacity duration-300 ${isDark ? 'opacity-0' : 'opacity-100'}`}>
                ☀️
            </span>
            {/* Moon icon */}
            <span className={`absolute right-1 top-1 w-5 h-5 flex items-center justify-center transition-opacity duration-300 ${isDark ? 'opacity-100' : 'opacity-0'}`}>
                🌙
            </span>
            {/* Toggle ball */}
            <span
                className={`block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isDark ? 'translate-x-7' : 'translate-x-0'}`}
            />
        </button>
    );
};

export default ThemeToggle;
