/**
 * Provincial Schools Overview Component
 * Read-only view of all schools in the province
 * Mobile-first design with cards, filter drawer, and full-screen modals
 */

import React, { useState, useEffect } from 'react';
import { Icons } from '../../../components/ui/Icons';
import { FilterDrawer } from '../../../components/ui/FilterDrawer';
import { useEscolasProvincial } from '../hooks/useEscolasProvincial';
import type { Escola } from '../../../types';
import { fetchEscolaDetalhesProvincial } from '../api/escolasProvincialQuery';

// Mobile-optimized modal
const Modal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            <div className="absolute inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-2xl md:w-full md:mx-4 md:max-h-[90vh] bg-white md:rounded-2xl shadow-2xl flex flex-col animate-slide-up">
                <div className="flex items-center justify-between px-4 py-4 md:px-6 border-b border-slate-100 flex-shrink-0">
                    <h2 className="text-lg md:text-xl font-semibold text-slate-900 truncate pr-2">{title}</h2>
                    <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                        <Icons.X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
            </div>
        </div>
    );
};

// School card for mobile
const SchoolCard: React.FC<{
    escola: Escola;
    onClick: () => void;
}> = ({ escola, onClick }) => {
    const getStatusStyle = () => {
        if (escola.bloqueado) return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', label: 'Bloqueada' };
        if (escola.ativo) return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Activa' };
        return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', label: 'Inactiva' };
    };
    const status = getStatusStyle();

    return (
        <button
            onClick={onClick}
            className="w-full bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 text-left transition-all hover:shadow-md active:scale-[0.98]"
        >
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                    <Icons.School className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-slate-900 truncate">{escola.nome}</h3>
                        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${status.bg} ${status.text} ${status.border}`}>
                            {status.label}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                        <Icons.LocationMarker className="w-4 h-4" />
                        <span className="truncate">{escola.municipio}</span>
                    </div>
                    {escola.codigo_escola && (
                        <p className="text-xs text-slate-400 mt-1">Código: {escola.codigo_escola}</p>
                    )}
                </div>
            </div>
        </button>
    );
};

// Stats bar
const StatsBar: React.FC<{
    total: number;
    activas: number;
    bloqueadas: number;
    inactivas: number;
}> = ({ total, activas, bloqueadas, inactivas }) => (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 sm:gap-3">
        {[
            { label: 'Total', value: total, color: 'text-slate-700', bg: 'bg-slate-100' },
            { label: 'Activas', value: activas, color: 'text-emerald-700', bg: 'bg-emerald-100' },
            { label: 'Bloqueadas', value: bloqueadas, color: 'text-amber-700', bg: 'bg-amber-100' },
            { label: 'Inactivas', value: inactivas, color: 'text-red-700', bg: 'bg-red-100' },
        ].map((stat) => (
            <div key={stat.label} className={`flex-shrink-0 ${stat.bg} rounded-xl px-4 py-3 min-w-[90px] sm:min-w-0`}>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
            </div>
        ))}
    </div>
);

export const EscolasProvincialOverview: React.FC = () => {
    const {
        escolas,
        escolasAgrupadas,
        loading,
        error,
        filtros,
        setFiltros,
        estatisticas,
        municipios
    } = useEscolasProvincial();

    const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedEscola, setSelectedEscola] = useState<Escola | null>(null);
    const [escolaDetalhes, setEscolaDetalhes] = useState<{
        escola: Escola;
        total_professores: number;
        total_turmas: number;
        total_alunos: number;
    } | null>(null);
    const [loadingDetalhes, setLoadingDetalhes] = useState(false);

    // Filter state
    const [filterValues, setFilterValues] = useState<Record<string, string | boolean | null>>({
        municipio: filtros.municipio || null,
        status: null,
    });

    const handleViewDetails = async (escola: Escola) => {
        setSelectedEscola(escola);
        setShowDetailsModal(true);
        setLoadingDetalhes(true);
        try {
            const detalhes = await fetchEscolaDetalhesProvincial(escola.id);
            setEscolaDetalhes(detalhes);
        } catch (err) {
            console.error('Error fetching school details:', err);
        } finally {
            setLoadingDetalhes(false);
        }
    };

    const handleApplyFilters = () => {
        const newFiltros = { ...filtros };

        if (filterValues.municipio) {
            newFiltros.municipio = filterValues.municipio as string;
        } else {
            newFiltros.municipio = undefined;
        }

        if (filterValues.status === 'activa') {
            newFiltros.ativo = true;
            newFiltros.bloqueado = false;
        } else if (filterValues.status === 'bloqueada') {
            newFiltros.bloqueado = true;
            newFiltros.ativo = undefined;
        } else if (filterValues.status === 'inactiva') {
            newFiltros.ativo = false;
            newFiltros.bloqueado = undefined;
        } else {
            newFiltros.ativo = undefined;
            newFiltros.bloqueado = undefined;
        }

        setFiltros(newFiltros);
    };

    const handleClearFilters = () => {
        setFilterValues({ municipio: null, status: null });
        setFiltros({ search: filtros.search });
    };

    const activeFiltersCount = [
        filtros.municipio,
        filtros.ativo !== undefined || filtros.bloqueado !== undefined
    ].filter(Boolean).length;

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
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Escolas</h1>
                        <p className="text-sm text-slate-500">Consulta (somente leitura)</p>
                    </div>
                    {/* Read-only indicator */}
                    <span className="flex-shrink-0 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                        <Icons.EyeOpen className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                        Leitura
                    </span>
                </div>
            </div>

            <div className="px-4 sm:px-6 pb-6 space-y-4">
                {/* Stats */}
                <StatsBar
                    total={estatisticas.total_escolas}
                    activas={estatisticas.escolas_activas}
                    bloqueadas={estatisticas.escolas_bloqueadas}
                    inactivas={estatisticas.escolas_inactivas}
                />

                {/* Search and filter bar */}
                <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm pb-3 -mx-4 px-4 pt-2 sm:mx-0 sm:px-0">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Icons.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Pesquisar escolas..."
                                value={filtros.search || ''}
                                onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
                                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-primary-500 min-h-[48px]"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilterDrawer(true)}
                            className="relative flex-shrink-0 p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
                        >
                            <Icons.Filter className="w-5 h-5 text-slate-600" />
                            {activeFiltersCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* View mode toggle */}
                    <div className="flex gap-2 mt-3">
                        {[
                            { id: 'list', label: 'Lista' },
                            { id: 'grouped', label: 'Por Município' },
                        ].map((mode) => (
                            <button
                                key={mode.id}
                                onClick={() => setViewMode(mode.id as any)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all min-h-[40px] ${viewMode === mode.id
                                        ? 'bg-primary-600 text-white shadow-sm'
                                        : 'bg-white text-slate-600 border border-slate-200'
                                    }`}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                        <Icons.ExclamationCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Content */}
                {viewMode === 'list' ? (
                    <>
                        {/* Mobile: Cards */}
                        <div className="space-y-3 md:hidden">
                            {escolas.map((escola) => (
                                <SchoolCard key={escola.id} escola={escola} onClick={() => handleViewDetails(escola)} />
                            ))}
                        </div>

                        {/* Desktop: Table */}
                        <div className="hidden md:block bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Escola</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Município</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Código</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Acções</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {escolas.map((escola) => (
                                        <tr key={escola.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                                                        <Icons.School className="w-4 h-4 text-indigo-600" />
                                                    </div>
                                                    <span className="font-medium text-slate-900">{escola.nome}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-slate-600">{escola.municipio}</td>
                                            <td className="px-5 py-4 text-slate-500">{escola.codigo_escola || '-'}</td>
                                            <td className="px-5 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${escola.bloqueado ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                        escola.ativo ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                            'bg-red-100 text-red-700 border-red-200'
                                                    }`}>
                                                    {escola.bloqueado ? 'Bloqueada' : escola.ativo ? 'Activa' : 'Inactiva'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <button
                                                    onClick={() => handleViewDetails(escola)}
                                                    className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                >
                                                    <Icons.EyeOpen className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    // Grouped view
                    <div className="space-y-4">
                        {escolasAgrupadas.map((grupo) => (
                            <div key={grupo.municipio} className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
                                <div className="bg-gradient-to-r from-primary-600 to-indigo-600 px-4 py-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-white">
                                            <Icons.Building className="w-5 h-5" />
                                            <h3 className="font-semibold">{grupo.municipio}</h3>
                                        </div>
                                        <div className="flex items-center gap-2 text-white/80 text-sm">
                                            <span>{grupo.total} escolas</span>
                                            <span>•</span>
                                            <span>{grupo.activas} activas</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {grupo.escolas.map((escola) => (
                                        <SchoolCard key={escola.id} escola={escola} onClick={() => handleViewDetails(escola)} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {escolas.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        <Icons.School className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p>Nenhuma escola encontrada</p>
                    </div>
                )}
            </div>

            {/* Filter Drawer */}
            <FilterDrawer
                isOpen={showFilterDrawer}
                onClose={() => setShowFilterDrawer(false)}
                title="Filtrar Escolas"
                filters={[
                    {
                        id: 'municipio',
                        label: 'Município',
                        value: filterValues.municipio,
                        options: [
                            { label: 'Todos', value: null },
                            ...municipios.map((m) => ({ label: m, value: m })),
                        ],
                    },
                    {
                        id: 'status',
                        label: 'Estado',
                        value: filterValues.status,
                        options: [
                            { label: 'Todos', value: null },
                            { label: 'Activas', value: 'activa' },
                            { label: 'Bloqueadas', value: 'bloqueada' },
                            { label: 'Inactivas', value: 'inactiva' },
                        ],
                    },
                ]}
                values={filterValues}
                onChange={(id, value) => setFilterValues({ ...filterValues, [id]: value })}
                onApply={handleApplyFilters}
                onClear={handleClearFilters}
            />

            {/* Details Modal */}
            <Modal
                isOpen={showDetailsModal}
                onClose={() => { setShowDetailsModal(false); setEscolaDetalhes(null); }}
                title={selectedEscola?.nome || ''}
            >
                {loadingDetalhes ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
                    </div>
                ) : escolaDetalhes ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Município', value: escolaDetalhes.escola.municipio },
                                { label: 'Província', value: escolaDetalhes.escola.provincia },
                                { label: 'Código', value: escolaDetalhes.escola.codigo_escola || 'N/A' },
                            ].map((item) => (
                                <div key={item.label}>
                                    <p className="text-sm text-slate-500 font-medium">{item.label}</p>
                                    <p className="text-slate-900">{item.value}</p>
                                </div>
                            ))}
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Estado</p>
                                <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-medium border ${escolaDetalhes.escola.bloqueado ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                        escolaDetalhes.escola.ativo ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                            'bg-red-100 text-red-700 border-red-200'
                                    }`}>
                                    {escolaDetalhes.escola.bloqueado ? 'Bloqueada' : escolaDetalhes.escola.ativo ? 'Activa' : 'Inactiva'}
                                </span>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <h3 className="font-semibold text-slate-900 mb-3">Estatísticas</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { icon: <Icons.Users className="w-5 h-5 text-blue-600" />, value: escolaDetalhes.total_professores, label: 'Professores', bg: 'bg-blue-50' },
                                    { icon: <Icons.AcademicCap className="w-5 h-5 text-emerald-600" />, value: escolaDetalhes.total_alunos, label: 'Alunos', bg: 'bg-emerald-50' },
                                    { icon: <Icons.Building className="w-5 h-5 text-purple-600" />, value: escolaDetalhes.total_turmas, label: 'Turmas', bg: 'bg-purple-50' },
                                ].map((stat) => (
                                    <div key={stat.label} className={`${stat.bg} rounded-xl p-3 text-center`}>
                                        <div className="flex justify-center mb-1">{stat.icon}</div>
                                        <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                                        <p className="text-xs text-slate-500">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                            <div className="flex items-start gap-2">
                                <Icons.Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <p>Esta é uma visão de consulta. A gestão desta escola é responsabilidade da Direção Municipal de {escolaDetalhes.escola.municipio}.</p>
                            </div>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
};

export default EscolasProvincialOverview;
