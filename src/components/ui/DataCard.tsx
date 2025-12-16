/*
component-meta:
  name: DataCard
  description: Mobile-first card for displaying table data with expandable details and action menu
  tokens: [--color-primary, --spacing-4, --touch-target-min]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import React, { useState, ReactNode } from 'react'

export interface DataCardField {
    label: string
    value: ReactNode
    primary?: boolean // Primary fields are always visible
}

export interface DataCardAction {
    label: string
    icon?: ReactNode
    onClick: () => void
    variant?: 'default' | 'danger'
}

export interface DataCardProps {
    title: string
    subtitle?: string
    avatar?: ReactNode
    fields: DataCardField[]
    actions?: DataCardAction[]
    status?: {
        label: string
        variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'
    }
    onClick?: () => void
    className?: string
}

const statusStyles = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    neutral: 'bg-slate-100 text-slate-800',
}

export const DataCard: React.FC<DataCardProps> = ({
    title,
    subtitle,
    avatar,
    fields,
    actions,
    status,
    onClick,
    className = '',
}) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [showActions, setShowActions] = useState(false)

    const primaryFields = fields.filter(f => f.primary !== false).slice(0, 3)
    const secondaryFields = fields.filter(f => !primaryFields.includes(f))
    const hasMoreFields = secondaryFields.length > 0

    const handleCardClick = () => {
        if (onClick) {
            onClick()
        }
    }

    const handleExpandClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsExpanded(!isExpanded)
    }

    const handleActionsClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setShowActions(!showActions)
    }

    return (
        <div
            className={`
                bg-white rounded-xl border border-slate-200 shadow-sm
                transition-all duration-200 ease-out
                ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}
                ${isExpanded ? 'shadow-md' : 'hover:shadow-md'}
                ${className}
            `}
            onClick={handleCardClick}
        >
            {/* Header */}
            <div className="p-4 flex items-start gap-3">
                {avatar && (
                    <div className="flex-shrink-0">
                        {avatar}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate">{title}</h3>
                            {subtitle && (
                                <p className="text-sm text-slate-500 truncate mt-0.5">{subtitle}</p>
                            )}
                        </div>
                        {status && (
                            <span className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status.variant]}`}>
                                {status.label}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Primary Fields */}
            <div className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-2">
                {primaryFields.map((field, idx) => (
                    <div key={idx} className={primaryFields.length === 3 && idx === 2 ? 'col-span-2' : ''}>
                        <p className="text-xs text-slate-500">{field.label}</p>
                        <p className="text-sm font-medium text-slate-900 truncate">{field.value}</p>
                    </div>
                ))}
            </div>

            {/* Expanded Fields */}
            {isExpanded && secondaryFields.length > 0 && (
                <div className="px-4 pb-3 pt-2 border-t border-slate-100 grid grid-cols-2 gap-x-4 gap-y-2 animate-slide-up">
                    {secondaryFields.map((field, idx) => (
                        <div key={idx}>
                            <p className="text-xs text-slate-500">{field.label}</p>
                            <p className="text-sm font-medium text-slate-900">{field.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer Actions */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                {/* Expand Button */}
                {hasMoreFields && (
                    <button
                        onClick={handleExpandClick}
                        className="flex items-center gap-1 text-sm text-primary-600 font-medium touch-feedback min-h-touch"
                    >
                        <svg
                            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        {isExpanded ? 'Ver menos' : 'Ver mais'}
                    </button>
                )}
                {!hasMoreFields && <div />}

                {/* Action Menu */}
                {actions && actions.length > 0 && (
                    <div className="relative">
                        <button
                            onClick={handleActionsClick}
                            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors touch-feedback min-h-touch min-w-touch flex items-center justify-center"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                        </button>

                        {/* Actions Dropdown */}
                        {showActions && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowActions(false)}
                                />
                                <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-scale-in origin-bottom-right">
                                    {actions.map((action, idx) => (
                                        <button
                                            key={idx}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setShowActions(false)
                                                action.onClick()
                                            }}
                                            className={`
                                                w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium
                                                transition-colors touch-feedback min-h-touch
                                                ${action.variant === 'danger'
                                                    ? 'text-red-600 hover:bg-red-50'
                                                    : 'text-slate-700 hover:bg-slate-50'
                                                }
                                            `}
                                        >
                                            {action.icon}
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default DataCard
