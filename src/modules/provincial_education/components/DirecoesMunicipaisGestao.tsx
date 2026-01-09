/**
 * Municipal Directorates Management Component
 * For provincial-level management of municipal directorates
 */

import React, { useState } from 'react';
import { Icons } from '../../../components/ui/Icons';
import { useDirecoesMunicipais } from '../hooks/useDirecoesMunicipais';
import type {
    DirecaoMunicipalResumida,
    DirecaoMunicipalDetalhes,
    HistoricoAdministrativoDirecaoMunicipal
} from '../types';

// Modal Component
const Modal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <Icons.X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const DirecoesMunicipaisGestao: React.FC = () => {
    const {
        direcoes,
        loading,
        error,
        refresh,
        fetchDetalhes,
        suspender,
        reativar,
        fetchHistorico,
        estatisticas
    } = useDirecoesMunicipais();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterActivo, setFilterActivo] = useState<boolean | null>(null);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    // Modals
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedDirecao, setSelectedDirecao] = useState<DirecaoMunicipalResumida | null>(null);
    const [direcaoDetalhes, setDirecaoDetalhes] = useState<DirecaoMunicipalDetalhes | null>(null);
    const [historico, setHistorico] = useState<HistoricoAdministrativoDirecaoMunicipal[]>([]);
    const [suspensionMotivo, setSuspensionMotivo] = useState('');
    const [suspensionObservacoes, setSuspensionObservacoes] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Filter directions
    const filteredDirecoes = direcoes.filter(d => {
        const matchesSearch = searchTerm === '' ||
            d.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.municipio.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filterActivo === null || d.ativo === filterActivo;

        return matchesSearch && matchesFilter;
    });

    // Handlers
    const handleViewDetails = async (direcao: DirecaoMunicipalResumida) => {
        setSelectedDirecao(direcao);
        setShowDetailsModal(true);
        const detalhes = await fetchDetalhes(direcao.id);
        setDirecaoDetalhes(detalhes);
    };

    const handleViewHistory = async (direcao: DirecaoMunicipalResumida) => {
        setSelectedDirecao(direcao);
        const hist = await fetchHistorico(direcao.id);
        setHistorico(hist);
        setShowHistoryModal(true);
    };

    const handleOpenSuspend = (direcao: DirecaoMunicipalResumida) => {
        setSelectedDirecao(direcao);
        setSuspensionMotivo('');
        setSuspensionObservacoes('');
        setShowSuspendModal(true);
    };

    const handleSuspend = async () => {
        if (!selectedDirecao || !suspensionMotivo) return;

        try {
            setActionLoading(true);
            await suspender(selectedDirecao.id, suspensionMotivo, suspensionObservacoes);
            setShowSuspendModal(false);
            setSelectedDirecao(null);
        } catch (err) {
            console.error('Error suspending:', err);
            alert('Erro ao suspender direção municipal');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReactivate = async (direcao: DirecaoMunicipalResumida) => {
        if (!confirm(`Tem certeza que deseja reativar a direção municipal de ${direcao.municipio}?`)) return;

        try {
            setActionLoading(true);
            await reativar(direcao.id, 'Reativação manual');
        } catch (err) {
            console.error('Error reactivating:', err);
            alert('Erro ao reativar direção municipal');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">
                    Gestão de Direções Municipais
                </h1>
                <p className="text-gray-600 mt-1">
                    Supervisione e gerencie as direções municipais da sua província
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-2xl font-bold text-gray-800">{estatisticas.total}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500">Activas</p>
                    <p className="text-2xl font-bold text-green-600">{estatisticas.activas}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500">Suspensas</p>
                    <p className="text-2xl font-bold text-yellow-600">{estatisticas.suspensas}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500">Inactivas</p>
                    <p className="text-2xl font-bold text-red-600">{estatisticas.inactivas}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Pesquisar por nome, município ou email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Filter Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                        >
                            <Icons.Filter className="w-4 h-4" />
                            Estado
                            <Icons.ChevronDown className="w-4 h-4" />
                        </button>
                        {showFilterDropdown && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                                <button
                                    onClick={() => { setFilterActivo(null); setShowFilterDropdown(false); }}
                                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${filterActivo === null ? 'bg-indigo-50' : ''}`}
                                >
                                    Todas
                                </button>
                                <button
                                    onClick={() => { setFilterActivo(true); setShowFilterDropdown(false); }}
                                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${filterActivo === true ? 'bg-indigo-50' : ''}`}
                                >
                                    Activas
                                </button>
                                <button
                                    onClick={() => { setFilterActivo(false); setShowFilterDropdown(false); }}
                                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${filterActivo === false ? 'bg-indigo-50' : ''}`}
                                >
                                    Inactivas
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    <Icons.ExclamationCircle className="w-5 h-5 inline mr-2" />
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Município
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Director
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Contacto
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Escolas
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Estado
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Acções
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredDirecoes.map(direcao => (
                            <tr key={direcao.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <Icons.Building className="w-5 h-5 text-gray-400 mr-3" />
                                        <div className="font-medium text-gray-900">{direcao.municipio}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-gray-900">{direcao.nome}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-gray-900">{direcao.email}</div>
                                    {direcao.telefone && (
                                        <div className="text-gray-500 text-sm">{direcao.telefone}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                                    {direcao.escolas_count}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${direcao.ativo
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}>
                                        {direcao.ativo ? 'Activa' : 'Inactiva'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleViewDetails(direcao)}
                                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                            title="Ver detalhes"
                                        >
                                            <Icons.EyeOpen className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleViewHistory(direcao)}
                                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                            title="Ver histórico"
                                        >
                                            <Icons.History className="w-4 h-4" />
                                        </button>
                                        {direcao.ativo ? (
                                            <button
                                                onClick={() => handleOpenSuspend(direcao)}
                                                className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                                                title="Suspender"
                                            >
                                                <Icons.Pause className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleReactivate(direcao)}
                                                disabled={actionLoading}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                                                title="Reativar"
                                            >
                                                <Icons.Play className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredDirecoes.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        Nenhuma direção municipal encontrada
                    </div>
                )}
            </div>

            {/* Details Modal */}
            <Modal
                isOpen={showDetailsModal}
                onClose={() => { setShowDetailsModal(false); setDirecaoDetalhes(null); }}
                title={`Detalhes - ${selectedDirecao?.municipio || ''}`}
            >
                {direcaoDetalhes ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Município</p>
                                <p className="font-medium">{direcaoDetalhes.municipio}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Província</p>
                                <p className="font-medium">{direcaoDetalhes.provincia}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Director</p>
                                <p className="font-medium">{direcaoDetalhes.nome}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Cargo</p>
                                <p className="font-medium">{direcaoDetalhes.cargo || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium">{direcaoDetalhes.email}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Telefone</p>
                                <p className="font-medium">{direcaoDetalhes.telefone || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="font-semibold text-gray-800 mb-3">Estatísticas</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <Icons.School className="w-6 h-6 mx-auto text-blue-600 mb-2" />
                                    <p className="text-2xl font-bold text-gray-800">{direcaoDetalhes.total_escolas}</p>
                                    <p className="text-sm text-gray-500">Escolas</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <Icons.Users className="w-6 h-6 mx-auto text-purple-600 mb-2" />
                                    <p className="text-2xl font-bold text-gray-800">{direcaoDetalhes.total_professores}</p>
                                    <p className="text-sm text-gray-500">Professores</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <Icons.AcademicCap className="w-6 h-6 mx-auto text-green-600 mb-2" />
                                    <p className="text-2xl font-bold text-gray-800">{direcaoDetalhes.total_alunos}</p>
                                    <p className="text-sm text-gray-500">Alunos</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                )}
            </Modal>

            {/* Suspend Modal */}
            <Modal
                isOpen={showSuspendModal}
                onClose={() => setShowSuspendModal(false)}
                title="Suspender Direção Municipal"
            >
                <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-800">
                            Está prestes a suspender a direção municipal de <strong>{selectedDirecao?.municipio}</strong>.
                            Esta acção será registada no histórico administrativo.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Motivo da suspensão *
                        </label>
                        <input
                            type="text"
                            value={suspensionMotivo}
                            onChange={(e) => setSuspensionMotivo(e.target.value)}
                            placeholder="Indique o motivo..."
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Observações (opcional)
                        </label>
                        <textarea
                            value={suspensionObservacoes}
                            onChange={(e) => setSuspensionObservacoes(e.target.value)}
                            placeholder="Observações adicionais..."
                            rows={3}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={() => setShowSuspendModal(false)}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSuspend}
                            disabled={actionLoading || !suspensionMotivo}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                        >
                            {actionLoading ? 'A suspender...' : 'Suspender'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* History Modal */}
            <Modal
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                title={`Histórico - ${selectedDirecao?.municipio || ''}`}
            >
                {historico.length > 0 ? (
                    <div className="space-y-4">
                        {historico.map(entry => (
                            <div key={entry.id} className="border-l-4 border-indigo-400 pl-4 py-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${entry.estado_novo === 'activa' ? 'bg-green-100 text-green-800' :
                                            entry.estado_novo === 'suspensa' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                            {entry.estado_anterior || 'N/A'} → {entry.estado_novo}
                                        </span>
                                    </div>
                                    <span className="text-sm text-gray-500">
                                        {new Date(entry.created_at).toLocaleDateString('pt-AO')}
                                    </span>
                                </div>
                                {entry.motivo && (
                                    <p className="text-gray-700 mt-1">{entry.motivo}</p>
                                )}
                                {entry.observacoes && (
                                    <p className="text-gray-500 text-sm mt-1">{entry.observacoes}</p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        Nenhum histórico registado
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default DirecoesMunicipaisGestao;
