/**
 * Escolas Gestão Page
 * School management page for Municipal Education Direction
 */

import { useState } from 'react';
import { useEscolasManagement } from '../hooks/useEscolasManagement';
import type { Escola } from '../../../types';
import type { EstadoEscola } from '../types';

interface EscolasGestaoProps {
    onNavigate?: (page: string, params?: Record<string, any>) => void;
}

// Estado badge colors
const estadoColors: Record<EstadoEscola, { bg: string; text: string; label: string }> = {
    'activa': { bg: 'bg-green-100', text: 'text-green-800', label: 'Activa' },
    'suspensa': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Suspensa' },
    'bloqueada': { bg: 'bg-red-100', text: 'text-red-800', label: 'Bloqueada' },
    'inactiva': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inactiva' }
};

export function EscolasGestao({ onNavigate }: EscolasGestaoProps) {
    const {
        escolas,
        loading,
        error,
        historico,
        estatisticasEstados,
        selectedEscola,
        selectedEscolaDetalhes,
        refresh,
        selectEscola,
        loadEscolaDetalhes,
        loadHistoricoEscola,
        alterarEstado,
        getEstado
    } = useEscolasManagement();

    const [showModal, setShowModal] = useState(false);
    const [showHistorico, setShowHistorico] = useState(false);
    const [novoEstado, setNovoEstado] = useState<EstadoEscola>('activa');
    const [motivo, setMotivo] = useState('');
    const [saving, setSaving] = useState(false);
    const [filtroEstado, setFiltroEstado] = useState<EstadoEscola | 'todas'>('todas');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter escolas
    const escolasFiltradas = escolas.filter(escola => {
        const matchesEstado = filtroEstado === 'todas' || getEstado(escola) === filtroEstado;
        const matchesSearch = escola.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
            escola.codigo_escola.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesEstado && matchesSearch;
    });

    const handleAlterarEstado = async () => {
        if (!selectedEscola || !motivo.trim()) return;

        setSaving(true);
        try {
            await alterarEstado(selectedEscola.id, novoEstado, motivo);
            setShowModal(false);
            setMotivo('');
        } catch (err) {
            alert('Erro ao alterar estado: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
        } finally {
            setSaving(false);
        }
    };

    const handleSelectEscola = async (escola: Escola) => {
        selectEscola(escola);
        await loadEscolaDetalhes(escola.id);
    };

    const handleShowHistorico = async (escola: Escola) => {
        selectEscola(escola);
        await loadHistoricoEscola(escola.id);
        setShowHistorico(true);
    };

    const openAlterarEstado = (escola: Escola) => {
        selectEscola(escola);
        setNovoEstado(getEstado(escola));
        setShowModal(true);
    };

    if (loading && escolas.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestão de Escolas</h1>
                    <p className="text-gray-500 mt-1">
                        Gerir o estado administrativo das escolas do município
                    </p>
                </div>
                <button
                    onClick={refresh}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    🔄 Actualizar
                </button>
            </div>

            {/* Stats Cards */}
            {estatisticasEstados && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-2xl font-bold text-gray-900">{estatisticasEstados.total}</div>
                        <div className="text-sm text-gray-500">Total de Escolas</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                        <div className="text-2xl font-bold text-green-600">{estatisticasEstados.activas}</div>
                        <div className="text-sm text-green-600">Activas</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-yellow-100">
                        <div className="text-2xl font-bold text-yellow-600">{estatisticasEstados.suspensas}</div>
                        <div className="text-sm text-yellow-600">Suspensas</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100">
                        <div className="text-2xl font-bold text-red-600">{estatisticasEstados.bloqueadas}</div>
                        <div className="text-sm text-red-600">Bloqueadas</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-2xl font-bold text-gray-500">{estatisticasEstados.inactivas}</div>
                        <div className="text-sm text-gray-500">Inactivas</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="🔍 Pesquisar escola..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFiltroEstado('todas')}
                        className={`px-4 py-2 rounded-lg ${filtroEstado === 'todas' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                        Todas
                    </button>
                    {(['activa', 'suspensa', 'bloqueada', 'inactiva'] as EstadoEscola[]).map(estado => (
                        <button
                            key={estado}
                            onClick={() => setFiltroEstado(estado)}
                            className={`px-4 py-2 rounded-lg ${filtroEstado === estado ? estadoColors[estado].bg + ' ' + estadoColors[estado].text : 'bg-gray-100 text-gray-700'}`}
                        >
                            {estadoColors[estado].label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Schools List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Escola</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acções</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {escolasFiltradas.map(escola => {
                            const estado = getEstado(escola);
                            const colors = estadoColors[estado];
                            return (
                                <tr key={escola.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{escola.nome}</div>
                                        <div className="text-sm text-gray-500">{escola.endereco}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{escola.codigo_escola}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                                            {colors.label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{escola.telefone || '-'}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button
                                            onClick={() => handleSelectEscola(escola)}
                                            className="text-blue-600 hover:text-blue-800"
                                            title="Ver detalhes"
                                        >
                                            👁️
                                        </button>
                                        <button
                                            onClick={() => handleShowHistorico(escola)}
                                            className="text-purple-600 hover:text-purple-800"
                                            title="Ver histórico"
                                        >
                                            📋
                                        </button>
                                        <button
                                            onClick={() => openAlterarEstado(escola)}
                                            className="text-orange-600 hover:text-orange-800"
                                            title="Alterar estado"
                                        >
                                            ⚙️
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {escolasFiltradas.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        Nenhuma escola encontrada
                    </div>
                )}
            </div>

            {/* Recent History */}
            {!showHistorico && historico.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">📜 Histórico Recente</h3>
                    <div className="space-y-3">
                        {historico.slice(0, 5).map(item => (
                            <div key={item.id} className="flex items-center gap-4 text-sm">
                                <div className="text-gray-400">
                                    {new Date(item.created_at).toLocaleDateString('pt-AO')}
                                </div>
                                <div className="flex-1">
                                    <span className="font-medium">{item.escola?.nome}</span>
                                    <span className="text-gray-500"> alterado de </span>
                                    <span className={estadoColors[item.estado_anterior as EstadoEscola || 'activa'].text}>
                                        {item.estado_anterior || 'N/A'}
                                    </span>
                                    <span className="text-gray-500"> para </span>
                                    <span className={estadoColors[item.estado_novo as EstadoEscola].text}>
                                        {item.estado_novo}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Alterar Estado Modal */}
            {showModal && selectedEscola && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Alterar Estado da Escola</h3>
                        <p className="text-gray-600 mb-4">{selectedEscola.nome}</p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Novo Estado</label>
                            <select
                                value={novoEstado}
                                onChange={e => setNovoEstado(e.target.value as EstadoEscola)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="activa">✅ Activa</option>
                                <option value="suspensa">⚠️ Suspensa</option>
                                <option value="bloqueada">🚫 Bloqueada</option>
                                <option value="inactiva">⭕ Inactiva</option>
                            </select>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Motivo *</label>
                            <textarea
                                value={motivo}
                                onChange={e => setMotivo(e.target.value)}
                                placeholder="Descreva o motivo da alteração..."
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAlterarEstado}
                                disabled={saving || !motivo.trim()}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? 'A guardar...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Histórico Modal */}
            {showHistorico && selectedEscola && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Histórico Administrativo</h3>
                            <button onClick={() => setShowHistorico(false)} className="text-gray-500 hover:text-gray-700">
                                ✕
                            </button>
                        </div>
                        <p className="text-gray-600 mb-4">{selectedEscola.nome}</p>

                        <div className="space-y-4">
                            {historico.map(item => (
                                <div key={item.id} className="border border-gray-100 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className={`px-2 py-1 rounded text-xs ${estadoColors[item.estado_anterior as EstadoEscola || 'activa'].bg}`}>
                                                {item.estado_anterior || 'N/A'}
                                            </span>
                                            <span className="mx-2">→</span>
                                            <span className={`px-2 py-1 rounded text-xs ${estadoColors[item.estado_novo as EstadoEscola].bg}`}>
                                                {item.estado_novo}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {new Date(item.created_at).toLocaleString('pt-AO')}
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-700">{item.motivo}</p>
                                    {item.observacoes && (
                                        <p className="text-sm text-gray-500 mt-1">{item.observacoes}</p>
                                    )}
                                </div>
                            ))}
                            {historico.length === 0 && (
                                <p className="text-gray-500 text-center py-8">Nenhum histórico registado</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EscolasGestao;
