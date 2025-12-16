/**
 * @component SuperAdminAuditLog
 * @description Audit log viewer for SUPERADMIN actions
 */

import React, { useEffect, useState } from 'react'
import { fetchSuperAdminAuditLog } from '../utils/superadmin'
import type { SuperAdminAction } from '../types'

export const SuperAdminAuditLog: React.FC = () => {
    const [actions, setActions] = useState<SuperAdminAction[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filterType, setFilterType] = useState<string>('all')
    const [selectedAction, setSelectedAction] = useState<SuperAdminAction | null>(null)

    useEffect(() => {
        loadAuditLog()
    }, [filterType])

    const loadAuditLog = async () => {
        try {
            setLoading(true)
            setError(null)

            const filters: any = { limit: 100 }
            if (filterType !== 'all') {
                filters.actionType = filterType
            }

            const data = await fetchSuperAdminAuditLog(filters)
            setActions(data)
        } catch (err) {
            console.error('Error loading audit log:', err)
            setError('Erro ao carregar histórico de auditoria')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleString('pt-AO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getActionIcon = (actionType: string) => {
        const icons: Record<string, string> = {
            'ACTIVATE_ESCOLA': '✅',
            'DEACTIVATE_ESCOLA': '⏸️',
            'BLOCK_ESCOLA': '🚫',
            'UNBLOCK_ESCOLA': '🔓',
            'EDIT_ESCOLA': '✏️',
            'CREATE_ESCOLA': '➕',
            'DELETE_ESCOLA': '🗑️',
            'VIEW_ESCOLA_DATA': '👁️',
            'EDIT_SYSTEM_CONFIG': '⚙️',
            'CREATE_USER': '👤',
            'EDIT_USER': '✏️',
            'DELETE_USER': '🗑️',
            'EXPORT_DATA': '📥',
            'OTHER': '📝'
        }
        return icons[actionType] || '📝'
    }

    const getActionLabel = (actionType: string) => {
        const labels: Record<string, string> = {
            'ACTIVATE_ESCOLA': 'Activar Escola',
            'DEACTIVATE_ESCOLA': 'Desactivar Escola',
            'BLOCK_ESCOLA': 'Bloquear Escola',
            'UNBLOCK_ESCOLA': 'Desbloquear Escola',
            'EDIT_ESCOLA': 'Editar Escola',
            'CREATE_ESCOLA': 'Criar Escola',
            'DELETE_ESCOLA': 'Eliminar Escola',
            'VIEW_ESCOLA_DATA': 'Ver Dados da Escola',
            'EDIT_SYSTEM_CONFIG': 'Editar Configurações',
            'CREATE_USER': 'Criar Utilizador',
            'EDIT_USER': 'Editar Utilizador',
            'DELETE_USER': 'Eliminar Utilizador',
            'EXPORT_DATA': 'Exportar Dados',
            'OTHER': 'Outra Acção'
        }
        return labels[actionType] || actionType
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Auditoria do Sistema</h1>
                    <p className="text-gray-600 mt-1">Histórico de acções do SUPERADMIN</p>
                </div>
                <button
                    onClick={loadAuditLog}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    🔄 Actualizar
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex flex-wrap gap-2">
                    <FilterButton label="Todas" active={filterType === 'all'} onClick={() => setFilterType('all')} />
                    <FilterButton label="Activar" active={filterType === 'ACTIVATE_ESCOLA'} onClick={() => setFilterType('ACTIVATE_ESCOLA')} />
                    <FilterButton label="Desactivar" active={filterType === 'DEACTIVATE_ESCOLA'} onClick={() => setFilterType('DEACTIVATE_ESCOLA')} />
                    <FilterButton label="Bloquear" active={filterType === 'BLOCK_ESCOLA'} onClick={() => setFilterType('BLOCK_ESCOLA')} />
                    <FilterButton label="Desbloquear" active={filterType === 'UNBLOCK_ESCOLA'} onClick={() => setFilterType('UNBLOCK_ESCOLA')} />
                    <FilterButton label="Editar" active={filterType === 'EDIT_ESCOLA'} onClick={() => setFilterType('EDIT_ESCOLA')} />
                </div>
            </div>

            {/* Audit Log Table */}
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
                                        Data/Hora
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acção
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Detalhes
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        IP
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acções
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {actions.map((action) => (
                                    <tr key={action.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(action.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <span className="text-2xl mr-2">{getActionIcon(action.action_type)}</span>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {getActionLabel(action.action_type)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {action.action_details?.action || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {action.ip_address || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => setSelectedAction(action)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                Ver Detalhes
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {actions.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            Nenhuma acção registada
                        </div>
                    )}
                </div>
            )}

            {/* Details Modal */}
            {selectedAction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">
                                Detalhes da Acção
                            </h2>
                            <button
                                onClick={() => setSelectedAction(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tipo de Acção</label>
                                <p className="mt-1 text-sm text-gray-900">
                                    {getActionIcon(selectedAction.action_type)} {getActionLabel(selectedAction.action_type)}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Data/Hora</label>
                                <p className="mt-1 text-sm text-gray-900">{formatDate(selectedAction.created_at)}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Endereço IP</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedAction.ip_address || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">User Agent</label>
                                <p className="mt-1 text-sm text-gray-900 break-all">{selectedAction.user_agent || 'N/A'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Detalhes Completos</label>
                                <pre className="mt-1 text-xs bg-gray-50 p-4 rounded-lg overflow-x-auto">
                                    {JSON.stringify(selectedAction.action_details, null, 2)}
                                </pre>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={() => setSelectedAction(null)}
                                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Filter Button Component
interface FilterButtonProps {
    label: string
    active: boolean
    onClick: () => void
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, active, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 border rounded-lg transition-colors ${active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
        >
            {label}
        </button>
    )
}
