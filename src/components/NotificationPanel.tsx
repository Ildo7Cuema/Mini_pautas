/*
component-meta:
  name: NotificationPanel
  description: Dropdown panel for displaying notifications
  tokens: [--color-primary, --fs-sm, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { useEffect, useRef, useState } from 'react'
import { AppNotification } from '../utils/notificationUtils'
import { NotificationItem } from './NotificationItem'
import { NotificationDetailModal } from './NotificationDetailModal'

interface NotificationPanelProps {
    isOpen: boolean
    onClose: () => void
    notifications: AppNotification[]
    onMarkAsRead: (id: string) => void
    onMarkAllAsRead: () => void
    onDeleteNotification: (id: string) => void
    onClearAllNotifications: () => void
    onNavigate?: (link: string) => void
    loading?: boolean
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
    isOpen,
    onClose,
    notifications,
    onMarkAsRead,
    onMarkAllAsRead,
    onDeleteNotification,
    onClearAllNotifications,
    onNavigate,
    loading = false
}) => {
    const panelRef = useRef<HTMLDivElement>(null)
    const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null)
    const [showClearConfirm, setShowClearConfirm] = useState(false)

    // Close panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose()
            }
        }

        if (isOpen && !selectedNotification) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onClose, selectedNotification])

    // Close on escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (selectedNotification) {
                    setSelectedNotification(null)
                } else {
                    onClose()
                }
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            return () => document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose, selectedNotification])

    const handleNotificationClick = (notification: AppNotification) => {
        // Mark as read
        if (!notification.lida) {
            onMarkAsRead(notification.id)
        }
        // Open detail modal
        setSelectedNotification(notification)
    }

    const handleDeleteNotification = (id: string) => {
        onDeleteNotification(id)
        setSelectedNotification(null)
    }

    const handleClearAll = () => {
        onClearAllNotifications()
        setShowClearConfirm(false)
    }

    const handleNavigateFromModal = (link: string) => {
        setSelectedNotification(null)
        onClose()
        if (onNavigate) {
            onNavigate(link)
        }
    }

    if (!isOpen) return null

    const unreadCount = notifications.filter(n => !n.lida).length

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 z-[100] animate-fade-in"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className="
          fixed right-4 md:right-8 top-20
          w-[calc(100vw-2rem)] md:w-96
          bg-white rounded-2xl shadow-2xl border border-slate-200
          z-[101] animate-slide-down
          max-h-[calc(100vh-6rem)]
          flex flex-col
        "
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">Notificações</h3>
                        {unreadCount > 0 && (
                            <p className="text-xs text-slate-500 mt-0.5">
                                {unreadCount} {unreadCount === 1 ? 'não lida' : 'não lidas'}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={onMarkAllAsRead}
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 hover:bg-primary-50 rounded-lg transition-colors"
                            >
                                Marcar todas
                            </button>
                        )}

                        {notifications.length > 0 && (
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Limpar todas as notificações"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Clear All Confirmation */}
                {showClearConfirm && (
                    <div className="p-4 bg-red-50 border-b border-red-100 animate-slide-down">
                        <p className="text-sm text-red-800 mb-3">
                            Tem certeza que deseja eliminar todas as {notifications.length} notificações?
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleClearAll}
                                className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Sim, eliminar todas
                            </button>
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                className="flex-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                <p className="mt-2 text-sm text-slate-600">Carregando...</p>
                            </div>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </div>
                            <h4 className="text-sm font-medium text-slate-900 mb-1">Nenhuma notificação</h4>
                            <p className="text-xs text-slate-500 text-center">
                                Você está em dia! Não há notificações no momento.
                            </p>
                        </div>
                    ) : (
                        <div>
                            {notifications.map((notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onMarkAsRead={onMarkAsRead}
                                    onClick={handleNotificationClick}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 5 && (
                    <div className="p-3 border-t border-slate-200 flex-shrink-0">
                        <p className="text-center text-xs text-slate-500">
                            Mostrando {notifications.length} notificações
                        </p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            <NotificationDetailModal
                notification={selectedNotification}
                isOpen={!!selectedNotification}
                onClose={() => setSelectedNotification(null)}
                onDelete={handleDeleteNotification}
                onNavigate={handleNavigateFromModal}
            />
        </>
    )
}
