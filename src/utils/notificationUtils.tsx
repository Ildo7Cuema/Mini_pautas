// Notification types and utilities

export type NotificationType = 'aluno_novo' | 'nota_lancada' | 'relatorio_gerado' | 'sistema' | 'escola_nova'

export interface Notification {
    id: string
    user_id: string
    escola_id: string
    tipo: NotificationType
    titulo: string
    mensagem?: string
    link?: string
    lida: boolean
    created_at: string
    updated_at: string
}

export interface NotificationIconConfig {
    icon: React.ReactNode
    color: string
    bgColor: string
}

/**
 * Get relative time string from a date
 * Examples: "há 5 minutos", "há 2 horas", "ontem", "há 3 dias"
 */
export function getRelativeTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) {
        return 'agora mesmo'
    } else if (diffMinutes < 60) {
        return `há ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`
    } else if (diffHours < 24) {
        return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
    } else if (diffDays === 1) {
        return 'ontem'
    } else if (diffDays < 7) {
        return `há ${diffDays} dias`
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7)
        return `há ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
    } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30)
        return `há ${months} ${months === 1 ? 'mês' : 'meses'}`
    } else {
        const years = Math.floor(diffDays / 365)
        return `há ${years} ${years === 1 ? 'ano' : 'anos'}`
    }
}

/**
 * Get icon configuration for notification type
 */
export function getNotificationIcon(tipo: NotificationType): NotificationIconConfig {
    switch (tipo) {
        case 'aluno_novo':
            return {
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                ),
                color: 'text-blue-600',
                bgColor: 'bg-blue-100'
            }
        case 'nota_lancada':
            return {
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                ),
                color: 'text-green-600',
                bgColor: 'bg-green-100'
            }
        case 'relatorio_gerado':
            return {
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                ),
                color: 'text-purple-600',
                bgColor: 'bg-purple-100'
            }
        case 'sistema':
            return {
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                ),
                color: 'text-amber-600',
                bgColor: 'bg-amber-100'
            }
        case 'escola_nova':
            return {
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                ),
                color: 'text-indigo-600',
                bgColor: 'bg-indigo-100'
            }
    }
}

/**
 * Format notification count for badge
 * Returns "99+" for counts over 99
 */
export function formatNotificationCount(count: number): string {
    if (count > 99) {
        return '99+'
    }
    return count.toString()
}
