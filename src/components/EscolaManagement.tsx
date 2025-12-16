/**
 * @component EscolaManagement
 * @description School management interface for SUPERADMIN
 */

import React, { useEffect, useState } from 'react'
import { fetchAllEscolas, activateEscola, deactivateEscola, blockEscola, unblockEscola } from '../utils/superadmin'
import type { Escola } from '../types'

export const EscolaManagement: React.FC = () => {
    const [escolas, setEscolas] = useState<Escola[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'blocked'>('all')
    const [selectedEscola, setSelectedEscola] = useState<Escola | null>(null)
    const [showBlockModal, setShowBlockModal] = useState(false)
    const [blockReason, setBlockReason] = useState('')

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
            } else if (filterStatus === 'blocked') {
                filters.bloqueado = true
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
        if (!confirm('Tem certeza que deseja activar esta escola?')) return

        try {
            await activateEscola(escolaId)
            await loadEscolas()
        } catch (err) {
            alert('Erro ao activar escola')
        }
    }

    const handleDeactivate = async (escolaId: string) => {
        if (!confirm('Tem certeza que deseja desactivar esta escola?')) return

        try {
            await deactivateEscola(escolaId)
            await loadEscolas()
        } catch (err) {
            alert('Erro ao desactivar escola')
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

        try {
            await blockEscola(selectedEscola.id, blockReason)
            setShowBlockModal(false)
            setSelectedEscola(null)
            setBlockReason('')
            await loadEscolas()
        } catch (err) {
            alert('Erro ao bloquear escola')
        }
    }

    const handleUnblock = async (escolaId: string) => {
        if (!confirm('Tem certeza que deseja desbloquear esta escola?')) return

        try {
            await unblockEscola(escolaId)
            await loadEscolas()
        } catch (err) {
            alert('Erro ao desbloquear escola')
        }
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

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestão de Escolas</h1>
                <p className="text-gray-600 mt-1">Gerir todas as escolas cadastradas no sistema</p>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Pesquisar por nome, código, província ou município..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div className="flex gap-2">
                        <FilterButton
                            label="Todas"
                            active={filterStatus === 'all'}
                            onClick={() => setFilterStatus('all')}
                        />
                        <FilterButton
                            label="Activas"
                            active={filterStatus === 'active'}
                            onClick={() => setFilterStatus('active')}
                            color="green"
                        />
                        <FilterButton
                            label="Inactivas"
                            active={filterStatus === 'inactive'}
                            onClick={() => setFilterStatus('inactive')}
                            color="yellow"
                        />
                        <FilterButton
                            label="Bloqueadas"
                            active={filterStatus === 'blocked'}
                            onClick={() => setFilterStatus('blocked')}
                            color="red"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{error}</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Escola
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Código
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Localização
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acções
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredEscolas.map((escola) => (
                                    <tr key={escola.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{escola.nome}</div>
                                            <div className="text-sm text-gray-500">{escola.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {escola.codigo_escola}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{escola.provincia}</div>
                                            <div className="text-sm text-gray-500">{escola.municipio}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge escola={escola} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            {escola.bloqueado ? (
                                                <button
                                                    onClick={() => handleUnblock(escola.id)}
                                                    className="text-green-600 hover:text-green-900"
                                                    title={`Bloqueado: ${escola.bloqueado_motivo}`}
                                                >
                                                    Desbloquear
                                                </button>
                                            ) : (
                                                <>
                                                    {escola.ativo ? (
                                                        <button
                                                            onClick={() => handleDeactivate(escola.id)}
                                                            className="text-yellow-600 hover:text-yellow-900"
                                                        >
                                                            Desactivar
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleActivate(escola.id)}
                                                            className="text-green-600 hover:text-green-900"
                                                        >
                                                            Activar
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleBlockClick(escola)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Bloquear
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredEscolas.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            Nenhuma escola encontrada
                        </div>
                    )}
                </div>
            )}

            {/* Block Modal */}
            {showBlockModal && selectedEscola && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            Bloquear Escola
                        </h2>
                        <p className="text-gray-600 mb-4">
                            Escola: <strong>{selectedEscola.nome}</strong>
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Motivo do Bloqueio *
                            </label>
                            <textarea
                                value={blockReason}
                                onChange={(e) => setBlockReason(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleBlockSubmit}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Bloquear
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Status Badge Component
const StatusBadge: React.FC<{ escola: Escola }> = ({ escola }) => {
    if (escola.bloqueado) {
        return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                🚫 Bloqueada
            </span>
        )
    }
    if (escola.ativo) {
        return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                ✅ Activa
            </span>
        )
    }
    return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            ⏸️ Inactiva
        </span>
    )
}

// Filter Button Component
interface FilterButtonProps {
    label: string
    active: boolean
    onClick: () => void
    color?: 'blue' | 'green' | 'yellow' | 'red'
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, active, onClick, color = 'blue' }) => {
    const colorClasses = {
        blue: active ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border-gray-300',
        green: active ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border-gray-300',
        yellow: active ? 'bg-yellow-600 text-white' : 'bg-white text-gray-700 border-gray-300',
        red: active ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border-gray-300'
    }

    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 border rounded-lg transition-colors ${colorClasses[color]}`}
        >
            {label}
        </button>
    )
}
