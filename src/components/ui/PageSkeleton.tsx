/*
component-meta:
  name: PageSkeleton
  description: Skeleton loading component for page transitions
  responsive: true
*/

import React from 'react'

interface PageSkeletonProps {
    variant?: 'dashboard' | 'list' | 'form' | 'default'
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({ variant = 'default' }) => {
    return (
        <div className="animate-fade-in space-y-6 pb-24 md:pb-8">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="skeleton h-8 w-48 mb-2 rounded-lg"></div>
                    <div className="skeleton h-4 w-64 rounded"></div>
                </div>
                <div className="flex gap-3">
                    <div className="skeleton h-10 w-10 rounded-xl"></div>
                    <div className="skeleton h-10 w-32 rounded-xl"></div>
                </div>
            </div>

            {/* Stats Grid Skeleton */}
            {(variant === 'dashboard' || variant === 'default') && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="card p-4 md:p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="skeleton w-12 h-12 rounded-2xl"></div>
                                <div className="skeleton h-6 w-12 rounded-lg"></div>
                            </div>
                            <div>
                                <div className="skeleton h-4 w-20 mb-2 rounded"></div>
                                <div className="skeleton h-8 w-16 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Content Skeleton */}
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="card">
                        <div className="border-b border-slate-100 p-5 md:p-6">
                            <div className="skeleton h-6 w-40 mb-2 rounded"></div>
                            <div className="skeleton h-4 w-56 rounded"></div>
                        </div>
                        <div className="p-4 space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="skeleton w-10 h-10 rounded-xl"></div>
                                    <div className="flex-1">
                                        <div className="skeleton h-4 w-32 mb-2 rounded"></div>
                                        <div className="skeleton h-3 w-20 rounded"></div>
                                    </div>
                                    <div className="skeleton h-6 w-12 rounded-lg"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Skeleton */}
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="card p-4">
                            <div className="skeleton w-10 h-10 rounded-xl mb-3"></div>
                            <div className="skeleton h-4 w-24 mb-2 rounded"></div>
                            <div className="skeleton h-3 w-32 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// List variant skeleton for pages like Students, Classes
export const ListPageSkeleton: React.FC = () => {
    return (
        <div className="animate-fade-in space-y-6 pb-24 md:pb-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="skeleton h-8 w-32 mb-2 rounded-lg"></div>
                    <div className="skeleton h-4 w-48 rounded"></div>
                </div>
                <div className="flex gap-3">
                    <div className="skeleton h-10 w-10 rounded-xl"></div>
                    <div className="skeleton h-10 w-28 rounded-xl"></div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
                <div className="skeleton h-10 w-48 rounded-lg"></div>
                <div className="skeleton h-10 w-36 rounded-lg"></div>
            </div>

            {/* Table/List */}
            <div className="card overflow-hidden">
                <div className="hidden md:block">
                    <div className="border-b border-slate-100 p-4 flex gap-4">
                        <div className="skeleton h-4 w-8 rounded"></div>
                        <div className="skeleton h-4 w-48 rounded"></div>
                        <div className="skeleton h-4 w-24 rounded"></div>
                        <div className="skeleton h-4 w-20 rounded"></div>
                        <div className="skeleton h-4 w-16 rounded ml-auto"></div>
                    </div>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="border-b border-slate-50 p-4 flex items-center gap-4">
                            <div className="skeleton w-4 h-4 rounded"></div>
                            <div className="skeleton w-10 h-10 rounded-full"></div>
                            <div className="flex-1">
                                <div className="skeleton h-4 w-40 mb-1 rounded"></div>
                                <div className="skeleton h-3 w-24 rounded"></div>
                            </div>
                            <div className="skeleton h-6 w-16 rounded-lg"></div>
                            <div className="skeleton h-8 w-8 rounded-lg"></div>
                        </div>
                    ))}
                </div>

                {/* Mobile cards */}
                <div className="md:hidden p-4 space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="card p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="skeleton w-12 h-12 rounded-full"></div>
                                <div className="flex-1">
                                    <div className="skeleton h-4 w-32 mb-1 rounded"></div>
                                    <div className="skeleton h-3 w-20 rounded"></div>
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <div className="skeleton h-6 w-16 rounded-lg"></div>
                                <div className="skeleton h-6 w-6 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default PageSkeleton
