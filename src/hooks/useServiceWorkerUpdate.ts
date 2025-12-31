/*
hook-meta:
  name: useServiceWorkerUpdate
  description: Hook para gerenciar atualizações do Service Worker e notificar usuários
  tokens: [service-worker, pwa-update, notification]
  responsive: true
  tested-on: [Chrome, Firefox, Safari, Edge]
*/

import { useState, useEffect, useCallback } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

// Tempo para checar atualizações periodicamente (1 hora)
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000

// Chave para armazenar informações de atualização
const UPDATE_DISMISSED_KEY = 'sw-update-dismissed'
const UPDATE_DISMISSED_DURATION = 24 * 60 * 60 * 1000 // 24 horas

export interface UseServiceWorkerUpdateReturn {
    needRefresh: boolean
    updateAvailable: boolean
    offlineReady: boolean
    updateServiceWorker: () => Promise<void>
    dismissUpdate: () => void
    showUpdateAlert: boolean
}

export function useServiceWorkerUpdate(): UseServiceWorkerUpdateReturn {
    const [showUpdateAlert, setShowUpdateAlert] = useState(false)

    // Verifica se o alerta foi dispensado recentemente
    const wasRecentlyDismissed = useCallback(() => {
        if (typeof localStorage === 'undefined') return false
        const dismissedAt = localStorage.getItem(UPDATE_DISMISSED_KEY)
        if (!dismissedAt) return false
        const dismissedTime = parseInt(dismissedAt, 10)
        return Date.now() - dismissedTime < UPDATE_DISMISSED_DURATION
    }, [])

    // Enviar notificação push do navegador
    const sendPushNotification = useCallback(async () => {
        // Verificar se notificações são suportadas
        if (!('Notification' in window)) {
            return
        }

        // Verificar permissão
        if (Notification.permission === 'granted') {
            try {
                // Usar service worker para mostrar notificação
                const registration = await navigator.serviceWorker.ready
                await registration.showNotification('EduGest Angola', {
                    body: 'Uma nova versão está disponível! Clique para atualizar.',
                    icon: '/favicon.png',
                    badge: '/favicon.png',
                    tag: 'system-update',
                    requireInteraction: true,
                })
            } catch (error) {
                console.error('[SW] Erro ao enviar notificação:', error)
            }
        } else if (Notification.permission !== 'denied') {
            // Solicitar permissão
            const permission = await Notification.requestPermission()
            if (permission === 'granted') {
                sendPushNotification()
            }
        }
    }, [])

    const {
        needRefresh: [needRefresh],
        offlineReady: [offlineReady],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(_swUrl: string, registration: ServiceWorkerRegistration | undefined) {
            // Verificar atualizações periodicamente
            if (registration) {
                setInterval(() => {
                    registration.update()
                }, UPDATE_CHECK_INTERVAL)
            }
            console.log('[SW] Service Worker registrado')
        },
        onRegisterError(error: Error) {
            console.error('[SW] Erro no registro:', error)
        },
        onNeedRefresh() {
            console.log('[SW] Nova versão disponível!')
            // Verificar se não foi dispensado recentemente
            if (!wasRecentlyDismissed()) {
                setShowUpdateAlert(true)
                // Tentar enviar notificação push se permitido
                sendPushNotification()
            }
        },
        onOfflineReady() {
            console.log('[SW] App pronto para uso offline')
        },
    })

    // Dispensar alerta temporariamente
    const dismissUpdate = useCallback(() => {
        setShowUpdateAlert(false)
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(UPDATE_DISMISSED_KEY, Date.now().toString())
        }
    }, [])

    // Aplicar atualização
    const handleUpdateServiceWorker = useCallback(async () => {
        setShowUpdateAlert(false)
        await updateServiceWorker(true)
    }, [updateServiceWorker])

    // Mostrar alerta quando needRefresh muda
    useEffect(() => {
        if (needRefresh && !wasRecentlyDismissed()) {
            setShowUpdateAlert(true)
        }
    }, [needRefresh, wasRecentlyDismissed])

    return {
        needRefresh,
        updateAvailable: needRefresh,
        offlineReady,
        updateServiceWorker: handleUpdateServiceWorker,
        dismissUpdate,
        showUpdateAlert,
    }
}
