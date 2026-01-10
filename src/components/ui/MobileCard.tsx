/**
 * MobileCard - Reusable mobile-first card component
 * With touch feedback, status indicators, and action support
 */

import React from 'react';

export interface MobileCardAction {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger' | 'success' | 'warning';
}

export interface MobileCardProps {
    title: string;
    subtitle?: string;
    description?: string;
    icon?: React.ReactNode;
    status?: {
        label: string;
        variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
    };
    metadata?: Array<{ label: string; value: string | number }>;
    actions?: MobileCardAction[];
    onClick?: () => void;
    className?: string;
    children?: React.ReactNode;
}

const statusStyles = {
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
};

const actionStyles = {
    default: 'text-slate-600 hover:bg-slate-100 active:bg-slate-200',
    danger: 'text-red-600 hover:bg-red-50 active:bg-red-100',
    success: 'text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100',
    warning: 'text-amber-600 hover:bg-amber-50 active:bg-amber-100',
};

export const MobileCard: React.FC<MobileCardProps> = ({
    title,
    subtitle,
    description,
    icon,
    status,
    metadata,
    actions,
    onClick,
    className = '',
    children,
}) => {
    const isClickable = !!onClick;

    return (
        <div
            onClick={onClick}
            className={`
                bg-white rounded-2xl border border-slate-200/60 shadow-sm
                transition-all duration-200
                ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-slate-300 active:scale-[0.98]' : ''}
                ${className}
            `}
        >
            {/* Header */}
            <div className="p-4">
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    {icon && (
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-primary-600">
                            {icon}
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-slate-900 truncate text-base">
                                {title}
                            </h3>
                            {status && (
                                <span className={`
                                    flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border
                                    ${statusStyles[status.variant]}
                                `}>
                                    {status.label}
                                </span>
                            )}
                        </div>
                        {subtitle && (
                            <p className="text-sm text-slate-600 mt-0.5 truncate">
                                {subtitle}
                            </p>
                        )}
                        {description && (
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Metadata */}
                {metadata && metadata.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100">
                        {metadata.map((item, index) => (
                            <div key={index} className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-400">{item.label}:</span>
                                <span className="text-sm font-medium text-slate-700">{item.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Children */}
                {children}
            </div>

            {/* Actions */}
            {actions && actions.length > 0 && (
                <div className="flex items-center border-t border-slate-100">
                    {actions.map((action, index) => (
                        <button
                            key={index}
                            onClick={(e) => {
                                e.stopPropagation();
                                action.onClick();
                            }}
                            className={`
                                flex-1 flex items-center justify-center gap-2 py-3 px-3
                                text-sm font-medium transition-colors min-h-[44px]
                                ${actionStyles[action.variant || 'default']}
                                ${index > 0 ? 'border-l border-slate-100' : ''}
                            `}
                        >
                            {action.icon}
                            <span>{action.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MobileCard;
