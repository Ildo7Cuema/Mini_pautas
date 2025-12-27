/**
 * @component EscolaManagement
 * @description Gestão de escolas moderna mobile-first para SUPERADMIN
 * @tokens [--color-primary, --gradient-primary, --shadow-elevation-2]
 * @responsive true
 * @tested-on [375x667, 768x1024, 1440x900]
 */

import React, { useEffect, useState } from 'react'
import { fetchAllEscolas, activateEscola, deactivateEscola, blockEscola, unblockEscola } from '../utils/superadmin'
import type { Escola } from '../types'

interface EscolaManagementProps {
    initialFilter?: 'all' | 'active' | 'inactive' | 'blocked' | 'attention'
}

export const EscolaManagement: React.FC<EscolaManagementProps> = ({ initialFilter }) => {
    const [escolas, setEscolas] = useState<Escola[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'blocked' | 'attention'>(initialFilter || 'all')
    const [selectedEscola, setSelectedEscola] = useState<Escola | null>(null)
    const [showBlockModal, setShowBlockModal] = useState(false)
    const [blockReason, setBlockReason] = useState('')
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [detailsEscola, setDetailsEscola] = useState<Escola | null>(null)

    useEffect(() => {
        loadEscolas()
    }, [filterStatus])

    const loadEscolas = async () => {
        try {
            setLoading(true)
            setError(null)

            const filters: any = {}
            if (filterStatus === 'active') {
                filters.ativo = true
                filters.bloqueado = false
            } else if (filterStatus === 'inactive') {
                filters.ativo = false
                filters.bloqueado = false
            } else if (filterStatus === 'blocked') {
                filters.bloqueado = true
            } else if (filterStatus === 'attention') {
                // Attention filter: fetch all and filter client-side for inactive OR blocked
                filters.needsAttention = true
            }

            const data = await fetchAllEscolas(filters)
            setEscolas(data)
        } catch (err) {
            console.error('Error loading escolas:', err)
            setError('Erro ao carregar escolas')
        } finally {
            setLoading(false)
        }
    }

    const handleActivate = async (escolaId: string) => {
        setActionLoading(escolaId)
        try {
            await activateEscola(escolaId)
            await loadEscolas()
        } catch (err) {
            alert('Erro ao activar escola')
        } finally {
            setActionLoading(null)
        }
    }

    const handleDeactivate = async (escolaId: string) => {
        setActionLoading(escolaId)
        try {
            await deactivateEscola(escolaId)
            await loadEscolas()
        } catch (err) {
            alert('Erro ao desactivar escola')
        } finally {
            setActionLoading(null)
        }
    }

    const handleBlockClick = (escola: Escola) => {
        setSelectedEscola(escola)
        setShowBlockModal(true)
        setBlockReason('')
    }

    const handleBlockSubmit = async () => {
        if (!selectedEscola || !blockReason.trim()) {
            alert('Por favor, forneça um motivo para o bloqueio')
            return
        }

        setActionLoading(selectedEscola.id)
        try {
            await blockEscola(selectedEscola.id, blockReason)
            setShowBlockModal(false)
            setSelectedEscola(null)
            setBlockReason('')
            await loadEscolas()
        } catch (err) {
            alert('Erro ao bloquear escola')
        } finally {
            setActionLoading(null)
        }
    }

    const handleUnblock = async (escolaId: string) => {
        setActionLoading(escolaId)
        try {
            await unblockEscola(escolaId)
            await loadEscolas()
        } catch (err) {
            alert('Erro ao desbloquear escola')
        } finally {
            setActionLoading(null)
        }
    }

    const handleViewDetails = (escola: Escola) => {
        setDetailsEscola(escola)
        setShowDetailsModal(true)
    }

    const filteredEscolas = escolas.filter(escola => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            escola.nome.toLowerCase().includes(query) ||
            escola.codigo_escola.toLowerCase().includes(query) ||
            escola.provincia?.toLowerCase().includes(query) ||
            escola.municipio?.toLowerCase().includes(query)
        )
    })

    // Stats for cards
    const statsCount = {
        total: escolas.length,
        active: escolas.filter(e => e.ativo && !e.bloqueado).length,
        inactive: escolas.filter(e => !e.ativo && !e.bloqueado).length,
        blocked: escolas.filter(e => e.bloqueado).length,
        attention: escolas.filter(e => !e.ativo || e.bloqueado).length
    }

    return (
        <div className="min-h-screen bg-neutral-50 pb-24 md:pb-8">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-primary-700 via-primary-800 to-primary-900 text-white px-4 py-6 md:px-8 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
                </div>

                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="animate-fade-in">
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                            <span className="text-3xl">🏫</span>
                            Gestão de Escolas
                        </h1>
                        <p className="text-primary-200 mt-1 text-sm md:text-base">
                            Gerir todas as escolas cadastradas no sistema
                        </p>
                    </div>
                    <button
                        onClick={loadEscolas}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-medium transition-all touch-feedback backdrop-blur-sm self-start md:self-auto"
                    >
                        <span>🔄</span>
                        <span>Actualizar</span>
                    </button>
                </div>
            </div>

            <div className="px-4 md:px-8 -mt-4 space-y-4">
                {/* Mini Stats Cards */}
                <div className="grid grid-cols-5 gap-2 md:gap-3">
                    <MiniStatCard label="Total" value={statsCount.total} color="blue" active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} />
                    <MiniStatCard label="Activas" value={statsCount.active} color="green" active={filterStatus === 'active'} onClick={() => setFilterStatus('active')} />
                    <MiniStatCard label="Inactivas" value={statsCount.inactive} color="yellow" active={filterStatus === 'inactive'} onClick={() => setFilterStatus('inactive')} />
                    <MiniStatCard label="Bloqueadas" value={statsCount.blocked} color="red" active={filterStatus === 'blocked'} onClick={() => setFilterStatus('blocked')} />
                    <MiniStatCard label="Atenção" value={statsCount.attention} color="orange" active={filterStatus === 'attention'} onClick={() => setFilterStatus('attention')} />
                </div>

                {/* Search */}
                <div className="bg-white rounded-2xl p-3 shadow-sm border border-neutral-100 animate-slide-up">
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">🔍</span>
                        <input
                            type="text"
                            placeholder="Pesquisar escola..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 border-0 bg-neutral-50 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all text-sm"
                        />
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 animate-fade-in">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">⚠️</span>
                            <p className="text-red-800 text-sm flex-1">{error}</p>
                            <button onClick={loadEscolas} className="text-red-600 font-medium text-sm">Retry</button>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 animate-pulse">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="h-5 bg-neutral-200 rounded w-3/4 mb-2"></div>
                                        <div className="h-3 bg-neutral-100 rounded w-1/2"></div>
                                    </div>
                                    <div className="h-6 w-16 bg-neutral-200 rounded-full"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Mobile Cards */}
                        <div className="md:hidden space-y-3">
                            {filteredEscolas.map((escola, index) => (
                                <div
                                    key={escola.id}
                                    className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 animate-slide-up touch-feedback"
                                    style={{ animationDelay: `${index * 30}ms` }}
                                    onClick={() => handleViewDetails(escola)}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-neutral-800 truncate pr-2">{escola.nome}</p>
                                            <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                                                <span>📍</span>
                                                {escola.provincia}, {escola.municipio}
                                            </p>
                                        </div>
                                        <StatusBadge escola={escola} />
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
                                        <span className="text-xs text-neutral-500 font-mono">{escola.codigo_escola}</span>
                                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                            {escola.bloqueado ? (
                                                <ActionButton
                                                    label="Desbloquear"
                                                    color="green"
                                                    loading={actionLoading === escola.id}
                                                    onClick={() => handleUnblock(escola.id)}
                                                />
                                            ) : (
                                                <>
                                                    {escola.ativo ? (
                                                        <ActionButton
                                                            label="Desactivar"
                                                            color="yellow"
                                                            loading={actionLoading === escola.id}
                                                            onClick={() => handleDeactivate(escola.id)}
                                                        />
                                                    ) : (
                                                        <ActionButton
                                                            label="Activar"
                                                            color="green"
                                                            loading={actionLoading === escola.id}
                                                            onClick={() => handleActivate(escola.id)}
                                                        />
                                                    )}
                                                    <ActionButton
                                                        label="Bloquear"
                                                        color="red"
                                                        loading={actionLoading === escola.id}
                                                        onClick={() => handleBlockClick(escola)}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden animate-slide-up">
                            <div className="overflow-x-auto">
                                <table className="table-excel w-full">
                                    <thead>
                                        <tr>
                                            <th className="text-left">Escola</th>
                                            <th className="text-center">Código</th>
                                            <th className="text-left">Localização</th>
                                            <th className="text-center">Estado</th>
                                            <th className="text-right">Acções</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredEscolas.map((escola) => (
                                            <tr key={escola.id} className="hover:bg-neutral-50 transition-colors">
                                                <td className="text-left">
                                                    <div className="font-medium text-neutral-800">{escola.nome}</div>
                                                    <div className="text-xs text-neutral-500">{escola.email}</div>
                                                </td>
                                                <td className="text-center">
                                                    <span className="font-mono text-sm text-neutral-600">{escola.codigo_escola}</span>
                                                </td>
                                                <td className="text-left">
                                                    <div className="text-sm text-neutral-800">{escola.provincia}</div>
                                                    <div className="text-xs text-neutral-500">{escola.municipio}</div>
                                                </td>
                                                <td className="text-center">
                                                    <StatusBadge escola={escola} />
                                                </td>
                                                <td className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleViewDetails(escola)}
                                                            className="px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg font-medium transition-colors"
                                                        >
                                                            Ver
                                                        </button>
                                                        {escola.bloqueado ? (
                                                            <button
                                                                onClick={() => handleUnblock(escola.id)}
                                                                disabled={actionLoading === escola.id}
                                                                className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg font-medium transition-colors disabled:opacity-50"
                                                            >
                                                                {actionLoading === escola.id ? '...' : 'Desbloquear'}
                                                            </button>
                                                        ) : (
                                                            <>
                                                                {escola.ativo ? (
                                                                    <button
                                                                        onClick={() => handleDeactivate(escola.id)}
                                                                        disabled={actionLoading === escola.id}
                                                                        className="px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded-lg font-medium transition-colors disabled:opacity-50"
                                                                    >
                                                                        {actionLoading === escola.id ? '...' : 'Desactivar'}
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleActivate(escola.id)}
                                                                        disabled={actionLoading === escola.id}
                                                                        className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg font-medium transition-colors disabled:opacity-50"
                                                                    >
                                                                        {actionLoading === escola.id ? '...' : 'Activar'}
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleBlockClick(escola)}
                                                                    disabled={actionLoading === escola.id}
                                                                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors disabled:opacity-50"
                                                                >
                                                                    Bloquear
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredEscolas.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
                                        <span className="text-3xl">🏫</span>
                                    </div>
                                    <p className="text-neutral-500">Nenhuma escola encontrada</p>
                                </div>
                            )}
                        </div>

                        {/* Mobile Empty State */}
                        {filteredEscolas.length === 0 && !loading && (
                            <div className="md:hidden text-center py-12 bg-white rounded-2xl shadow-sm border border-neutral-100">
                                <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
                                    <span className="text-3xl">🏫</span>
                                </div>
                                <p className="text-neutral-500">Nenhuma escola encontrada</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Block Modal - Bottom Sheet on Mobile */}
            {showBlockModal && selectedEscola && (
                <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-3xl p-6 md:mx-4 animate-slide-up max-h-[90vh] overflow-y-auto">
                        <div className="w-12 h-1 bg-neutral-300 rounded-full mx-auto mb-4 md:hidden" />

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">🚫</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-neutral-800">Bloquear Escola</h2>
                                <p className="text-sm text-neutral-500">{selectedEscola.nome}</p>
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                            <p className="text-sm text-red-800">
                                ⚠️ Esta acção irá impedir o acesso de todos os utilizadores desta escola ao sistema.
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                Motivo do Bloqueio *
                            </label>
                            <textarea
                                value={blockReason}
                                onChange={(e) => setBlockReason(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                placeholder="Descreva o motivo do bloqueio..."
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowBlockModal(false)
                                    setSelectedEscola(null)
                                    setBlockReason('')
                                }}
                                className="flex-1 px-4 py-3 border border-neutral-300 rounded-xl font-medium text-neutral-700 hover:bg-neutral-50 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleBlockSubmit}
                                disabled={actionLoading === selectedEscola.id || !blockReason.trim()}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold disabled:opacity-50 transition-all touch-feedback"
                            >
                                {actionLoading === selectedEscola.id ? 'A bloquear...' : 'Confirmar Bloqueio'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && detailsEscola && (
                <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-3xl p-6 md:mx-4 animate-slide-up max-h-[90vh] overflow-y-auto">
                        <div className="w-12 h-1 bg-neutral-300 rounded-full mx-auto mb-4 md:hidden" />

                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
                                    <span className="text-3xl">🏫</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-neutral-800">{detailsEscola.nome}</h2>
                                    <p className="text-sm text-neutral-500 font-mono">{detailsEscola.codigo_escola}</p>
                                </div>
                            </div>
                            <StatusBadge escola={detailsEscola} />
                        </div>

                        <div className="space-y-4">
                            <DetailRow icon="📧" label="Email" value={detailsEscola.email || 'N/A'} />
                            <DetailRow icon="📍" label="Localização" value={`${detailsEscola.provincia}, ${detailsEscola.municipio}`} />
                            <DetailRow icon="📞" label="Telefone" value={detailsEscola.telefone || 'N/A'} />
                            <DetailRow icon="🏠" label="Endereço" value={detailsEscola.endereco || 'N/A'} />
                            {detailsEscola.bloqueado && detailsEscola.bloqueado_motivo && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <p className="text-xs text-red-600 font-medium mb-1">Motivo do Bloqueio</p>
                                    <p className="text-sm text-red-800">{detailsEscola.bloqueado_motivo}</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                setShowDetailsModal(false)
                                setDetailsEscola(null)
                            }}
                            className="w-full mt-6 px-4 py-3 bg-neutral-100 text-neutral-700 rounded-xl font-medium hover:bg-neutral-200 transition-all"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// Mini Stat Card Component
interface MiniStatCardProps {
    label: string
    value: number
    color: 'blue' | 'green' | 'yellow' | 'red' | 'orange'
    active: boolean
    onClick: () => void
}

const MiniStatCard: React.FC<MiniStatCardProps> = ({ label, value, color, active, onClick }) => {
    const colorMap = {
        blue: { bg: 'bg-blue-500', activeBg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-200' },
        green: { bg: 'bg-emerald-500', activeBg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-200' },
        yellow: { bg: 'bg-amber-500', activeBg: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-200' },
        red: { bg: 'bg-red-500', activeBg: 'bg-red-600', text: 'text-red-600', border: 'border-red-200' },
        orange: { bg: 'bg-orange-500', activeBg: 'bg-orange-600', text: 'text-orange-600', border: 'border-orange-200' }
    }

    const colors = colorMap[color]

    return (
        <button
            onClick={onClick}
            className={`p-3 rounded-2xl transition-all touch-feedback ${active
                ? `${colors.activeBg} text-white shadow-lg`
                : `bg-white border-2 ${colors.border} hover:shadow-md`
                }`}
        >
            <p className={`text-xl md:text-2xl font-bold ${active ? 'text-white' : colors.text}`}>
                {value}
            </p>
            <p className={`text-xs font-medium ${active ? 'text-white/80' : 'text-neutral-500'}`}>
                {label}
            </p>
        </button>
    )
}

// Status Badge Component
const StatusBadge: React.FC<{ escola: Escola }> = ({ escola }) => {
    if (escola.bloqueado) {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                <span>🚫</span> Bloqueada
            </span>
        )
    }
    if (escola.ativo) {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                <span>✅</span> Activa
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
            <span>⏸️</span> Inactiva
        </span>
    )
}

// Action Button Component for mobile
interface ActionButtonProps {
    label: string
    color: 'green' | 'yellow' | 'red'
    loading: boolean
    onClick: () => void
}

const ActionButton: React.FC<ActionButtonProps> = ({ label, color, loading, onClick }) => {
    const colorMap = {
        green: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
        yellow: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
        red: 'bg-red-50 text-red-600 hover:bg-red-100'
    }

    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors touch-feedback disabled:opacity-50 ${colorMap[color]}`}
        >
            {loading ? '...' : label}
        </button>
    )
}

// Detail Row Component
const DetailRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl">
        <span className="text-lg">{icon}</span>
        <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-500 font-medium">{label}</p>
            <p className="text-sm text-neutral-800 break-words">{value}</p>
        </div>
    </div>
)

export default EscolaManagement
