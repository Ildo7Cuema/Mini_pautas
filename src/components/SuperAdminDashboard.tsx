/**
 * @component SuperAdminDashboard
 * @description Dashboard for SUPERADMIN with system-wide statistics and management
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
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando estatísticas...</p>
                </div>
            </div>
        )
    }

    if (error || !stats) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{error || 'Erro ao carregar dados'}</p>
                    <button
                        onClick={loadStats}
                        className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Tentar Novamente
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
        name,
        total: value
    }))

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Painel SUPERADMIN</h1>
                    <p className="text-gray-600 mt-1">Visão geral do sistema EduGest Angola</p>
                </div>
                <button
                    onClick={loadStats}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    🔄 Actualizar
                </button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total de Escolas"
                    value={stats.total_escolas}
                    icon="🏫"
                    color="blue"
                />
                <StatCard
                    title="Escolas Activas"
                    value={stats.escolas_ativas}
                    icon="✅"
                    color="green"
                />
                <StatCard
                    title="Escolas Inactivas"
                    value={stats.escolas_inativas}
                    icon="⏸️"
                    color="yellow"
                />
                <StatCard
                    title="Escolas Bloqueadas"
                    value={stats.escolas_bloqueadas}
                    icon="🚫"
                    color="red"
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Distribution Pie Chart */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Distribuição por Estado</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Monthly Growth Line Chart */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Crescimento Mensal</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={stats.crescimento_mensal}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="mes" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Novas Escolas" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 gap-6">
                {/* Province Distribution Bar Chart */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Distribuição por Província</h2>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={provinciaData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="total" fill="#8b5cf6" name="Escolas" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Acções Rápidas</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <QuickActionButton
                        icon="🏫"
                        title="Gerir Escolas"
                        description="Ver e gerir todas as escolas cadastradas"
                        onClick={() => window.location.href = '/superadmin/escolas'}
                    />
                    <QuickActionButton
                        icon="📊"
                        title="Auditoria"
                        description="Ver histórico de acções do sistema"
                        onClick={() => window.location.href = '/superadmin/audit'}
                    />
                    <QuickActionButton
                        icon="⚙️"
                        title="Configurações"
                        description="Configurar parâmetros do sistema"
                        onClick={() => window.location.href = '/superadmin/settings'}
                    />
                </div>
            </div>
        </div>
    )
}

// Stat Card Component
interface StatCardProps {
    title: string
    value: number
    icon: string
    color: 'blue' | 'green' | 'yellow' | 'red'
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
    const colorClasses = {
        blue: 'bg-blue-50 border-blue-200 text-blue-800',
        green: 'bg-green-50 border-green-200 text-green-800',
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        red: 'bg-red-50 border-red-200 text-red-800'
    }

    return (
        <div className={`rounded-lg border-2 p-6 ${colorClasses[color]}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium opacity-80">{title}</p>
                    <p className="text-3xl font-bold mt-2">{value}</p>
                </div>
                <div className="text-4xl">{icon}</div>
            </div>
        </div>
    )
}

// Quick Action Button Component
interface QuickActionButtonProps {
    icon: string
    title: string
    description: string
    onClick: () => void
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon, title, description, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
        >
            <div className="text-3xl mb-2">{icon}</div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
        </button>
    )
}
