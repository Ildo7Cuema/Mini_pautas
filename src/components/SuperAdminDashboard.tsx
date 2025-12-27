/**
 * @component SuperAdminDashboard
 * @description Dashboard moderno mobile-first premium para SUPERADMIN com design nativo iOS/Android
 * @tokens [--color-primary, --gradient-primary, --shadow-elevation-2]
 * @responsive true
 * @tested-on [375x667, 768x1024, 1440x900]
 */

import React, { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fetchSuperAdminStats } from '../utils/superadmin'
import type { SuperAdminStats } from '../types'

export const SuperAdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<SuperAdminStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeChartTab, setActiveChartTab] = useState<'status' | 'growth'>('status')

    useEffect(() => {
        loadStats()
    }, [])

    const loadStats = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await fetchSuperAdminStats()
            setStats(data)
        } catch (err) {
            console.error('Error loading SUPERADMIN stats:', err)
            setError('Erro ao carregar estatísticas do sistema')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen pb-24 md:pb-8 animate-fade-in" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
                {/* Header Skeleton */}
                <div className="px-4 py-6 md:px-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="skeleton h-8 w-56 mb-2 bg-white/10 rounded-2xl"></div>
                            <div className="skeleton h-4 w-40 bg-white/5 rounded-xl"></div>
                        </div>
                        <div className="skeleton h-12 w-12 bg-white/10 rounded-2xl"></div>
                    </div>
                </div>

                <div className="px-4 md:px-8 space-y-5">
                    {/* Stats Cards Skeleton */}
                    <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="rounded-3xl p-4" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>
                                <div className="skeleton w-12 h-12 rounded-2xl bg-white/10 mb-3"></div>
                                <div className="skeleton h-8 w-16 rounded-xl bg-white/10 mb-2"></div>
                                <div className="skeleton h-3 w-20 rounded bg-white/5"></div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Skeleton */}
                    <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>
                        <div className="skeleton h-5 w-40 mb-4 rounded-xl bg-white/10"></div>
                        <div className="skeleton h-[280px] w-full rounded-2xl bg-white/5"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (error || !stats) {
        return (
            <div className="min-h-screen p-4 md:p-8 flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
                <div className="max-w-md w-full rounded-3xl p-8 text-center animate-fade-in" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
                        <span className="text-4xl">⚠️</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">Erro ao Carregar</h3>
                    <p className="text-slate-400 text-sm mb-6">{error || 'Não foi possível carregar os dados do sistema.'}</p>
                    <button
                        onClick={loadStats}
                        className="w-full py-4 rounded-2xl font-semibold text-white transition-all touch-feedback active:scale-[0.98]"
                        style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 8px 32px rgba(59,130,246,0.3)' }}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <span>🔄</span>
                            <span>Tentar Novamente</span>
                        </span>
                    </button>
                </div>
            </div>
        )
    }

    // Prepare data for charts
    const statusData = [
        { name: 'Activas', value: stats.escolas_ativas, color: '#10b981', bgColor: 'rgba(16,185,129,0.15)' },
        { name: 'Inactivas', value: stats.escolas_inativas, color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)' },
        { name: 'Bloqueadas', value: stats.escolas_bloqueadas, color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)' }
    ]

    const provinciaData = Object.entries(stats.estatisticas_por_provincia).map(([name, value]) => ({
        name: name.length > 8 ? name.substring(0, 8) + '...' : name,
        fullName: name,
        total: value
    })).sort((a, b) => b.total - a.total).slice(0, 8)

    // Calculate alert count
    const alertCount = stats.escolas_bloqueadas + stats.escolas_inativas
    const totalEscolas = stats.total_escolas || 1
    const percentAtivas = Math.round((stats.escolas_ativas / totalEscolas) * 100)

    return (
        <div className="min-h-screen pb-28 md:pb-8" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
            {/* Header Premium */}
            <div className="px-4 py-5 md:px-8 relative overflow-hidden">
                {/* Ambient Glow Effects */}
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', filter: 'blur(60px)' }}></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)', filter: 'blur(40px)' }}></div>

                <div className="relative flex items-center justify-between">
                    <div className="animate-fade-in">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}>
                                <span className="text-lg">🛡️</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">SUPERADMIN</h1>
                                <p className="text-slate-400 text-xs">Painel de Controlo</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={loadStats}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all touch-feedback active:scale-95"
                        style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        <span className="text-lg">🔄</span>
                    </button>
                </div>
            </div>

            <div className="px-4 md:px-8 space-y-5">
                {/* Premium Stats Cards - 2x2 Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <NativeStatCard
                        icon="🏫"
                        title="Total"
                        value={stats.total_escolas}
                        subtitle="escolas"
                        gradient="linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                        glowColor="rgba(59,130,246,0.3)"
                        delay={0}
                    />
                    <NativeStatCard
                        icon="✅"
                        title="Activas"
                        value={stats.escolas_ativas}
                        subtitle={`${percentAtivas}% do total`}
                        gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
                        glowColor="rgba(16,185,129,0.3)"
                        delay={50}
                    />
                    <NativeStatCard
                        icon="⏸️"
                        title="Inactivas"
                        value={stats.escolas_inativas}
                        subtitle="aguardando"
                        gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                        glowColor="rgba(245,158,11,0.3)"
                        delay={100}
                    />
                    <NativeStatCard
                        icon="🚫"
                        title="Bloqueadas"
                        value={stats.escolas_bloqueadas}
                        subtitle="requer ação"
                        gradient="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                        glowColor="rgba(239,68,68,0.3)"
                        delay={150}
                    />
                </div>

                {/* Alert Banner - Native Style */}
                {alertCount > 0 && (
                    <button
                        onClick={() => {
                            const event = new CustomEvent('navigate', { detail: { page: 'superadmin-escolas', filter: 'attention' } })
                            window.dispatchEvent(event)
                        }}
                        className="w-full rounded-2xl p-4 animate-slide-up flex items-center gap-3 text-left transition-all active:scale-[0.98] hover:ring-2 hover:ring-amber-400/50"
                        style={{
                            animationDelay: '200ms',
                            background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(239,68,68,0.15) 100%)',
                            border: '1px solid rgba(245,158,11,0.3)'
                        }}
                    >
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' }}>
                            <span className="text-lg">⚠️</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-amber-200 text-sm">Atenção Necessária</h3>
                            <p className="text-xs text-amber-300/70 mt-0.5 truncate">
                                {alertCount} escola{alertCount > 1 ? 's' : ''} requer{alertCount > 1 ? 'em' : ''} acção
                            </p>
                        </div>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <span className="text-amber-200 text-sm">→</span>
                        </div>
                    </button>
                )}


                {/* Chart Tabs - iOS Style Segmented Control */}
                <div className="animate-slide-up" style={{ animationDelay: '250ms' }}>
                    <div
                        className="p-1 rounded-2xl flex gap-1 mb-4"
                        style={{ background: 'rgba(255,255,255,0.08)' }}
                    >
                        <button
                            onClick={() => setActiveChartTab('status')}
                            className="flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all"
                            style={{
                                background: activeChartTab === 'status' ? 'rgba(255,255,255,0.12)' : 'transparent',
                                color: activeChartTab === 'status' ? '#fff' : 'rgba(255,255,255,0.5)'
                            }}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <span>📊</span>
                                <span>Estados</span>
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveChartTab('growth')}
                            className="flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all"
                            style={{
                                background: activeChartTab === 'growth' ? 'rgba(255,255,255,0.12)' : 'transparent',
                                color: activeChartTab === 'growth' ? '#fff' : 'rgba(255,255,255,0.5)'
                            }}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <span>📈</span>
                                <span>Crescimento</span>
                            </span>
                        </button>
                    </div>

                    {/* Chart Card - Glassmorphism */}
                    <div
                        className="rounded-3xl p-5 transition-all duration-300"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.08)'
                        }}
                    >
                        {activeChartTab === 'status' ? (
                            <>
                                <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                                    Distribuição por Estado
                                </h2>

                                {/* Donut Chart with Center Label */}
                                <div className="relative">
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <defs>
                                                <filter id="glow">
                                                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                                    <feMerge>
                                                        <feMergeNode in="coloredBlur" />
                                                        <feMergeNode in="SourceGraphic" />
                                                    </feMerge>
                                                </filter>
                                            </defs>
                                            <Pie
                                                data={statusData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={85}
                                                paddingAngle={3}
                                                dataKey="value"
                                                strokeWidth={0}
                                                filter="url(#glow)"
                                            >
                                                {statusData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: '16px',
                                                    background: 'rgba(15,23,42,0.95)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                                    padding: '12px 16px',
                                                    color: '#fff'
                                                }}
                                                formatter={(value: number) => [value, 'Escolas']}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    {/* Center Label */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="text-center">
                                            <p className="text-3xl font-bold text-white">{totalEscolas}</p>
                                            <p className="text-xs text-slate-400">Total</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Legend - Native Pills */}
                                <div className="flex justify-center gap-2 mt-4 flex-wrap">
                                    {statusData.map((item) => (
                                        <div
                                            key={item.name}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl"
                                            style={{ background: item.bgColor }}
                                        >
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                                            <span className="text-xs font-medium" style={{ color: item.color }}>{item.name}</span>
                                            <span className="text-xs text-slate-400">({item.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                                    Crescimento Mensal
                                </h2>
                                <ResponsiveContainer width="100%" height={260}>
                                    <AreaChart data={stats.crescimento_mensal}>
                                        <defs>
                                            <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                        <XAxis
                                            dataKey="mes"
                                            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }}
                                            tickLine={false}
                                            axisLine={false}
                                            width={30}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '16px',
                                                background: 'rgba(15,23,42,0.95)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                                padding: '12px 16px',
                                                color: '#fff'
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="total"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            fill="url(#colorGrowth)"
                                            name="Novas Escolas"
                                            dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                                            activeDot={{ r: 6, fill: '#60a5fa', stroke: '#3b82f6', strokeWidth: 2 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </>
                        )}
                    </div>
                </div>

                {/* Province Distribution - Horizontal Bar */}
                <div
                    className="rounded-3xl p-5 animate-slide-up"
                    style={{
                        animationDelay: '300ms',
                        background: 'rgba(255,255,255,0.06)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.08)'
                    }}
                >
                    <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                        <span>🗺️</span>
                        Top Províncias
                    </h2>

                    {/* Native Progress Bars */}
                    <div className="space-y-3">
                        {provinciaData.map((provincia, index) => {
                            const maxValue = Math.max(...provinciaData.map(p => p.total))
                            const percentage = (provincia.total / maxValue) * 100
                            const colors = [
                                'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
                                'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)',
                                'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                                'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
                                'linear-gradient(90deg, #ec4899 0%, #f472b6 100%)',
                                'linear-gradient(90deg, #06b6d4 0%, #22d3ee 100%)',
                                'linear-gradient(90deg, #ef4444 0%, #f87171 100%)',
                                'linear-gradient(90deg, #84cc16 0%, #a3e635 100%)'
                            ]
                            return (
                                <div key={provincia.name} className="animate-fade-in" style={{ animationDelay: `${350 + index * 50}ms` }}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm text-slate-300 font-medium">{provincia.fullName}</span>
                                        <span className="text-sm font-bold text-white">{provincia.total}</span>
                                    </div>
                                    <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                        <div
                                            className="h-full rounded-full transition-all duration-700 ease-out"
                                            style={{
                                                width: `${percentage}%`,
                                                background: colors[index % colors.length]
                                            }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Quick Actions - Native Cards */}
                <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
                    <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                        <span>⚡</span>
                        Acções Rápidas
                    </h2>
                    <div className="grid grid-cols-1 gap-3">
                        <NativeActionCard
                            icon="🏫"
                            title="Gerir Escolas"
                            subtitle="Ver e gerir todas as escolas"
                            gradient="linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)"
                            onClick={() => {
                                const event = new CustomEvent('navigate', { detail: { page: 'superadmin-escolas' } })
                                window.dispatchEvent(event)
                            }}
                        />
                        <NativeActionCard
                            icon="📋"
                            title="Licenças"
                            subtitle="Gerir licenças e subscrições"
                            gradient="linear-gradient(135deg, #10b981 0%, #14b8a6 100%)"
                            onClick={() => {
                                const event = new CustomEvent('navigate', { detail: { page: 'superadmin-licencas' } })
                                window.dispatchEvent(event)
                            }}
                        />
                        <NativeActionCard
                            icon="📊"
                            title="Auditoria"
                            subtitle="Ver histórico de acções"
                            gradient="linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)"
                            onClick={() => {
                                const event = new CustomEvent('navigate', { detail: { page: 'superadmin-audit' } })
                                window.dispatchEvent(event)
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

// Native Mobile Stat Card
interface NativeStatCardProps {
    icon: string
    title: string
    value: number
    subtitle: string
    gradient: string
    glowColor: string
    delay: number
}

const NativeStatCard: React.FC<NativeStatCardProps> = ({ icon, title, value, subtitle, gradient, glowColor, delay }) => {
    return (
        <div
            className="rounded-3xl p-4 animate-slide-up transition-all duration-300 active:scale-[0.98]"
            style={{
                animationDelay: `${delay}ms`,
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: `0 8px 32px ${glowColor}`
            }}
        >
            <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: gradient, boxShadow: `0 4px 16px ${glowColor}` }}
            >
                <span className="text-xl">{icon}</span>
            </div>
            <p className="text-2xl font-bold text-white mb-0.5">
                {value.toLocaleString('pt-AO')}
            </p>
            <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
    )
}

// Native Action Card Component
interface NativeActionCardProps {
    icon: string
    title: string
    subtitle: string
    gradient: string
    onClick: () => void
}

const NativeActionCard: React.FC<NativeActionCardProps> = ({ icon, title, subtitle, gradient, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 touch-feedback active:scale-[0.98]"
            style={{
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)'
            }}
        >
            <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: gradient }}
            >
                <span className="text-xl">{icon}</span>
            </div>
            <div className="flex-1 text-left min-w-0">
                <h3 className="font-semibold text-white text-sm">{title}</h3>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
            </div>
            <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.08)' }}
            >
                <span className="text-slate-400">→</span>
            </div>
        </button>
    )
}

export default SuperAdminDashboard
