import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Custom Rollup plugin to fix MediaPipe exports for production build.
 * MediaPipe packages use CJS exports that don't work well with Vite's ESM bundling.
 */
const mediapipePlugin = () => {
    return {
        name: 'mediapipe-fix',
        transform(code: string, id: string) {
            // Fix @mediapipe/face_mesh exports
            if (id.includes('@mediapipe/face_mesh')) {
                return code.replace(
                    'exports.FaceMesh = void 0;',
                    'exports.FaceMesh = FaceMesh;'
                );
            }
            // Fix @mediapipe/camera_utils exports
            if (id.includes('@mediapipe/camera_utils')) {
                return code.replace(
                    'exports.Camera = void 0;',
                    'exports.Camera = Camera;'
                );
            }
            return code;
        }
    };
};

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        mediapipePlugin(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: [
                'icons/icon.svg',
                'lib/live2dcubismcore.min.js',
            ],
            manifest: {
                name: 'NeuraSense 心理健康平台',
                short_name: 'NeuraSense',
                description: 'AI驱动的智能心理健康评估与支持平台',
                start_url: '/',
                display: 'standalone',
                background_color: '#fdfcfb',
                theme_color: '#a855f7',
                orientation: 'portrait-primary',
                lang: 'zh-CN',
                dir: 'ltr',
                categories: ['health', 'medical', 'lifestyle'],
                icons: [
                    {
                        src: '/icons/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                    {
                        src: '/icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                    {
                        src: '/icons/icon.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                        purpose: 'any',
                    },
                ],
            },
            workbox: {
                // 预缓存：静态资源（JS/CSS/HTML/字体）
                globPatterns: ['**/*.{js,css,html,woff2,woff,ttf}'],
                // 运行时缓存策略
                runtimeCaching: [
                    {
                        // Google Fonts
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gstatic-fonts-cache',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        // 工具箱列表 API — 离线也能看
                        urlPattern: /\/api\/v1\/tools(\?.*)?$/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'tools-api-cache',
                            expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
                            cacheableResponse: { statuses: [0, 200] },
                            networkTimeoutSeconds: 5,
                        },
                    },
                    {
                        // 课程列表 API
                        urlPattern: /\/api\/v1\/programs(\?.*)?$/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'programs-api-cache',
                            expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
                            cacheableResponse: { statuses: [0, 200] },
                            networkTimeoutSeconds: 5,
                        },
                    },
                    {
                        // 其他 API — 网络优先，失败不缓存
                        urlPattern: /\/api\/.*/,
                        handler: 'NetworkOnly',
                    },
                    {
                        // 图片资源
                        urlPattern: /\.(?:png|jpg|jpeg|gif|webp|svg)$/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'images-cache',
                            expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                ],
            },
        }),
    ],
    server: {
        host: '0.0.0.0',
        port: 3000,
        // Proxy configuration to resolve CORS issues with backend
        proxy: {
            '/api': {
                target: 'http://backend:8000',
                changeOrigin: true,
                secure: false,
            },
        },
    },
    preview: {
        host: '0.0.0.0',
        port: 3000,
    },
    // Optimize dependencies for recharts, framer-motion, and mediapipe
    optimizeDeps: {
        include: ['recharts', 'framer-motion', '@mediapipe/face_mesh', '@mediapipe/camera_utils'],
    },
    build: {
        commonjsOptions: {
            include: [/recharts/, /node_modules/, /@mediapipe/],
            transformMixedEsModules: true,
        },
    },
})
