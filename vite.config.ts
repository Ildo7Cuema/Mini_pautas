import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'prompt',
            injectRegister: 'auto',
            includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png', 'favicon.png'],
            manifest: {
                name: 'EduGest Angola',
                short_name: 'EduGest',
                description: 'Sistema de Gestão Escolar para Professores Angolanos',
                theme_color: '#2563eb',
                background_color: '#ffffff',
                display: 'standalone',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 ano
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    }
                ]
            }
        })
    ],
    server: {
        port: 3000,
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        // Optimize chunk splitting for better caching
        rollupOptions: {
            output: {
                manualChunks: {
                    // Vendor chunks - cached separately from app code
                    'vendor-react': ['react', 'react-dom'],
                    'vendor-supabase': ['@supabase/supabase-js'],
                    'vendor-charts': ['recharts'],
                    'vendor-pdf': ['jspdf', 'jspdf-autotable'],
                    'vendor-utils': ['date-fns', 'zustand', 'papaparse', 'xlsx', 'jszip'],
                }
            }
        },
        // Increase chunk size warning limit (we're intentionally splitting)
        chunkSizeWarningLimit: 500,
    },
})
