/*
hook-meta:
  name: usePWAInstall
  description: Hook para gerenciar instalação PWA em Android e iOS
  tokens: [beforeinstallprompt, localStorage]
  responsive: true
  tested-on: [Chrome Android, Safari iOS, Chrome Desktop]
*/

import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface UsePWAInstallReturn {
    isInstallable: boolean
    isIOS: boolean
    isStandalone: boolean
    showPrompt: boolean
    promptInstall: () => Promise<void>
    dismissPrompt: () => void
}

const PROMPT_DISMISSED_KEY = 'pwa-install-dismissed'
const PROMPT_DISMISSED_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

export function usePWAInstall(): UsePWAInstallReturn {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isInstallable, setIsInstallable] = useState(false)
    const [showPrompt, setShowPrompt] = useState(false)

    // Detect iOS
    const isIOS = typeof navigator !== 'undefined' &&
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as unknown as { MSStream?: unknown }).MSStream

    // Detect if already running as standalone PWA
    const isStandalone = typeof window !== 'undefined' && (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true
    )

    // Check if prompt was recently dismissed
    const wasRecentlyDismissed = useCallback(() => {
        if (typeof localStorage === 'undefined') return false
        const dismissedAt = localStorage.getItem(PROMPT_DISMISSED_KEY)
        if (!dismissedAt) return false
        const dismissedTime = parseInt(dismissedAt, 10)
        return Date.now() - dismissedTime < PROMPT_DISMISSED_DURATION
    }, [])

    useEffect(() => {
        // Don't show if already standalone or recently dismissed
        if (isStandalone || wasRecentlyDismissed()) {
            return
        }

        // Handle beforeinstallprompt event (Chrome/Android)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            setIsInstallable(true)
            setShowPrompt(true)
        }

        // Handle appinstalled event
        const handleAppInstalled = () => {
            setDeferredPrompt(null)
            setIsInstallable(false)
            setShowPrompt(false)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.addEventListener('appinstalled', handleAppInstalled)

        // For iOS, show prompt after a delay if not standalone
        if (isIOS && !isStandalone) {
            const timer = setTimeout(() => {
                setShowPrompt(true)
            }, 2000) // 2 second delay for iOS

            return () => {
                clearTimeout(timer)
                window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
                window.removeEventListener('appinstalled', handleAppInstalled)
            }
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [isIOS, isStandalone, wasRecentlyDismissed])

    const promptInstall = useCallback(async () => {
        if (!deferredPrompt) return

        await deferredPrompt.prompt()
        const choiceResult = await deferredPrompt.userChoice

        if (choiceResult.outcome === 'accepted') {
            setDeferredPrompt(null)
            setIsInstallable(false)
        }
        setShowPrompt(false)
    }, [deferredPrompt])

    const dismissPrompt = useCallback(() => {
        setShowPrompt(false)
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(PROMPT_DISMISSED_KEY, Date.now().toString())
        }
    }, [])

    return {
        isInstallable,
        isIOS,
        isStandalone,
        showPrompt,
        promptInstall,
        dismissPrompt,
    }
}
