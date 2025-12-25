/**
 * @component SuperAdminDashboard
 * @description Dashboard moderno mobile-first para SUPERADMIN com estatísticas e controlo centralizado
 * @tokens [--color-primary, --gradient-primary, --shadow-elevation-2]
 * @responsive true
 * @tested-on [375x667, 768x1024, 1440x900]
 */

import React, { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { fetchSuperAdminStats } from '../utils/superadmin'
import type { SuperAdminStats } from '../types'

export const SuperAdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<SuperAdminStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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
            <div className="min-h-screen bg-neutral-50 pb-24 md:pb-8 animate-fade-in">
                {/* Header Skeleton */}
                <div className="bg-gradient-to-r from-primary-700 via-primary-800 to-primary-900 text-white px-4 py-6 md:px-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="skeleton h-8 w-56 mb-2 bg-white/20 rounded-lg"></div>
                            <div className="skeleton h-4 w-40 bg-white/10 rounded"></div>
                        </div>
                        <div className="skeleton h-10 w-32 bg-white/20 rounded-xl"></div>
                    </div>
                </div>

                <div className="px-4 md:px-8 -mt-4 space-y-6">
                    {/* Stats Cards Skeleton */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="skeleton w-10 h-10 rounded-xl bg-neutral-200"></div>
                                    <div className="skeleton h-3 w-16 rounded bg-neutral-200"></div>
                                </div>
                                <div className="skeleton h-8 w-12 rounded bg-neutral-200"></div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {[1, 2].map((i) => (
                            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100">
                                <div className="skeleton h-5 w-40 mb-4 rounded bg-neutral-200"></div>
                                <div className="skeleton h-[250px] w-full rounded-xl bg-neutral-100"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (error || !stats) {
        return (
            <div className="min-h-screen bg-neutral-50 p-4 md:p-8">
                <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6 text-center animate-fade-in">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-3xl">⚠️</span>
                    </div>
                    <h3 className="text-lg font-bold text-neutral-800 mb-2">Erro ao Carregar</h3>
                    <p className="text-neutral-600 text-sm mb-4">{error || 'Não foi possível carregar os dados do sistema.'}</p>
                    <button
                        onClick={loadStats}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all touch-feedback"
                    >
                        <span>🔄</span>
                        <span>Tentar Novamente</span>
                    </button>
                </div>
            </div>
        )
    }

    // Prepare data for charts
    const statusData = [
        { name: 'Activas', value: stats.escolas_ativas, color: '#10b981' },
        { name: 'Inactivas', value: stats.escolas_inativas, color: '#f59e0b' },
        { name: 'Bloqueadas', value: stats.escolas_bloqueadas, color: '#ef4444' }
    ]

    const provinciaData = Object.entries(stats.estatisticas_por_provincia).map(([name, value]) => ({
        name: name.length > 10 ? name.substring(0, 10) + '...' : name,
        fullName: name,
        total: value
    }))

    // Calculate alert count
    const alertCount = stats.escolas_bloqueadas + stats.escolas_inativas

    return (
        <div className="min-h-screen bg-neutral-50 pb-24 md:pb-8">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-primary-700 via-primary-800 to-primary-900 text-white px-4 py-6 md:px-8 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
                </div>

                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="animate-fade-in">
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                            <span className="text-3xl">🛡️</span>
                            Painel SUPERADMIN
                        </h1>
                        <p className="text-primary-200 mt-1 text-sm md:text-base">
                            Controlo centralizado do EduGest Angola
                        </p>
                    </div>
                    <button
                        onClick={loadStats}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-medium transition-all touch-feedback backdrop-blur-sm self-start md:self-auto"
                    >
                        <span>🔄</span>
                        <span>Actualizar</span>
                    </button>
                </div>
            </div>

            <div className="px-4 md:px-8 -mt-4 space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <StatCard
                        icon="🏫"
                        title="Total Escolas"
                        value={stats.total_escolas}
                        gradient="from-blue-500 to-blue-600"
                        delay={0}
                    />
                    <StatCard
                        icon="✅"
                        title="Activas"
                        value={stats.escolas_ativas}
                        gradient="from-emerald-500 to-emerald-600"
                        delay={50}
                    />
                    <StatCard
                        icon="⏸️"
                        title="Inactivas"
                        value={stats.escolas_inativas}
                        gradient="from-amber-500 to-amber-600"
                        delay={100}
                    />
                    <StatCard
                        icon="🚫"
                        title="Bloqueadas"
                        value={stats.escolas_bloqueadas}
                        gradient="from-red-500 to-red-600"
                        delay={150}
                    />
                </div>

                {/* Alerts Section (if any) */}
                {alertCount > 0 && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <span className="text-xl">⚠️</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-amber-800">Atenção Necessária</h3>
                                <p className="text-sm text-amber-700 mt-1">
                                    Existem <strong>{alertCount}</strong> escolas que requerem atenção:
                                    {stats.escolas_inativas > 0 && <span className="ml-1">{stats.escolas_inativas} inactivas</span>}
                                    {stats.escolas_bloqueadas > 0 && <span className="ml-1">{stats.escolas_inativas > 0 ? ' e ' : ''}{stats.escolas_bloqueadas} bloqueadas</span>}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    {/* Status Distribution Pie Chart */}
                    <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-5 animate-slide-up" style={{ animationDelay: '250ms' }}>
                        <h2 className="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2">
                            <span className="text-xl">📊</span>
                            Distribuição por Estado
                        </h2>
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={90}
                                    innerRadius={40}
                                    fill="#8884d8"
                                    dataKey="value"
                                    strokeWidth={2}
                                    stroke="#fff"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        padding: '8px 12px'
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 mt-2">
                            {statusData.map((item) => (
                                <div key={item.name} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-xs text-neutral-600">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Monthly Growth Line Chart */}
                    <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-5 animate-slide-up" style={{ animationDelay: '300ms' }}>
                        <h2 className="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2">
                            <span className="text-xl">📈</span>
                            Crescimento Mensal
                        </h2>
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={stats.crescimento_mensal}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="mes"
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#e5e7eb' }}
                                />
                                <YAxis
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#e5e7eb' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        padding: '8px 12px'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    name="Novas Escolas"
                                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, fill: '#2563eb' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Province Distribution Bar Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-5 animate-slide-up" style={{ animationDelay: '350ms' }}>
                    <h2 className="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2">
                        <span className="text-xl">🗺️</span>
                        Distribuição por Província
                    </h2>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={provinciaData} margin={{ bottom: 60 }}>
                            <defs>
                                <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={1} />
                                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.8} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="name"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={{ stroke: '#e5e7eb' }}
                            />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={{ stroke: '#e5e7eb' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    padding: '8px 12px'
                                }}
                                formatter={(value: number, name: string, props: any) => [value, props.payload.fullName || name]}
                            />
                            <Bar
                                dataKey="total"
                                fill="url(#colorBar)"
                                name="Escolas"
                                radius={[6, 6, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Quick Actions */}
                <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
                    <h2 className="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2">
                        <span className="text-xl">⚡</span>
                        Acções Rápidas
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                        <QuickActionCard
                            icon="🏫"
                            title="Gerir Escolas"
                            description="Ver e gerir todas as escolas cadastradas"
                            gradient="from-blue-500 to-indigo-600"
                            onClick={() => {
                                // Navigate using the app's navigation system
                                const event = new CustomEvent('navigate', { detail: { page: 'superadmin-escolas' } })
                                window.dispatchEvent(event)
                            }}
                        />
                        <QuickActionCard
                            icon="📋"
                            title="Licenças"
                            description="Gerir licenças e subscrições"
                            gradient="from-emerald-500 to-teal-600"
                            onClick={() => {
                                const event = new CustomEvent('navigate', { detail: { page: 'superadmin-licencas' } })
                                window.dispatchEvent(event)
                            }}
                        />
                        <QuickActionCard
                            icon="📊"
                            title="Auditoria"
                            description="Ver histórico de acções do sistema"
                            gradient="from-purple-500 to-violet-600"
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

// Modern Stat Card Component
interface StatCardProps {
    icon: string
    title: string
    value: number
    gradient: string
    delay: number
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, gradient, delay }) => {
    return (
        <div
            className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 hover:shadow-lg transition-all duration-300 animate-slide-up"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                    <span className="text-lg md:text-xl">{icon}</span>
                </div>
                <span className="text-xs md:text-sm text-neutral-500 font-medium">{title}</span>
            </div>
            <p className={`text-2xl md:text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                {value.toLocaleString('pt-AO')}
            </p>
        </div>
    )
}

// Quick Action Card Component
interface QuickActionCardProps {
    icon: string
    title: string
    description: string
    gradient: string
    onClick: () => void
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ icon, title, description, gradient, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="relative overflow-hidden text-left p-5 bg-white border-2 border-neutral-100 rounded-2xl hover:border-transparent hover:shadow-xl transition-all duration-300 group touch-feedback"
        >
            {/* Hover gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <span className="text-xl text-white">{icon}</span>
            </div>
            <h3 className="font-bold text-neutral-800 group-hover:text-neutral-900">{title}</h3>
            <p className="text-sm text-neutral-500 mt-1 group-hover:text-neutral-600">{description}</p>

            {/* Arrow indicator */}
            <div className="absolute top-5 right-5 w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                <span className="text-neutral-600">→</span>
            </div>
        </button>
    )
}

export default SuperAdminDashboard
