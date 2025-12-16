/*
component-meta:
  name: Toast
  description: Native-like toast notifications with slide and fade animations
  tokens: [--duration-normal, --ease-out-expo, --color-success]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { useEffect, useState, createContext, useContext, useCallback, ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
    id: string
    type: ToastType
    title: string
    message?: string
    duration?: number
}

interface ToastContextType {
    toasts: ToastMessage[]
    addToast: (toast: Omit<ToastMessage, 'id'>) => void
    removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

interface ToastProviderProps {
    children: ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([])

    const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9)
        setToasts(prev => [...prev, { ...toast, id }])
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    )
}

interface ToastContainerProps {
    toasts: ToastMessage[]
    onRemove: (id: string) => void
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none p-4 flex flex-col items-center gap-2 safe-area-top">
            {toasts.map(toast => (
                <Toast key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    )
}

interface ToastProps {
    toast: ToastMessage
    onRemove: (id: string) => void
}

const toastStyles: Record<ToastType, { bg: string; icon: ReactNode; iconBg: string }> = {
    success: {
        bg: 'bg-white border-green-200',
        iconBg: 'bg-green-100 text-green-600',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        ),
    },
    error: {
        bg: 'bg-white border-red-200',
        iconBg: 'bg-red-100 text-red-600',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        ),
    },
    warning: {
        bg: 'bg-white border-amber-200',
        iconBg: 'bg-amber-100 text-amber-600',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
    },
    info: {
        bg: 'bg-white border-blue-200',
        iconBg: 'bg-blue-100 text-blue-600',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
    const [isExiting, setIsExiting] = useState(false)
    const [progress, setProgress] = useState(100)
    const duration = toast.duration ?? 4000

    useEffect(() => {
        const startTime = Date.now()
        const endTime = startTime + duration

        const progressInterval = setInterval(() => {
            const remaining = endTime - Date.now()
            const newProgress = Math.max(0, (remaining / duration) * 100)
            setProgress(newProgress)
        }, 50)

        const timer = setTimeout(() => {
            setIsExiting(true)
            setTimeout(() => onRemove(toast.id), 200)
        }, duration)

        return () => {
            clearTimeout(timer)
            clearInterval(progressInterval)
        }
    }, [duration, toast.id, onRemove])

    const handleClose = () => {
        setIsExiting(true)
        setTimeout(() => onRemove(toast.id), 200)
    }

    const styles = toastStyles[toast.type]

    return (
        <div
            className={`
                pointer-events-auto w-full max-w-sm
                ${styles.bg} border rounded-xl shadow-lg
                ${isExiting ? 'animate-fade-out' : 'animate-slide-down'}
                overflow-hidden
            `}
            role="alert"
        >
            <div className="flex items-start gap-3 p-4">
                <div className={`${styles.iconBg} rounded-full p-1.5 flex-shrink-0`}>
                    {styles.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
                    {toast.message && (
                        <p className="mt-1 text-sm text-slate-600">{toast.message}</p>
                    )}
                </div>
                <button
                    onClick={handleClose}
                    className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-colors touch-feedback"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            {/* Progress bar */}
            <div className="h-1 bg-slate-100">
                <div
                    className={`h-full transition-all duration-100 ${toast.type === 'success' ? 'bg-green-500' :
                            toast.type === 'error' ? 'bg-red-500' :
                                toast.type === 'warning' ? 'bg-amber-500' :
                                    'bg-blue-500'
                        }`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    )
}

export default Toast
