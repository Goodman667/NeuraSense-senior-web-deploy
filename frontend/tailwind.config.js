/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                neutral: {
                    0: '#ffffff',
                    25: '#fcfcfd',
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617',
                },
                // Warm color palette for a friendly, non-clinical feel
                primary: {
                    50: '#faf5ff',
                    100: '#f3e8ff',
                    200: '#e9d5ff',
                    300: '#d8b4fe',
                    400: '#c084fc',
                    500: '#a855f7',
                    600: '#9333ea',
                    700: '#7c3aed',
                    800: '#6b21a8',
                    900: '#581c87',
                },
                // Warm accent colors (peachy/coral)
                accent: {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    200: '#fed7aa',
                    300: '#fdba74',
                    400: '#fb923c',
                    500: '#f97316',
                    600: '#ea580c',
                    700: '#c2410c',
                    800: '#9a3412',
                    900: '#7c2d12',
                },
                // Warm neutrals (beige tones)
                warm: {
                    50: '#fdfcfb',
                    100: '#faf7f5',
                    200: '#f5ebe4',
                    300: '#efe0d5',
                    400: '#dbc4b0',
                    500: '#c4a78c',
                    600: '#a68b6e',
                    700: '#8a7259',
                    800: '#6e5a47',
                    900: '#574839',
                },
                // Soft pink for gentle accents
                rose: {
                    50: '#fff1f2',
                    100: '#ffe4e6',
                    200: '#fecdd3',
                    300: '#fda4af',
                    400: '#fb7185',
                    500: '#f43f5e',
                    600: '#e11d48',
                    700: '#be123c',
                    800: '#9f1239',
                    900: '#881337',
                },
                // Calming sage green
                calm: {
                    50: '#f6f7f4',
                    100: '#e8ebe2',
                    200: '#d4dac6',
                    300: '#b7c2a0',
                    400: '#98a87a',
                    500: '#7a8e5e',
                    600: '#5f7148',
                    700: '#4a583a',
                    800: '#3d4831',
                    900: '#343d2b',
                },
            },
            fontFamily: {
                sans: ['Raleway', 'PingFang SC', 'Microsoft YaHei', 'Segoe UI Variable', 'system-ui', '-apple-system', 'sans-serif'],
                display: ['Lora', 'Georgia', 'Times New Roman', 'serif'],
            },
            animation: {
                'fadeIn': 'fadeIn 0.2s ease-out',
                'slideUp': 'slideUp 0.3s ease-out',
                'slideDown': 'slideDown 0.3s ease-out',
                'pulse-slow': 'pulse 3s ease-in-out infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                slideDown: {
                    '0%': { opacity: '0', transform: 'translateY(-20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
            },
            backgroundImage: {
                'gradient-warm': 'linear-gradient(135deg, #faf7f5 0%, #fff1f2 50%, #f3e8ff 100%)',
                'gradient-soft': 'linear-gradient(180deg, #fdfcfb 0%, #faf7f5 100%)',
                'gradient-shell': 'radial-gradient(circle at top left, rgba(34, 211, 238, 0.14), transparent 30%), radial-gradient(circle at top right, rgba(5, 150, 105, 0.12), transparent 28%), linear-gradient(180deg, #f8fbfd 0%, #eef5f7 52%, #f8fafc 100%)',
            },
            boxShadow: {
                'soft-xl': '0 30px 90px -45px rgba(15, 23, 42, 0.35)',
                'soft-2xl': '0 40px 120px -55px rgba(15, 23, 42, 0.45)',
            },
        },
    },
    plugins: [],
}
