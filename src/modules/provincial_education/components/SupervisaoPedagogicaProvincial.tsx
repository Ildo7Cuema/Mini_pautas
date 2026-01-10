/**
 * Provincial Pedagogic Supervision Component
 * Display pedagogic indicators and comparisons between municipalities
 * Mobile-first design with simplified indicators and vertical lists
 */

import React, { useState } from 'react';
import { Icons } from '../../../components/ui/Icons';
import { usePedagogicDataProvincial } from '../hooks/usePedagogicDataProvincial';

// Classification card
const ClassificationCard: React.FC<{
    label: string;
    range: string;
    value: number;
    color: 'green' | 'blue' | 'yellow' | 'red';
}> = ({ label, range, value, color }) => {
    const colorStyles = {
        green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        yellow: 'bg-amber-50 border-amber-200 text-amber-700',
        red: 'bg-red-50 border-red-200 text-red-700',
    };

    const textColors = {
        green: 'text-emerald-600',
        blue: 'text-blue-600',
        yellow: 'text-amber-600',
        red: 'text-red-600',
    };

    return (
        <div className={`rounded-xl border p-3 sm:p-4 ${colorStyles[color]}`}>
            <p className="text-xs font-medium opacity-80">{range}</p>
            <p className={`text-2xl sm:text-3xl font-bold ${textColors[color]}`}>{value}</p>
            <p className="text-xs font-medium mt-0.5">{label}</p>
        </div>
    );
};

// Ranking item
const RankingItem: React.FC<{
    rank: number;
    municipio: string;
    escolas: number;
    alunos: number;
    media: number;
}> = ({ rank, municipio, escolas, alunos, media }) => {
    const getRankStyle = () => {
        if (rank === 1) return 'bg-amber-100 text-amber-700';
        if (rank === 2) return 'bg-slate-200 text-slate-600';
        if (rank === 3) return 'bg-orange-100 text-orange-700';
        return 'bg-slate-100 text-slate-500';
    };

    return (
        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200/60 shadow-sm">
            <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm ${getRankStyle()}`}>
                {rank}
            </span>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{municipio}</p>
                <p className="text-xs text-slate-500">{escolas} escolas • {alunos.toLocaleString()} alunos</p>
            </div>
            <span className="text-lg font-bold text-primary-600">{media.toFixed(1)}</span>
        </div>
    );
};

// Approval rate item
const ApprovalItem: React.FC<{
    municipio: string;
    taxa: number;
}> = ({ municipio, taxa }) => {
    const getColor = () => {
        if (taxa >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
        if (taxa >= 60) return { bar: 'bg-amber-500', text: 'text-amber-600' };
        return { bar: 'bg-red-500', text: 'text-red-600' };
    };

    const colors = getColor();

    return (
        <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-900 truncate">{municipio}</span>
                <span className={`font-bold ${colors.text}`}>{taxa.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                    className={`h-2 rounded-full ${colors.bar} transition-all duration-500`}
                    style={{ width: `${Math.min(taxa, 100)}%` }}
                />
            </div>
        </div>
    );
};

// Municipality card for detailed view
const MunicipalityCard: React.FC<{
    municipio: string;
    total_escolas: number;
    escolas_activas: number;
    total_professores: number;
    total_alunos: number;
    total_turmas: number;
    media_geral: number;
    taxa_aprovacao: number;
}> = ({ municipio, total_escolas, escolas_activas, total_professores, total_alunos, total_turmas, media_geral, taxa_aprovacao }) => (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
                    <Icons.LocationMarker className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{municipio}</h3>
                    <p className="text-xs text-slate-500">{escolas_activas}/{total_escolas} escolas activas</p>
                </div>
                <div className="text-right">
                    <p className={`text-lg font-bold ${media_geral >= 14 ? 'text-emerald-600' : media_geral >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
                        {media_geral.toFixed(1)}
                    </p>
                    <p className="text-xs text-slate-500">média</p>
                </div>
            </div>
        </div>
        <div className="grid grid-cols-4 divide-x divide-slate-100 text-center">
            <div className="py-3">
                <p className="text-lg font-bold text-slate-900">{total_professores}</p>
                <p className="text-xs text-slate-500">Prof.</p>
            </div>
            <div className="py-3">
                <p className="text-lg font-bold text-slate-900">{total_alunos.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Alunos</p>
            </div>
            <div className="py-3">
                <p className="text-lg font-bold text-slate-900">{total_turmas}</p>
                <p className="text-xs text-slate-500">Turmas</p>
            </div>
            <div className="py-3">
                <p className={`text-lg font-bold ${taxa_aprovacao >= 80 ? 'text-emerald-600' : taxa_aprovacao >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                    {taxa_aprovacao.toFixed(0)}%
                </p>
                <p className="text-xs text-slate-500">Aprov.</p>
            </div>
        </div>
    </div>
);

export const SupervisaoPedagogicaProvincial: React.FC = () => {
    const {
        indicadores,
        indicadoresPorMunicipio,
        comparativo,
        taxaAprovacao,
        loading,
        error,
        refresh,
        trimestre,
        setTrimestre
    } = usePedagogicDataProvincial();

    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'ranking' | 'aprovacao' | 'detalhes'>('ranking');

    const handleRefresh = async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
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
            <div className="px-4 pt-4 pb-3 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                            Supervisão Pedagógica
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Indicadores por município
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Trimester filter */}
                        <select
                            value={trimestre || ''}
                            onChange={(e) => setTrimestre(e.target.value ? Number(e.target.value) as 1 | 2 | 3 : undefined)}
                            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        >
                            <option value="">Todos</option>
                            <option value="1">1º Trim.</option>
                            <option value="2">2º Trim.</option>
                            <option value="3">3º Trim.</option>
                        </select>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-2.5 bg-primary-600 text-white rounded-xl shadow-sm hover:bg-primary-700 active:scale-95 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                            <Icons.Refresh className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-4 sm:px-6 pb-6 space-y-5">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                        <Icons.ExclamationCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Key Indicators - 2x2 grid */}
                {indicadores && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                                    <Icons.BarChart className="w-4 h-4 text-blue-600" />
                                </div>
                            </div>
                            <p className="text-2xl sm:text-3xl font-bold text-slate-900">{indicadores.media_geral.toFixed(1)}</p>
                            <p className="text-xs text-slate-500 font-medium">Média Geral</p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
                                    <Icons.TrendingUp className="w-4 h-4 text-emerald-600" />
                                </div>
                            </div>
                            <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{indicadores.taxa_aprovacao.toFixed(1)}%</p>
                            <p className="text-xs text-slate-500 font-medium">Aprovação</p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
                                    <Icons.AcademicCap className="w-4 h-4 text-purple-600" />
                                </div>
                            </div>
                            <p className="text-2xl sm:text-3xl font-bold text-slate-900">{indicadores.total_alunos.toLocaleString()}</p>
                            <p className="text-xs text-slate-500 font-medium">Alunos</p>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
                                    <Icons.Award className="w-4 h-4 text-orange-600" />
                                </div>
                            </div>
                            <p className="text-2xl sm:text-3xl font-bold text-slate-900">{indicadores.total_escolas}</p>
                            <p className="text-xs text-slate-500 font-medium">Escolas</p>
                        </div>
                    </div>
                )}

                {/* Classification Distribution */}
                {indicadores && (
                    <div>
                        <h2 className="text-base font-semibold text-slate-900 mb-3">Distribuição por Classificação</h2>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <ClassificationCard
                                label="Excelente"
                                range="17-20"
                                value={indicadores.notas_por_classificacao.excelente}
                                color="green"
                            />
                            <ClassificationCard
                                label="Bom"
                                range="14-16"
                                value={indicadores.notas_por_classificacao.bom}
                                color="blue"
                            />
                            <ClassificationCard
                                label="Suficiente"
                                range="10-13"
                                value={indicadores.notas_por_classificacao.suficiente}
                                color="yellow"
                            />
                            <ClassificationCard
                                label="Insuficiente"
                                range="<10"
                                value={indicadores.notas_por_classificacao.insuficiente}
                                color="red"
                            />
                        </div>
                    </div>
                )}

                {/* Tabs for mobile */}
                <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 lg:hidden">
                    {[
                        { id: 'ranking', label: 'Ranking', icon: <Icons.Award className="w-4 h-4" /> },
                        { id: 'aprovacao', label: 'Aprovação', icon: <Icons.TrendingUp className="w-4 h-4" /> },
                        { id: 'detalhes', label: 'Detalhes', icon: <Icons.ClipboardList className="w-4 h-4" /> },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all min-h-[44px]
                                ${activeTab === tab.id
                                    ? 'bg-primary-600 text-white shadow-sm'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }
                            `}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Mobile: Tab content */}
                <div className="lg:hidden">
                    {activeTab === 'ranking' && (
                        <div className="space-y-3">
                            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                <Icons.Award className="w-5 h-5 text-amber-500" />
                                Ranking de Municípios
                            </h2>
                            {comparativo.slice(0, 10).map((item) => (
                                <RankingItem
                                    key={item.municipio}
                                    rank={item.ranking}
                                    municipio={item.municipio}
                                    escolas={item.total_escolas}
                                    alunos={item.total_alunos}
                                    media={item.media_aprovacao}
                                />
                            ))}
                        </div>
                    )}

                    {activeTab === 'aprovacao' && (
                        <div className="space-y-3">
                            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                <Icons.TrendingUp className="w-5 h-5 text-emerald-500" />
                                Taxa de Aprovação
                            </h2>
                            {taxaAprovacao.slice(0, 10).map((item) => (
                                <ApprovalItem
                                    key={item.municipio}
                                    municipio={item.municipio}
                                    taxa={item.taxa_aprovacao}
                                />
                            ))}
                        </div>
                    )}

                    {activeTab === 'detalhes' && (
                        <div className="space-y-3">
                            <h2 className="text-base font-semibold text-slate-900">Detalhes por Município</h2>
                            {indicadoresPorMunicipio.map((ind) => (
                                <MunicipalityCard key={ind.municipio} {...ind} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Desktop: Side by side */}
                <div className="hidden lg:grid lg:grid-cols-2 gap-6">
                    {/* Ranking */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-5">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Icons.Award className="w-5 h-5 text-amber-500" />
                            Ranking de Municípios
                        </h2>
                        <div className="space-y-2">
                            {comparativo.slice(0, 10).map((item) => (
                                <RankingItem
                                    key={item.municipio}
                                    rank={item.ranking}
                                    municipio={item.municipio}
                                    escolas={item.total_escolas}
                                    alunos={item.total_alunos}
                                    media={item.media_aprovacao}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Approval */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-5">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Icons.TrendingUp className="w-5 h-5 text-emerald-500" />
                            Taxa de Aprovação
                        </h2>
                        <div className="space-y-2">
                            {taxaAprovacao.slice(0, 10).map((item) => (
                                <ApprovalItem
                                    key={item.municipio}
                                    municipio={item.municipio}
                                    taxa={item.taxa_aprovacao}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Desktop: Detailed table */}
                <div className="hidden lg:block bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <h2 className="text-lg font-semibold text-slate-900">Indicadores por Município</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Município</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Escolas</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Professores</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Alunos</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Turmas</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Média</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Aprovação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {indicadoresPorMunicipio.map((ind) => (
                                    <tr key={ind.municipio} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4 font-medium text-slate-900">{ind.municipio}</td>
                                        <td className="px-5 py-4 text-slate-600">
                                            {ind.total_escolas}
                                            <span className="text-slate-400 text-sm"> ({ind.escolas_activas})</span>
                                        </td>
                                        <td className="px-5 py-4 text-slate-600">{ind.total_professores}</td>
                                        <td className="px-5 py-4 text-slate-600">{ind.total_alunos.toLocaleString()}</td>
                                        <td className="px-5 py-4 text-slate-600">{ind.total_turmas}</td>
                                        <td className="px-5 py-4">
                                            <span className={`font-bold ${ind.media_geral >= 14 ? 'text-emerald-600' : ind.media_geral >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
                                                {ind.media_geral.toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ind.taxa_aprovacao >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                                    ind.taxa_aprovacao >= 60 ? 'bg-amber-100 text-amber-700' :
                                                        'bg-red-100 text-red-700'
                                                }`}>
                                                {ind.taxa_aprovacao.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupervisaoPedagogicaProvincial;
