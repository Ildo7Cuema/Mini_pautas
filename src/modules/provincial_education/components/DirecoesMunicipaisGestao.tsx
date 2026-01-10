/**
 * Municipal Directorates Management Component
 * For provincial-level management of municipal directorates
 * Mobile-first design with cards, bottom sheet actions, and full-screen modals
 */

import React, { useState, useEffect } from 'react';
import { Icons } from '../../../components/ui/Icons';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { useDirecoesMunicipais } from '../hooks/useDirecoesMunicipais';
import type {
    DirecaoMunicipalResumida,
    DirecaoMunicipalDetalhes,
    HistoricoAdministrativoDirecaoMunicipal
} from '../types';

// Mobile-optimized modal with full-screen on mobile
const Modal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal - Full screen on mobile, centered on desktop */}
            <div className="absolute inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-2xl md:w-full md:mx-4 md:max-h-[90vh] bg-white md:rounded-2xl shadow-2xl flex flex-col animate-slide-up md:animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-4 md:px-6 border-b border-slate-100 flex-shrink-0">
                    <h2 className="text-lg md:text-xl font-semibold text-slate-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                        <Icons.X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

// Search and filter bar
const SearchFilterBar: React.FC<{
    searchTerm: string;
    onSearchChange: (value: string) => void;
    filterActivo: boolean | null;
    onFilterChange: (value: boolean | null) => void;
}> = ({ searchTerm, onSearchChange, filterActivo, onFilterChange }) => (
    <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm pb-4 -mx-4 px-4 pt-4 md:mx-0 md:px-0">
        {/* Search */}
        <div className="relative mb-3">
            <Icons.Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
                type="text"
                placeholder="Pesquisar direção..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all min-h-[48px]"
            />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
            {[
                { label: 'Todas', value: null },
                { label: 'Activas', value: true },
                { label: 'Inactivas', value: false },
            ].map((filter) => (
                <button
                    key={String(filter.value)}
                    onClick={() => onFilterChange(filter.value)}
                    className={`
                        px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all min-h-[36px]
                        ${filterActivo === filter.value
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }
                    `}
                >
                    {filter.label}
                </button>
            ))}
        </div>
    </div>
);

// Direction card for mobile
const DirectionCard: React.FC<{
    direcao: DirecaoMunicipalResumida;
    onOpenActions: () => void;
}> = ({ direcao, onOpenActions }) => (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-4">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                    <Icons.Building className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-slate-900 truncate">{direcao.municipio}</h3>
                        <span className={`
                            flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border
                            ${direcao.ativo
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-red-100 text-red-700 border-red-200'
                            }
                        `}>
                            {direcao.ativo ? 'Activa' : 'Inactiva'}
                        </span>
                    </div>
                    <p className="text-sm text-slate-600 truncate mt-0.5">{direcao.nome}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                            <Icons.School className="w-4 h-4" />
                            {direcao.escolas_count} escolas
                        </span>
                        {direcao.telefone && (
                            <span className="flex items-center gap-1">
                                <Icons.Phone className="w-4 h-4" />
                                {direcao.telefone}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Actions footer */}
        <div className="flex items-center border-t border-slate-100">
            <button
                onClick={onOpenActions}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors min-h-[48px]"
            >
                <Icons.EyeOpen className="w-4 h-4" />
                Ver Opções
            </button>
        </div>
    </div>
);

// Stats bar
const StatsBar: React.FC<{
    total: number;
    activas: number;
    suspensas: number;
    inactivas: number;
}> = ({ total, activas, suspensas, inactivas }) => (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:gap-4">
        {[
            { label: 'Total', value: total, color: 'text-slate-700', bg: 'bg-slate-100' },
            { label: 'Activas', value: activas, color: 'text-emerald-700', bg: 'bg-emerald-100' },
            { label: 'Suspensas', value: suspensas, color: 'text-amber-700', bg: 'bg-amber-100' },
            { label: 'Inactivas', value: inactivas, color: 'text-red-700', bg: 'bg-red-100' },
        ].map((stat) => (
            <div key={stat.label} className={`flex-shrink-0 ${stat.bg} rounded-xl px-4 py-3 min-w-[100px] md:min-w-0`}>
                <p className={`text-xl md:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
            </div>
        ))}
    </div>
);

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

    // Bottom sheet for actions
    const [showActionsSheet, setShowActionsSheet] = useState(false);
    const [selectedDirecao, setSelectedDirecao] = useState<DirecaoMunicipalResumida | null>(null);

    // Modals
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
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
    const handleOpenActions = (direcao: DirecaoMunicipalResumida) => {
        setSelectedDirecao(direcao);
        setShowActionsSheet(true);
    };

    const handleViewDetails = async () => {
        if (!selectedDirecao) return;
        setShowActionsSheet(false);
        setShowDetailsModal(true);
        const detalhes = await fetchDetalhes(selectedDirecao.id);
        setDirecaoDetalhes(detalhes);
    };

    const handleViewHistory = async () => {
        if (!selectedDirecao) return;
        setShowActionsSheet(false);
        const hist = await fetchHistorico(selectedDirecao.id);
        setHistorico(hist);
        setShowHistoryModal(true);
    };

    const handleOpenSuspend = () => {
        setShowActionsSheet(false);
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

    const handleReactivate = async () => {
        if (!selectedDirecao) return;
        setShowActionsSheet(false);

        if (!confirm(`Tem certeza que deseja reativar a direção municipal de ${selectedDirecao.municipio}?`)) return;

        try {
            setActionLoading(true);
            await reativar(selectedDirecao.id, 'Reativação manual');
        } catch (err) {
            console.error('Error reactivating:', err);
            alert('Erro ao reativar direção municipal');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="px-4 pt-4 pb-2 sm:px-6">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                    Direções Municipais
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    Gerencie as direções da sua província
                </p>
            </div>

            <div className="px-4 sm:px-6 space-y-4">
                {/* Stats */}
                <StatsBar
                    total={estatisticas.total}
                    activas={estatisticas.activas}
                    suspensas={estatisticas.suspensas}
                    inactivas={estatisticas.inactivas}
                />

                {/* Search and Filters */}
                <SearchFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    filterActivo={filterActivo}
                    onFilterChange={setFilterActivo}
                />

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                        <Icons.ExclamationCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Mobile: Cards */}
                <div className="space-y-3 md:hidden pb-6">
                    {filteredDirecoes.map(direcao => (
                        <DirectionCard
                            key={direcao.id}
                            direcao={direcao}
                            onOpenActions={() => handleOpenActions(direcao)}
                        />
                    ))}
                    {filteredDirecoes.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            <Icons.Building className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p>Nenhuma direção encontrada</p>
                        </div>
                    )}
                </div>

                {/* Desktop: Table */}
                <div className="hidden md:block bg-white rounded-2xl border border-slate-200/60 overflow-hidden mb-6">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Município
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Director
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Contacto
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Escolas
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Acções
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {filteredDirecoes.map(direcao => (
                                <tr key={direcao.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                                                <Icons.Building className="w-4 h-4 text-indigo-600" />
                                            </div>
                                            <span className="font-medium text-slate-900">{direcao.municipio}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-slate-700">
                                        {direcao.nome}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <div>
                                            <p className="text-slate-700">{direcao.email}</p>
                                            {direcao.telefone && (
                                                <p className="text-sm text-slate-400">{direcao.telefone}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-slate-700">
                                        {direcao.escolas_count}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <span className={`
                                            inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                                            ${direcao.ativo
                                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                : 'bg-red-100 text-red-700 border-red-200'
                                            }
                                        `}>
                                            {direcao.ativo ? 'Activa' : 'Inactiva'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    setSelectedDirecao(direcao);
                                                    handleViewDetails();
                                                }}
                                                className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                title="Ver detalhes"
                                            >
                                                <Icons.EyeOpen className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    setSelectedDirecao(direcao);
                                                    const hist = await fetchHistorico(direcao.id);
                                                    setHistorico(hist);
                                                    setShowHistoryModal(true);
                                                }}
                                                className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                title="Ver histórico"
                                            >
                                                <Icons.History className="w-4 h-4" />
                                            </button>
                                            {direcao.ativo ? (
                                                <button
                                                    onClick={() => {
                                                        setSelectedDirecao(direcao);
                                                        handleOpenSuspend();
                                                    }}
                                                    className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                    title="Suspender"
                                                >
                                                    <Icons.Pause className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={async () => {
                                                        setSelectedDirecao(direcao);
                                                        if (!confirm(`Reativar a direção de ${direcao.municipio}?`)) return;
                                                        await reativar(direcao.id, 'Reativação manual');
                                                    }}
                                                    disabled={actionLoading}
                                                    className="p-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
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
                        <div className="text-center py-12 text-slate-500">
                            Nenhuma direção municipal encontrada
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Sheet for Actions (Mobile) */}
            <BottomSheet
                isOpen={showActionsSheet}
                onClose={() => setShowActionsSheet(false)}
                title={selectedDirecao?.municipio}
                actions={[
                    {
                        label: 'Ver Detalhes',
                        icon: <Icons.EyeOpen className="w-5 h-5" />,
                        onClick: handleViewDetails,
                        description: 'Informações completas da direção',
                    },
                    {
                        label: 'Ver Histórico',
                        icon: <Icons.History className="w-5 h-5" />,
                        onClick: handleViewHistory,
                        description: 'Histórico de alterações',
                    },
                    ...(selectedDirecao?.ativo ? [{
                        label: 'Suspender Direção',
                        icon: <Icons.Pause className="w-5 h-5" />,
                        onClick: handleOpenSuspend,
                        variant: 'danger' as const,
                        description: 'Suspender temporariamente',
                    }] : [{
                        label: 'Reativar Direção',
                        icon: <Icons.Play className="w-5 h-5" />,
                        onClick: handleReactivate,
                        variant: 'success' as const,
                        description: 'Restaurar funcionamento',
                    }]),
                ]}
            />

            {/* Details Modal */}
            <Modal
                isOpen={showDetailsModal}
                onClose={() => { setShowDetailsModal(false); setDirecaoDetalhes(null); }}
                title={`Detalhes - ${selectedDirecao?.municipio || ''}`}
            >
                {direcaoDetalhes ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { label: 'Município', value: direcaoDetalhes.municipio },
                                { label: 'Província', value: direcaoDetalhes.provincia },
                                { label: 'Director', value: direcaoDetalhes.nome },
                                { label: 'Cargo', value: direcaoDetalhes.cargo || 'N/A' },
                                { label: 'Email', value: direcaoDetalhes.email },
                                { label: 'Telefone', value: direcaoDetalhes.telefone || 'N/A' },
                            ].map((item) => (
                                <div key={item.label}>
                                    <p className="text-sm text-slate-500 font-medium">{item.label}</p>
                                    <p className="text-slate-900 mt-0.5">{item.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <h3 className="font-semibold text-slate-900 mb-3">Estatísticas</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { icon: <Icons.School className="w-5 h-5 text-blue-600" />, value: direcaoDetalhes.total_escolas, label: 'Escolas', bg: 'bg-blue-50' },
                                    { icon: <Icons.Users className="w-5 h-5 text-purple-600" />, value: direcaoDetalhes.total_professores, label: 'Professores', bg: 'bg-purple-50' },
                                    { icon: <Icons.AcademicCap className="w-5 h-5 text-emerald-600" />, value: direcaoDetalhes.total_alunos, label: 'Alunos', bg: 'bg-emerald-50' },
                                ].map((stat) => (
                                    <div key={stat.label} className={`${stat.bg} rounded-xl p-3 text-center`}>
                                        <div className="flex justify-center mb-1">{stat.icon}</div>
                                        <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                                        <p className="text-xs text-slate-500">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
                    </div>
                )}
            </Modal>

            {/* Suspend Modal */}
            <Modal
                isOpen={showSuspendModal}
                onClose={() => setShowSuspendModal(false)}
                title="Suspender Direção"
            >
                <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-amber-800 text-sm">
                            Está prestes a suspender a direção municipal de <strong>{selectedDirecao?.municipio}</strong>.
                            Esta acção será registada no histórico.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Motivo da suspensão *
                        </label>
                        <input
                            type="text"
                            value={suspensionMotivo}
                            onChange={(e) => setSuspensionMotivo(e.target.value)}
                            placeholder="Indique o motivo..."
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[48px]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Observações (opcional)
                        </label>
                        <textarea
                            value={suspensionObservacoes}
                            onChange={(e) => setSuspensionObservacoes(e.target.value)}
                            placeholder="Observações adicionais..."
                            rows={3}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                            onClick={() => setShowSuspendModal(false)}
                            className="flex-1 py-3 text-slate-700 bg-slate-100 rounded-xl font-medium hover:bg-slate-200 transition-colors min-h-[48px]"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSuspend}
                            disabled={actionLoading || !suspensionMotivo}
                            className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors min-h-[48px]"
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
                            <div key={entry.id} className="border-l-4 border-primary-400 pl-4 py-2">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className={`
                                        px-2.5 py-1 text-xs font-medium rounded-full
                                        ${entry.estado_novo === 'activa' ? 'bg-emerald-100 text-emerald-700' :
                                            entry.estado_novo === 'suspensa' ? 'bg-amber-100 text-amber-700' :
                                                'bg-red-100 text-red-700'
                                        }
                                    `}>
                                        {entry.estado_anterior || 'N/A'} → {entry.estado_novo}
                                    </span>
                                    <span className="text-sm text-slate-500">
                                        {new Date(entry.created_at).toLocaleDateString('pt-AO')}
                                    </span>
                                </div>
                                {entry.motivo && (
                                    <p className="text-slate-700 mt-2 text-sm">{entry.motivo}</p>
                                )}
                                {entry.observacoes && (
                                    <p className="text-slate-500 text-sm mt-1">{entry.observacoes}</p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500">
                        <Icons.History className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p>Nenhum histórico registado</p>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default DirecoesMunicipaisGestao;
