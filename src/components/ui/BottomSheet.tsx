/**
 * BottomSheet - Mobile bottom sheet modal component
 * Slides up from bottom with backdrop blur
 */

import React, { useEffect, useRef } from 'react';
import { Icons } from './Icons';

export interface BottomSheetAction {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger' | 'success';
    description?: string;
}

export interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children?: React.ReactNode;
    actions?: BottomSheetAction[];
}

const actionVariantStyles = {
    default: 'text-slate-700 hover:bg-slate-50 active:bg-slate-100',
    danger: 'text-red-600 hover:bg-red-50 active:bg-red-100',
    success: 'text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100',
};

export const BottomSheet: React.FC<BottomSheetProps> = ({
    isOpen,
    onClose,
    title,
    children,
    actions,
}) => {
    const sheetRef = useRef<HTMLDivElement>(null);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] md:hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                ref={sheetRef}
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-xl animate-slide-up"
                style={{
                    paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
                    maxHeight: '85vh',
                }}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                </div>

                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-5 pb-4 border-b border-slate-100">
                        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <Icons.X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
                    {children}

                    {/* Actions List */}
                    {actions && actions.length > 0 && (
                        <div className="px-3 py-2">
                            {actions.map((action, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        action.onClick();
                                        onClose();
                                    }}
                                    className={`
                                        w-full flex items-center gap-4 px-4 py-4 rounded-xl
                                        transition-all duration-150 min-h-[56px]
                                        ${actionVariantStyles[action.variant || 'default']}
                                    `}
                                >
                                    {action.icon && (
                                        <span className="flex-shrink-0">{action.icon}</span>
                                    )}
                                    <div className="flex-1 text-left">
                                        <span className="font-medium">{action.label}</span>
                                        {action.description && (
                                            <p className="text-sm text-slate-500 mt-0.5">
                                                {action.description}
                                            </p>
                                        )}
                                    </div>
                                    <Icons.ChevronRight className="w-5 h-5 text-slate-400" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cancel Button */}
                <div className="px-4 pt-2 pb-2 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 text-center font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 active:bg-slate-300 transition-colors min-h-[48px]"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BottomSheet;
