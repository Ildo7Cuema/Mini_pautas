/**
 * FilterDrawer - Mobile filter drawer component
 * Slides in from right side with filter options
 */

import React, { useEffect } from 'react';
import { Icons } from './Icons';

export interface FilterOption {
    id: string;
    label: string;
    value: string | boolean | null;
    options?: Array<{ label: string; value: string | boolean | null }>;
}

export interface FilterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    filters: FilterOption[];
    values: Record<string, string | boolean | null>;
    onChange: (filterId: string, value: string | boolean | null) => void;
    onApply: () => void;
    onClear: () => void;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
    isOpen,
    onClose,
    title = 'Filtros',
    filters,
    values,
    onChange,
    onApply,
    onClear,
}) => {
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

    const hasActiveFilters = Object.values(values).some(v => v !== null && v !== '');

    return (
        <div className="fixed inset-0 z-[100]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className="absolute top-0 right-0 bottom-0 w-full max-w-sm bg-white shadow-xl animate-slide-in-left flex flex-col"
                style={{
                    paddingTop: 'env(safe-area-inset-top, 0px)',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        <Icons.X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filters */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                    {filters.map((filter) => (
                        <div key={filter.id}>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                {filter.label}
                            </label>
                            {filter.options ? (
                                <div className="flex flex-wrap gap-2">
                                    {filter.options.map((option) => {
                                        const isSelected = values[filter.id] === option.value;
                                        return (
                                            <button
                                                key={String(option.value)}
                                                onClick={() => onChange(filter.id, isSelected ? null : option.value)}
                                                className={`
                                                    px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px]
                                                    ${isSelected
                                                        ? 'bg-primary-600 text-white shadow-sm'
                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                    }
                                                `}
                                            >
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    value={String(values[filter.id] || '')}
                                    onChange={(e) => onChange(filter.id, e.target.value || null)}
                                    placeholder={`Filtrar por ${filter.label.toLowerCase()}`}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[48px]"
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-100 space-y-3">
                    {hasActiveFilters && (
                        <button
                            onClick={onClear}
                            className="w-full py-3 text-center font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors min-h-[48px]"
                        >
                            Limpar Filtros
                        </button>
                    )}
                    <button
                        onClick={() => {
                            onApply();
                            onClose();
                        }}
                        className="w-full py-3.5 text-center font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 active:bg-primary-800 transition-colors shadow-sm min-h-[48px]"
                    >
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FilterDrawer;
