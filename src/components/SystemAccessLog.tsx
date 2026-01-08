/**
 * @component SystemAccessLog
 * @description Log de acessos ao sistema para SUPERADMIN
 * Design moderno mobile-first premium
 */

import React, { useEffect, useState } from 'react'
import { fetchSystemVisits, fetchSystemVisitStats } from '../utils/superadmin'
import type { SystemVisit, SystemVisitStats } from '../types'

export const SystemAccessLog: React.FC = () => {
    const [visits, setVisits] = useState<SystemVisit[]>([])
    const [stats, setStats] = useState<SystemVisitStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedVisit, setSelectedVisit] = useState<SystemVisit | null>(null)
    const [filters, setFilters] = useState({
        tipoPerfil: '',
        deviceType: '',
        startDate: '',
        endDate: ''
    })
    const [activeTab, setActiveTab] = useState<'today' | 'week' | 'all'>('today')

    useEffect(() => {
        loadData()
    }, [activeTab])

    const loadData = async () => {
        try {
            setLoading(true)
            setError(null)

            // Build filters based on active tab
            const queryFilters: any = { ...filters }
            const now = new Date()

            if (activeTab === 'today') {
                queryFilters.startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
            } else if (activeTab === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                queryFilters.startDate = weekAgo.toISOString()
            }

            const [visitsData, statsData] = await Promise.all([
                fetchSystemVisits(queryFilters),
                fetchSystemVisitStats()
            ])

            setVisits(visitsData)
            setStats(statsData)
        } catch (err) {
            console.error('Error loading access data:', err)
            setError('Erro ao carregar dados de acesso')
        } finally {
            setLoading(false)
        }
    }

    const getDeviceIcon = (deviceType: string) => {
        switch (deviceType) {
            case 'mobile': return '📱'
            case 'tablet': return '📟'
            case 'desktop': return '🖥️'
            default: return '❓'
        }
    }

    const getProfileColor = (perfil: string) => {
        switch (perfil) {
            case 'SUPERADMIN': return 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
            case 'ESCOLA': return 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
            case 'PROFESSOR': return 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
            case 'SECRETARIO': return 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)'
            case 'ALUNO': return 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)'
            case 'ENCARREGADO': return 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)'
            case 'DIRECAO_MUNICIPAL': return 'linear-gradient(135deg, #9333ea 0%, #a855f7 100%)'
            default: return 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)'
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = now.getTime() - date.getTime()

        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000)
            return `Há ${minutes} min`
        }

        // Less than 24 hours
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000)
            return `Há ${hours}h`
        }

        // Same year
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
        }

        return date.toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric' })
    }

    if (loading) {
        return (
            <div className="min-h-screen pb-24 md:pb-8 animate-fade-in" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
                {/* Header Skeleton */}
                <div className="px-4 py-6 md:px-8">
                    <div className="skeleton h-8 w-56 mb-2 bg-white/10 rounded-2xl"></div>
                    <div className="skeleton h-4 w-40 bg-white/5 rounded-xl"></div>
                </div>

                <div className="px-4 md:px-8 space-y-4">
                    {/* Stats Skeleton */}
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <div className="skeleton h-8 w-12 rounded-xl bg-white/10 mb-2"></div>
                                <div className="skeleton h-3 w-16 rounded bg-white/5"></div>
                            </div>
                        ))}
                    </div>

                    {/* List Skeleton */}
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <div className="flex items-center gap-3">
                                <div className="skeleton w-12 h-12 rounded-xl bg-white/10"></div>
                                <div className="flex-1">
                                    <div className="skeleton h-4 w-32 rounded bg-white/10 mb-2"></div>
                                    <div className="skeleton h-3 w-24 rounded bg-white/5"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen p-4 md:p-8 flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
                <div className="max-w-md w-full rounded-3xl p-8 text-center animate-fade-in" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
                        <span className="text-4xl">⚠️</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">Erro ao Carregar</h3>
                    <p className="text-slate-400 text-sm mb-6">{error}</p>
                    <button
                        onClick={loadData}
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

    return (
        <div className="min-h-screen pb-28 md:pb-8" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
            {/* Header */}
            <div className="px-4 py-5 md:px-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', filter: 'blur(60px)' }}></div>

                <div className="relative flex items-center justify-between">
                    <div className="animate-fade-in">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}>
                                <span className="text-lg">👁️</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Acessos ao Sistema</h1>
                                <p className="text-slate-400 text-xs">Monitorização de visitas</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={loadData}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all touch-feedback active:scale-95"
                        style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        <span className="text-lg">🔄</span>
                    </button>
                </div>
            </div>

            <div className="px-4 md:px-8 space-y-5">
                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-3 gap-3 animate-slide-up">
                        <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)' }}>
                            <p className="text-2xl font-bold text-cyan-400">{stats.visits_today}</p>
                            <p className="text-xs text-cyan-300/70">Hoje</p>
                        </div>
                        <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                            <p className="text-2xl font-bold text-violet-400">{stats.visits_last_7_days}</p>
                            <p className="text-xs text-violet-300/70">7 Dias</p>
                        </div>
                        <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                            <p className="text-2xl font-bold text-emerald-400">{stats.unique_users_last_30_days}</p>
                            <p className="text-xs text-emerald-300/70">Únicos/Mês</p>
                        </div>
                    </div>
                )}

                {/* Device Distribution */}
                {stats && (
                    <div className="rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '100ms', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                            <span>📊</span>
                            Distribuição por Dispositivo
                        </h3>
                        <div className="flex justify-around">
                            <div className="text-center">
                                <span className="text-2xl">📱</span>
                                <p className="text-lg font-bold text-white">{stats.mobile_visits}</p>
                                <p className="text-xs text-slate-400">Mobile</p>
                            </div>
                            <div className="text-center">
                                <span className="text-2xl">📟</span>
                                <p className="text-lg font-bold text-white">{stats.tablet_visits}</p>
                                <p className="text-xs text-slate-400">Tablet</p>
                            </div>
                            <div className="text-center">
                                <span className="text-2xl">🖥️</span>
                                <p className="text-lg font-bold text-white">{stats.desktop_visits}</p>
                                <p className="text-xs text-slate-400">Desktop</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab Selector */}
                <div
                    className="p-1 rounded-2xl flex gap-1 animate-slide-up"
                    style={{ animationDelay: '150ms', background: 'rgba(255,255,255,0.08)' }}
                >
                    {[
                        { id: 'today', label: 'Hoje' },
                        { id: 'week', label: '7 Dias' },
                        { id: 'all', label: 'Todos' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'today' | 'week' | 'all')}
                            className="flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all"
                            style={{
                                background: activeTab === tab.id ? 'rgba(255,255,255,0.12)' : 'transparent',
                                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.5)'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Visits List */}
                <div className="space-y-3 animate-slide-up" style={{ animationDelay: '200ms' }}>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>📋</span>
                        Histórico de Acessos
                        <span className="text-xs font-normal text-slate-400">({visits.length})</span>
                    </h3>

                    {visits.length === 0 ? (
                        <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <span className="text-4xl mb-4 block">📭</span>
                            <p className="text-slate-400">Nenhum acesso encontrado</p>
                        </div>
                    ) : (
                        visits.map((visit, index) => (
                            <button
                                key={visit.id}
                                onClick={() => setSelectedVisit(visit)}
                                className="w-full rounded-2xl p-4 flex items-center gap-4 text-left transition-all active:scale-[0.98]"
                                style={{
                                    animationDelay: `${250 + index * 30}ms`,
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.08)'
                                }}
                            >
                                {/* Profile Badge */}
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: getProfileColor(visit.tipo_perfil || '') }}
                                >
                                    <span className="text-xl">{getDeviceIcon(visit.device_type)}</span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-white text-sm truncate">
                                            {visit.tipo_perfil || 'Anónimo'}
                                        </span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-400">
                                            {visit.browser || 'Desconhecido'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 truncate">
                                        {visit.escola_nome || 'Sem escola associada'}
                                    </p>
                                </div>

                                {/* Time */}
                                <div className="text-right flex-shrink-0">
                                    <p className="text-xs text-slate-400">{formatDate(visit.created_at)}</p>
                                    <p className="text-xs text-slate-500 mt-1">{visit.os}</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Visit Detail Modal */}
            {selectedVisit && (
                <div
                    className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setSelectedVisit(null)}
                >
                    <div
                        className="w-full max-w-lg rounded-3xl p-6 animate-slide-up max-h-[80vh] overflow-y-auto"
                        style={{ background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.1)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                                    style={{ background: getProfileColor(selectedVisit.tipo_perfil || '') }}
                                >
                                    <span className="text-xl">{getDeviceIcon(selectedVisit.device_type)}</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Detalhes do Acesso</h3>
                                    <p className="text-xs text-slate-400">{formatDate(selectedVisit.created_at)}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedVisit(null)}
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.1)' }}
                            >
                                <span className="text-white">✕</span>
                            </button>
                        </div>

                        {/* Details */}
                        <div className="space-y-4">
                            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <p className="text-xs text-slate-400 mb-1">Tipo de Perfil</p>
                                <p className="text-white font-medium">{selectedVisit.tipo_perfil || 'Não identificado'}</p>
                            </div>

                            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <p className="text-xs text-slate-400 mb-1">Escola</p>
                                <p className="text-white font-medium">{selectedVisit.escola_nome || 'Sem escola associada'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    <p className="text-xs text-slate-400 mb-1">Dispositivo</p>
                                    <p className="text-white font-medium capitalize">{selectedVisit.device_type}</p>
                                </div>
                                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    <p className="text-xs text-slate-400 mb-1">Navegador</p>
                                    <p className="text-white font-medium">{selectedVisit.browser || 'Desconhecido'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    <p className="text-xs text-slate-400 mb-1">Sistema Operativo</p>
                                    <p className="text-white font-medium">{selectedVisit.os || 'Desconhecido'}</p>
                                </div>
                                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    <p className="text-xs text-slate-400 mb-1">IP</p>
                                    <p className="text-white font-medium text-sm truncate">{selectedVisit.ip_address || 'Não disponível'}</p>
                                </div>
                            </div>

                            {selectedVisit.user_agent && (
                                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    <p className="text-xs text-slate-400 mb-1">User Agent</p>
                                    <p className="text-white text-xs font-mono break-all">{selectedVisit.user_agent}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SystemAccessLog
