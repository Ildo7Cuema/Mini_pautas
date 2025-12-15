import React from 'react'

type AlertType = 'error' | 'success' | 'warning' | 'info'

interface AlertProps {
    type: AlertType
    message: string
    onClose?: () => void
    className?: string
}

const alertStyles: Record<AlertType, { container: string, icon: JSX.Element }> = {
    error: {
        container: 'bg-red-50 border border-red-200 text-red-800',
        icon: (
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )
    },
    success: {
        container: 'bg-green-50 border border-green-200 text-green-800',
        icon: (
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )
    },
    warning: {
        container: 'bg-amber-50 border border-amber-200 text-amber-800',
        icon: (
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        )
    },
    info: {
        container: 'bg-blue-50 border border-blue-200 text-blue-800',
        icon: (
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )
    }
}

export const Alert: React.FC<AlertProps> = ({
    type,
    message,
    onClose,
    className = ''
}) => {
    const styles = alertStyles[type]

    return (
        <div className={`px-4 py-3 rounded-lg flex items-start gap-3 ${styles.container} ${className}`}>
            {styles.icon}
            <span className="text-sm flex-1">{message}</span>
            {onClose && (
                <button
                    onClick={onClose}
                    className="text-current opacity-70 hover:opacity-100 transition flex-shrink-0"
                    aria-label="Fechar"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    )
}

/**
 * Componente que exibe listas de erros/avisos
 */
interface AlertListProps {
    errors?: string[]
    warnings?: string[]
    infos?: string[]
    successes?: string[]
    className?: string
}

export const AlertList: React.FC<AlertListProps> = ({
    errors = [],
    warnings = [],
    infos = [],
    successes = [],
    className = ''
}) => {
    const hasAlerts = errors.length > 0 || warnings.length > 0 || infos.length > 0 || successes.length > 0

    if (!hasAlerts) return null

    return (
        <div className={`space-y-2 ${className}`}>
            {errors.map((error, index) => (
                <Alert key={`error-${index}`} type="error" message={error} />
            ))}
            {warnings.map((warning, index) => (
                <Alert key={`warning-${index}`} type="warning" message={warning} />
            ))}
            {infos.map((info, index) => (
                <Alert key={`info-${index}`} type="info" message={info} />
            ))}
            {successes.map((success, index) => (
                <Alert key={`success-${index}`} type="success" message={success} />
            ))}
        </div>
    )
}
