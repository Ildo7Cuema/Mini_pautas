/*
component-meta:
  name: NotificationPanel
  description: Dropdown panel for displaying notifications
  tokens: [--color-primary, --fs-sm, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { useEffect, useRef } from 'react'
import { Notification } from '../utils/notificationUtils'
import { NotificationItem } from './NotificationItem'
import { Icons } from './ui/Icons'

interface NotificationPanelProps {
    isOpen: boolean
    onClose: () => void
    notifications: Notification[]
    onMarkAsRead: (id: string) => void
    onMarkAllAsRead: () => void
    onNotificationClick: (notification: Notification) => void
    loading?: boolean
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
    isOpen,
    onClose,
    notifications,
    onMarkAsRead,
    onMarkAllAsRead,
    onNotificationClick,
    loading = false
}) => {
    const panelRef = useRef<HTMLDivElement>(null)

    // Close panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onClose])

    // Close on escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            return () => document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

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

                    {unreadCount > 0 && (
                        <button
                            onClick={onMarkAllAsRead}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium min-h-touch px-2"
                        >
                            Marcar todas como lidas
                        </button>
                    )}
                </div>

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
                                    onClick={onNotificationClick}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer (optional - for "View All" link) */}
                {notifications.length > 5 && (
                    <div className="p-3 border-t border-slate-200 flex-shrink-0">
                        <button
                            onClick={onClose}
                            className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-2 min-h-touch"
                        >
                            Ver todas as notificações
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}
