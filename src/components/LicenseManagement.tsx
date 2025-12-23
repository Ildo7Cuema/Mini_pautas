/**
 * @component LicenseManagement
 * @description Modern mobile-first license management for SUPERADMIN
 */

import React, { useEffect, useState } from 'react'
import {
    fetchAllLicenses,
    fetchLicenseStats,
    createManualLicense,
    suspendLicense,
    reactivateLicense,
    fetchPrices,
    updatePrice
} from '../utils/license'
import { fetchAllEscolas } from '../utils/superadmin'
import { PriceEditModal } from './PriceEditModal'
import type { Licenca, LicenseStats, PlanoLicenca, Escola, PrecoLicenca } from '../types'

export const LicenseManagement: React.FC = () => {
    const [licenses, setLicenses] = useState<Licenca[]>([])
    const [stats, setStats] = useState<LicenseStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filters
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [filterPlano, setFilterPlano] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')

    // Create Modal
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [escolas, setEscolas] = useState<Escola[]>([])
    const [selectedEscola, setSelectedEscola] = useState<string>('')
    const [selectedPlano, setSelectedPlano] = useState<PlanoLicenca>('anual')
    const [customValor, setCustomValor] = useState<string>('')
    const [createMotivo, setCreateMotivo] = useState('')
    const [creating, setCreating] = useState(false)

    // Suspend Modal
    const [showSuspendModal, setShowSuspendModal] = useState(false)
    const [suspendingLicense, setSuspendingLicense] = useState<Licenca | null>(null)
    const [suspendMotivo, setSuspendMotivo] = useState('')

    // Price Management
    const [prices, setPrices] = useState<PrecoLicenca[]>([])
    const [showPriceEditModal, setShowPriceEditModal] = useState(false)
    const [editingPrice, setEditingPrice] = useState<PrecoLicenca | null>(null)

    useEffect(() => {
        loadData()
    }, [filterStatus, filterPlano])

    const loadData = async () => {
        try {
            setLoading(true)
            setError(null)

            const filters: Record<string, string> = {}
            if (filterStatus !== 'all') filters.estado = filterStatus
            if (filterPlano !== 'all') filters.plano = filterPlano

            const [licensesData, statsData, pricesData] = await Promise.all([
                fetchAllLicenses(filters),
                fetchLicenseStats(),
                fetchPrices()
            ])
            setPrices(pricesData)
            setLicenses(licensesData)
            setStats(statsData)
        } catch (err) {
            console.error('Error loading data:', err)
            setError('Erro ao carregar dados de licenciamento')
        } finally {
            setLoading(false)
        }
    }

    const handleOpenCreateModal = async () => {
        try {
            const escolasData = await fetchAllEscolas()
            setEscolas(escolasData)
            setShowCreateModal(true)
        } catch (err) {
            alert('Erro ao carregar escolas')
        }
    }

    const handleCreateLicense = async () => {
        if (!selectedEscola) {
            alert('Seleccione uma escola')
            return
        }

        try {
            setCreating(true)
            const valor = customValor ? parseFloat(customValor) : undefined
            await createManualLicense(selectedEscola, selectedPlano, valor, createMotivo)
            setShowCreateModal(false)
            setSelectedEscola('')
            setSelectedPlano('anual')
            setCustomValor('')
            setCreateMotivo('')
            await loadData()
        } catch (err) {
            alert('Erro ao criar licença')
        } finally {
            setCreating(false)
        }
    }

    const handleSuspend = async () => {
        if (!suspendingLicense || !suspendMotivo.trim()) {
            alert('Por favor, forneça um motivo')
            return
        }

        try {
            await suspendLicense(suspendingLicense.id, suspendMotivo)
            setShowSuspendModal(false)
            setSuspendingLicense(null)
            setSuspendMotivo('')
            await loadData()
        } catch (err) {
            alert('Erro ao suspender licença')
        }
    }

    const handleReactivate = async (licenca: Licenca) => {
        if (!confirm('Reactivar esta licença?')) return

        try {
            await reactivateLicense(licenca.id)
            await loadData()
        } catch (err) {
            alert('Erro ao reactivar licença')
        }
    }

    const filteredLicenses = licenses.filter(license => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        const escola = (license as any).escolas
        return (
            escola?.nome?.toLowerCase().includes(query) ||
            escola?.codigo_escola?.toLowerCase().includes(query)
        )
    })

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-AO', {
            style: 'currency',
            currency: 'AOA'
        }).format(value)
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-AO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-neutral-600">A carregar licenças...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-neutral-50 pb-24 md:pb-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-700 to-primary-800 text-white px-4 py-6 md:px-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">Gestão de Licenças</h1>
                        <p className="text-primary-200 mt-1 text-sm">Gerir licenças de todas as escolas</p>
                    </div>
                    <button
                        onClick={handleOpenCreateModal}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-medium transition-all touch-feedback backdrop-blur-sm"
                    >
                        <span className="text-lg">+</span>
                        <span>Nova Licença</span>
                    </button>
                </div>
            </div>

            <div className="px-4 md:px-8 -mt-4 space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
                        <p className="text-red-800 text-sm">{error}</p>
                    </div>
                )}

                {/* Stats Dashboard */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 animate-slide-up">
                        <StatCard icon="📊" title="Total" value={stats.total_licencas} color="primary" />
                        <StatCard icon="✅" title="Activas" value={stats.licencas_ativas} color="green" />
                        <StatCard icon="⏰" title="Expiradas" value={stats.licencas_expiradas} color="yellow" />
                        <StatCard icon="🚫" title="Suspensas" value={stats.licencas_suspensas} color="red" />
                        <div className="col-span-2 md:col-span-1">
                            <StatCard icon="💰" title="Receita (Ano)" value={formatCurrency(stats.receita_ano)} color="purple" isText />
                        </div>
                    </div>
                )}

                {/* Pricing Configuration */}
                <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
                    <h2 className="text-lg font-bold text-neutral-800 mb-4">Configuração de Preços</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {prices.map((price, index) => (
                            <div
                                key={price.id}
                                className="relative bg-white rounded-2xl p-5 border-2 border-neutral-100 hover:border-primary-200 hover:shadow-lg transition-all"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <button
                                    onClick={() => {
                                        setEditingPrice(price)
                                        setShowPriceEditModal(true)
                                    }}
                                    className="absolute top-3 right-3 p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                    title="Editar preço"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                                <h3 className="text-lg font-bold text-neutral-800 capitalize">{price.plano}</h3>
                                <p className="text-2xl font-extrabold text-primary-600 mt-2">{formatCurrency(price.valor)}</p>
                                {price.desconto_percentual > 0 && (
                                    <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                        💰 {price.desconto_percentual}% desconto
                                    </span>
                                )}
                                <p className="text-sm text-neutral-500 mt-2">{price.descricao}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100 animate-slide-up" style={{ animationDelay: '150ms' }}>
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="🔍 Pesquisar escola..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="all">Todos Estados</option>
                                <option value="ativa">✅ Activas</option>
                                <option value="expirada">⏰ Expiradas</option>
                                <option value="suspensa">🚫 Suspensas</option>
                                <option value="cancelada">❌ Canceladas</option>
                            </select>
                            <select
                                value={filterPlano}
                                onChange={(e) => setFilterPlano(e.target.value)}
                                className="px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="all">Todos Planos</option>
                                <option value="trimestral">Trimestral</option>
                                <option value="semestral">Semestral</option>
                                <option value="anual">Anual</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* License List */}
                <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {filteredLicenses.map((license) => {
                            const escola = (license as any).escolas
                            return (
                                <div key={license.id} className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-bold text-neutral-800">{escola?.nome || 'N/A'}</p>
                                            <p className="text-xs text-neutral-500">{escola?.codigo_escola}</p>
                                        </div>
                                        <EstadoBadge estado={license.estado} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                        <div>
                                            <p className="text-neutral-500 text-xs">Plano</p>
                                            <p className="font-semibold capitalize">{license.plano}</p>
                                        </div>
                                        <div>
                                            <p className="text-neutral-500 text-xs">Valor</p>
                                            <p className="font-semibold">{formatCurrency(license.valor)}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-neutral-500 text-xs">Validade</p>
                                            <p className="font-medium">{formatDate(license.data_inicio)} - {formatDate(license.data_fim)}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-3 border-t border-neutral-100">
                                        {license.estado === 'ativa' ? (
                                            <button
                                                onClick={() => {
                                                    setSuspendingLicense(license)
                                                    setShowSuspendModal(true)
                                                }}
                                                className="flex-1 py-2 text-sm text-red-600 bg-red-50 rounded-lg font-medium"
                                            >
                                                Suspender
                                            </button>
                                        ) : license.estado === 'suspensa' ? (
                                            <button
                                                onClick={() => handleReactivate(license)}
                                                className="flex-1 py-2 text-sm text-green-600 bg-green-50 rounded-lg font-medium"
                                            >
                                                Reactivar
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
                        <table className="min-w-full">
                            <thead className="bg-neutral-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Escola</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Plano</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Validade</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Valor</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Acções</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {filteredLicenses.map((license) => {
                                    const escola = (license as any).escolas
                                    return (
                                        <tr key={license.id} className="hover:bg-neutral-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-neutral-800">{escola?.nome || 'N/A'}</div>
                                                <div className="text-xs text-neutral-500">{escola?.codigo_escola}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <PlanoBadge plano={license.plano} />
                                            </td>
                                            <td className="px-6 py-4 text-sm text-neutral-600">
                                                {formatDate(license.data_inicio)} - {formatDate(license.data_fim)}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-neutral-800">
                                                {formatCurrency(license.valor)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <EstadoBadge estado={license.estado} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {license.estado === 'ativa' ? (
                                                    <button
                                                        onClick={() => {
                                                            setSuspendingLicense(license)
                                                            setShowSuspendModal(true)
                                                        }}
                                                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                                                    >
                                                        Suspender
                                                    </button>
                                                ) : license.estado === 'suspensa' ? (
                                                    <button
                                                        onClick={() => handleReactivate(license)}
                                                        className="text-green-600 hover:text-green-800 font-medium text-sm"
                                                    >
                                                        Reactivar
                                                    </button>
                                                ) : null}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        {filteredLicenses.length === 0 && (
                            <div className="text-center py-12 text-neutral-500">
                                📋 Nenhuma licença encontrada
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create License Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-3xl p-6 md:mx-4 animate-slide-up max-h-[90vh] overflow-y-auto">
                        <div className="w-12 h-1 bg-neutral-300 rounded-full mx-auto mb-4 md:hidden" />
                        <h2 className="text-xl font-bold text-neutral-800 mb-6">✨ Nova Licença Manual</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">Escola *</label>
                                <select
                                    value={selectedEscola}
                                    onChange={(e) => setSelectedEscola(e.target.value)}
                                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="">Seleccione uma escola</option>
                                    {escolas.map(escola => (
                                        <option key={escola.id} value={escola.id}>
                                            {escola.nome} ({escola.codigo_escola})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">Plano *</label>
                                <select
                                    value={selectedPlano}
                                    onChange={(e) => setSelectedPlano(e.target.value as PlanoLicenca)}
                                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="trimestral">Trimestral (15.000 AOA)</option>
                                    <option value="semestral">Semestral (27.000 AOA)</option>
                                    <option value="anual">Anual (48.000 AOA)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">Valor Personalizado</label>
                                <input
                                    type="number"
                                    value={customValor}
                                    onChange={(e) => setCustomValor(e.target.value)}
                                    placeholder="Usar valor padrão do plano"
                                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">Motivo</label>
                                <textarea
                                    value={createMotivo}
                                    onChange={(e) => setCreateMotivo(e.target.value)}
                                    placeholder="Motivo da criação manual..."
                                    rows={2}
                                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-3 border border-neutral-300 rounded-xl font-medium text-neutral-700 hover:bg-neutral-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateLicense}
                                disabled={creating || !selectedEscola}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold disabled:opacity-50"
                            >
                                {creating ? 'Criando...' : '✓ Criar Licença'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Suspend Modal */}
            {showSuspendModal && suspendingLicense && (
                <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-3xl p-6 md:mx-4 animate-slide-up">
                        <div className="w-12 h-1 bg-neutral-300 rounded-full mx-auto mb-4 md:hidden" />
                        <h2 className="text-xl font-bold text-neutral-800 mb-2">🚫 Suspender Licença</h2>
                        <p className="text-neutral-600 mb-4">
                            Escola: <strong>{(suspendingLicense as any).escolas?.nome}</strong>
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Motivo da Suspensão *</label>
                            <textarea
                                value={suspendMotivo}
                                onChange={(e) => setSuspendMotivo(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-red-500"
                                placeholder="Descreva o motivo..."
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowSuspendModal(false)
                                    setSuspendingLicense(null)
                                    setSuspendMotivo('')
                                }}
                                className="flex-1 px-4 py-3 border border-neutral-300 rounded-xl font-medium text-neutral-700 hover:bg-neutral-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSuspend}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold"
                            >
                                Suspender
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Price Edit Modal */}
            <PriceEditModal
                price={editingPrice}
                isOpen={showPriceEditModal}
                onClose={() => {
                    setShowPriceEditModal(false)
                    setEditingPrice(null)
                }}
                onSave={async (id, updates) => {
                    await updatePrice(id, updates)
                    const updatedPrices = await fetchPrices()
                    setPrices(updatedPrices)
                }}
            />
        </div>
    )
}

// Helper Components
const StatCard: React.FC<{ icon: string; title: string; value: number | string; color: string; isText?: boolean }> = ({ icon, title, value, color }) => {
    const colorMap: Record<string, string> = {
        primary: 'from-primary-500 to-primary-600',
        green: 'from-green-500 to-green-600',
        yellow: 'from-yellow-500 to-amber-600',
        red: 'from-red-500 to-red-600',
        purple: 'from-purple-500 to-purple-600'
    }

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{icon}</span>
                <span className="text-xs text-neutral-500 font-medium">{title}</span>
            </div>
            <p className={`text-xl md:text-2xl font-bold bg-gradient-to-r ${colorMap[color]} bg-clip-text text-transparent`}>
                {value}
            </p>
        </div>
    )
}

const PlanoBadge: React.FC<{ plano: string }> = ({ plano }) => {
    const colors: Record<string, string> = {
        trimestral: 'bg-blue-100 text-blue-700',
        semestral: 'bg-purple-100 text-purple-700',
        anual: 'bg-green-100 text-green-700'
    }

    return (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${colors[plano] || 'bg-neutral-100 text-neutral-600'}`}>
            {plano}
        </span>
    )
}

const EstadoBadge: React.FC<{ estado: string }> = ({ estado }) => {
    const config: Record<string, { bg: string, text: string, icon: string }> = {
        ativa: { bg: 'bg-green-100', text: 'text-green-700', icon: '✅' },
        expirada: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '⏰' },
        suspensa: { bg: 'bg-red-100', text: 'text-red-700', icon: '🚫' },
        cancelada: { bg: 'bg-neutral-100', text: 'text-neutral-600', icon: '❌' }
    }

    const { bg, text, icon } = config[estado] || config.cancelada

    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${bg} ${text} text-xs font-semibold rounded-full`}>
            <span>{icon}</span>
            {estado.charAt(0).toUpperCase() + estado.slice(1)}
        </span>
    )
}

export default LicenseManagement
