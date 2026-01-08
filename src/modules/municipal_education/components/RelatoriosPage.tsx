/**
 * Relatórios Page - Consolidated reports for Municipal Education Direction
 */

import { useState, useEffect } from 'react';
import { useRelatoriosMunicipais } from '../hooks/useRelatoriosMunicipais';
import { exportRelatorio } from '../utils/exportRelatorio';

type TipoRelatorio = 'escolas' | 'aprovacao' | 'funcionarios' | 'solicitacoes';

interface RelatoriosPageProps {
    onNavigate?: (page: string, params?: Record<string, any>) => void;
}

// Card configurations with unique colors per report type
const REPORT_CARDS: Array<{
    tipo: TipoRelatorio;
    icon: string;
    label: string;
    desc: string;
    gradient: string;
    iconBg: string;
    buttonGradient: string;
    hoverGradient: string;
}> = [
        {
            tipo: 'escolas',
            icon: '🏫',
            label: 'Relatório de Escolas',
            desc: 'Estado e estatísticas das escolas',
            gradient: 'from-blue-500/10 via-blue-400/5 to-transparent',
            iconBg: 'from-blue-500 to-blue-600',
            buttonGradient: 'from-blue-500 to-blue-600',
            hoverGradient: 'hover:from-blue-600 hover:to-blue-700'
        },
        {
            tipo: 'aprovacao',
            icon: '📊',
            label: 'Aproveitamento Escolar',
            desc: 'Taxas de aprovação e médias',
            gradient: 'from-emerald-500/10 via-emerald-400/5 to-transparent',
            iconBg: 'from-emerald-500 to-emerald-600',
            buttonGradient: 'from-emerald-500 to-emerald-600',
            hoverGradient: 'hover:from-emerald-600 hover:to-emerald-700'
        },
        {
            tipo: 'funcionarios',
            icon: '👥',
            label: 'Funcionários',
            desc: 'Professores e administrativos',
            gradient: 'from-violet-500/10 via-violet-400/5 to-transparent',
            iconBg: 'from-violet-500 to-violet-600',
            buttonGradient: 'from-violet-500 to-violet-600',
            hoverGradient: 'hover:from-violet-600 hover:to-violet-700'
        },
        {
            tipo: 'solicitacoes',
            icon: '📋',
            label: 'Solicitações',
            desc: 'Pedidos de documentos',
            gradient: 'from-amber-500/10 via-amber-400/5 to-transparent',
            iconBg: 'from-amber-500 to-amber-600',
            buttonGradient: 'from-amber-500 to-amber-600',
            hoverGradient: 'hover:from-amber-600 hover:to-amber-700'
        }
    ];

export function RelatoriosPage({ onNavigate }: RelatoriosPageProps) {
    const { estatisticas, loading, error, relatorioActual, tipoRelatorioActual, loadEstatisticas, generateRelatorio, clearRelatorio } = useRelatoriosMunicipais();
    // Track which specific report type is being generated (null = none)
    const [generating, setGenerating] = useState<TipoRelatorio | null>(null);
    const [anoLectivo, setAnoLectivo] = useState('2025/2026');
    const [trimestre, setTrimestre] = useState<1 | 2 | 3 | undefined>(undefined);

    useEffect(() => { loadEstatisticas(); }, [loadEstatisticas]);

    const handleGenerate = async (tipo: TipoRelatorio) => {
        setGenerating(tipo);
        try { await generateRelatorio(tipo, { anoLectivo, trimestre }); }
        catch (err) { alert('Erro ao gerar relatório'); }
        finally { setGenerating(null); }
    };

    const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-AO');

    if (loading && !estatisticas) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

    return (
        <div className="space-y-6 pb-24 md:pb-6 animate-fade-in">
            {/* Modern Header with Gradient */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 rounded-2xl p-6 md:p-8 text-white shadow-xl">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                            <span className="text-3xl">📈</span>
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white drop-shadow-lg" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                Relatórios Municipais
                            </h1>
                            <p className="text-white/80 font-medium mt-1">
                                Relatórios consolidados do município
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {estatisticas && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl text-white"><div className="text-3xl font-bold">{estatisticas.total_escolas}</div><div className="text-blue-100">Escolas</div></div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl text-white"><div className="text-3xl font-bold">{estatisticas.total_alunos.toLocaleString()}</div><div className="text-purple-100">Alunos</div></div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl text-white"><div className="text-3xl font-bold">{estatisticas.total_professores}</div><div className="text-green-100">Professores</div></div>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-xl text-white"><div className="text-3xl font-bold">{estatisticas.taxa_aprovacao}%</div><div className="text-orange-100">Aprovação</div></div>
                </div>
            )}

            <div className="flex gap-4 bg-white p-4 rounded-xl shadow-sm border">
                <div><label className="block text-sm font-medium mb-1">Ano Lectivo</label><select value={anoLectivo} onChange={e => setAnoLectivo(e.target.value)} className="px-4 py-2 border rounded-lg"><option value="2023/2024">2023/2024</option><option value="2024/2025">2024/2025</option><option value="2025/2026">2025/2026</option><option value="2026/2027">2026/2027</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Trimestre</label><select value={trimestre || ''} onChange={e => setTrimestre(e.target.value ? parseInt(e.target.value) as 1 | 2 | 3 : undefined)} className="px-4 py-2 border rounded-lg"><option value="">Todos</option><option value="1">1º</option><option value="2">2º</option><option value="3">3º</option></select></div>
            </div>

            {/* Professional Report Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {REPORT_CARDS.map(r => {
                    const isGenerating = generating === r.tipo;
                    const isDisabled = generating !== null;

                    return (
                        <div
                            key={r.tipo}
                            className={`
                                group relative overflow-hidden bg-white rounded-2xl border border-gray-100
                                shadow-md hover:shadow-xl transition-all duration-300 ease-out
                                ${isGenerating ? 'ring-2 ring-offset-2 ring-blue-400' : ''}
                                hover:-translate-y-1
                            `}
                        >
                            {/* Gradient background accent */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${r.gradient} opacity-60`} />

                            {/* Decorative pattern */}
                            <div
                                className="absolute top-0 right-0 w-32 h-32 opacity-5"
                                style={{
                                    backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                                    backgroundSize: '8px 8px'
                                }}
                            />

                            <div className="relative p-5">
                                {/* Icon with gradient background */}
                                <div className={`
                                    w-14 h-14 rounded-xl bg-gradient-to-br ${r.iconBg}
                                    flex items-center justify-center mb-4
                                    shadow-lg shadow-${r.tipo === 'escolas' ? 'blue' : r.tipo === 'aprovacao' ? 'emerald' : r.tipo === 'funcionarios' ? 'violet' : 'amber'}-500/25
                                    group-hover:scale-110 transition-transform duration-300
                                `}>
                                    <span className="text-2xl filter drop-shadow-sm">{r.icon}</span>
                                </div>

                                {/* Title and description */}
                                <h3 className="font-bold text-gray-900 text-lg mb-1 tracking-tight">
                                    {r.label}
                                </h3>
                                <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                                    {r.desc}
                                </p>

                                {/* Generate button */}
                                <button
                                    onClick={() => handleGenerate(r.tipo)}
                                    disabled={isDisabled}
                                    className={`
                                        w-full px-4 py-3 rounded-xl font-semibold text-white text-sm
                                        bg-gradient-to-r ${r.buttonGradient} ${r.hoverGradient}
                                        shadow-md hover:shadow-lg
                                        transform transition-all duration-200 ease-out
                                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md
                                        ${!isDisabled ? 'hover:scale-[1.02] active:scale-[0.98]' : ''}
                                        flex items-center justify-center gap-2
                                    `}
                                >
                                    {isGenerating ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>A gerar...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>📄</span>
                                            <span>Gerar Relatório</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {relatorioActual && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-6 py-4 border-b flex justify-between items-center">
                        <div><h3 className="font-semibold">{relatorioActual.titulo}</h3><p className="text-sm text-gray-500">Gerado em {formatDate(relatorioActual.data_geracao)}</p></div>
                        <div className="flex gap-2">
                            <button onClick={clearRelatorio} className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors">✕ Fechar</button>
                            <div className="relative group">
                                <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md flex items-center gap-2">
                                    <span>📥</span>
                                    <span>Exportar</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                    <button
                                        onClick={() => tipoRelatorioActual && exportRelatorio(relatorioActual, tipoRelatorioActual, 'pdf')}
                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 rounded-t-lg"
                                    >
                                        <span className="text-red-500">📄</span> Exportar PDF
                                    </button>
                                    <button
                                        onClick={() => tipoRelatorioActual && exportRelatorio(relatorioActual, tipoRelatorioActual, 'csv')}
                                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 rounded-b-lg border-t"
                                    >
                                        <span className="text-green-500">📊</span> Exportar CSV
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        {tipoRelatorioActual === 'escolas' && relatorioActual.escolas && (
                            <div>
                                {/* Summary Cards with Gender Breakdown */}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200">
                                        <div className="text-2xl font-bold text-slate-700">{relatorioActual.resumo.total}</div>
                                        <div className="text-xs text-slate-500 font-medium">Total Escolas</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                                        <div className="text-2xl font-bold text-green-700">{relatorioActual.resumo.activas}</div>
                                        <div className="text-xs text-green-600 font-medium">Activas</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200">
                                        <div className="text-2xl font-bold text-yellow-700">{relatorioActual.resumo.suspensas}</div>
                                        <div className="text-xs text-yellow-600 font-medium">Suspensas</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
                                        <div className="text-2xl font-bold text-red-700">{relatorioActual.resumo.bloqueadas}</div>
                                        <div className="text-xs text-red-600 font-medium">Bloqueadas</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                                        <div className="text-2xl font-bold text-purple-700">{relatorioActual.resumo.total_alunos?.toLocaleString() || 0}</div>
                                        <div className="text-xs text-purple-600 font-medium">Total Alunos</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">👦</span>
                                            <div className="text-2xl font-bold text-blue-700">{relatorioActual.resumo.total_masculino?.toLocaleString() || 0}</div>
                                        </div>
                                        <div className="text-xs text-blue-600 font-medium">Masculino</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-xl border border-pink-200">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">👧</span>
                                            <div className="text-2xl font-bold text-pink-700">{relatorioActual.resumo.total_feminino?.toLocaleString() || 0}</div>
                                        </div>
                                        <div className="text-xs text-pink-600 font-medium">Feminino</div>
                                    </div>
                                </div>

                                {/* Enhanced Table */}
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Escola</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Turmas</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-blue-600 uppercase tracking-wider">
                                                    <span className="inline-flex items-center gap-1">👦 Masc.</span>
                                                </th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-pink-600 uppercase tracking-wider">
                                                    <span className="inline-flex items-center gap-1">👧 Fem.</span>
                                                </th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Média</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {relatorioActual.escolas.map((e: any, idx: number) => (
                                                <tr key={e.codigo} className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-900">{e.nome}</div>
                                                        <div className="text-xs text-gray-400">{e.codigo}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${e.estado === 'activa' ? 'bg-green-100 text-green-700' :
                                                            e.estado === 'suspensa' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {e.estado}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-gray-700 font-medium">{e.turmas}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="font-bold text-gray-900">{e.alunos}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 bg-blue-50 text-blue-700 rounded-lg font-semibold text-sm">
                                                            {e.alunos_masculino}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 bg-pink-50 text-pink-700 rounded-lg font-semibold text-sm">
                                                            {e.alunos_feminino}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`font-bold ${e.media >= 14 ? 'text-green-600' : e.media >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                            {e.media ? e.media.toFixed(1) : '-'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {tipoRelatorioActual === 'aprovacao' && relatorioActual.escolas && (
                            <div>
                                {/* Summary Cards with Gender and Approval Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                                        <div className="text-2xl font-bold text-purple-700">{relatorioActual.totais.total_alunos?.toLocaleString() || 0}</div>
                                        <div className="text-xs text-purple-600 font-medium">Total Alunos</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">👦</span>
                                            <div className="text-2xl font-bold text-blue-700">{relatorioActual.totais.total_masculino?.toLocaleString() || 0}</div>
                                        </div>
                                        <div className="text-xs text-blue-600 font-medium">Masculino</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-xl border border-pink-200">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">👧</span>
                                            <div className="text-2xl font-bold text-pink-700">{relatorioActual.totais.total_feminino?.toLocaleString() || 0}</div>
                                        </div>
                                        <div className="text-xs text-pink-600 font-medium">Feminino</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                                        <div className="text-2xl font-bold text-green-700">{relatorioActual.totais.total_aprovados?.toLocaleString() || 0}</div>
                                        <div className="text-xs text-green-600 font-medium">Aprovados</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
                                        <div className="text-2xl font-bold text-red-700">{relatorioActual.totais.total_reprovados?.toLocaleString() || 0}</div>
                                        <div className="text-xs text-red-600 font-medium">Reprovados</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200">
                                        <div className="text-2xl font-bold text-emerald-700">{relatorioActual.totais.taxa_aprovacao_media}%</div>
                                        <div className="text-xs text-emerald-600 font-medium">Taxa Média</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
                                        <div className="text-2xl font-bold text-indigo-700">{relatorioActual.totais.media_municipal}</div>
                                        <div className="text-xs text-indigo-600 font-medium">Média Municipal</div>
                                    </div>
                                </div>

                                {/* Enhanced Table */}
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-emerald-50 to-emerald-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Escola</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-blue-600 uppercase tracking-wider">
                                                    <span className="inline-flex items-center gap-1">👦 Masc.</span>
                                                </th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-pink-600 uppercase tracking-wider">
                                                    <span className="inline-flex items-center gap-1">👧 Fem.</span>
                                                </th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-green-600 uppercase tracking-wider">Aprovados</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">Reprov.</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Taxa</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Média</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {relatorioActual.escolas.map((e: any, idx: number) => (
                                                <tr key={idx} className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-900">{e.nome}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="font-bold text-gray-900">{e.total_alunos}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 bg-blue-50 text-blue-700 rounded-lg font-semibold text-sm">
                                                            {e.alunos_masculino || 0}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 bg-pink-50 text-pink-700 rounded-lg font-semibold text-sm">
                                                            {e.alunos_feminino || 0}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 bg-green-50 text-green-700 rounded-lg font-semibold text-sm">
                                                            {e.aprovados}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 bg-red-50 text-red-700 rounded-lg font-semibold text-sm">
                                                            {e.reprovados}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`font-bold ${e.taxa_aprovacao >= 70 ? 'text-green-600' : e.taxa_aprovacao >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                            {e.taxa_aprovacao}%
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`font-bold ${e.media >= 14 ? 'text-green-600' : e.media >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                            {e.media ? e.media.toFixed(1) : '-'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {tipoRelatorioActual === 'funcionarios' && relatorioActual.por_escola && (
                            <div><div className="grid grid-cols-4 gap-4 mb-6 text-center"><div className="bg-blue-50 p-3 rounded"><div className="font-bold text-blue-600">{relatorioActual.stats.total}</div><div className="text-xs">Total</div></div><div className="bg-purple-50 p-3 rounded"><div className="font-bold text-purple-600">{relatorioActual.stats.professores}</div><div className="text-xs">Professores</div></div><div className="bg-green-50 p-3 rounded"><div className="font-bold text-green-600">{relatorioActual.stats.secretarios}</div><div className="text-xs">Secretários</div></div><div className="bg-gray-50 p-3 rounded"><div className="font-bold">{relatorioActual.stats.activos}</div><div className="text-xs">Activos</div></div></div>
                                <table className="w-full"><thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Escola</th><th className="px-4 py-2 text-center">Prof.</th><th className="px-4 py-2 text-center">Sec.</th><th className="px-4 py-2 text-center">Total</th></tr></thead>
                                    <tbody>{relatorioActual.por_escola.map((e: any, i: number) => <tr key={i} className="border-t"><td className="px-4 py-2">{e.escola}</td><td className="px-4 py-2 text-center">{e.professores}</td><td className="px-4 py-2 text-center">{e.secretarios}</td><td className="px-4 py-2 text-center font-bold">{e.total}</td></tr>)}</tbody></table></div>
                        )}
                        {tipoRelatorioActual === 'solicitacoes' && relatorioActual.stats && (
                            <div className="grid grid-cols-2 gap-6"><div><h4 className="font-medium mb-3">Por Estado</h4><div className="space-y-2"><div className="flex justify-between"><span>Pendentes</span><span className="font-bold text-yellow-600">{relatorioActual.stats.pendentes}</span></div><div className="flex justify-between"><span>Em Análise</span><span className="font-bold text-blue-600">{relatorioActual.stats.em_analise}</span></div><div className="flex justify-between"><span>Aprovadas</span><span className="font-bold text-green-600">{relatorioActual.stats.aprovadas}</span></div><div className="flex justify-between"><span>Rejeitadas</span><span className="font-bold text-red-600">{relatorioActual.stats.rejeitadas}</span></div><div className="flex justify-between"><span>Concluídas</span><span className="font-bold text-gray-600">{relatorioActual.stats.concluidas}</span></div></div></div>
                                <div><h4 className="font-medium mb-3">Por Tipo</h4><div className="space-y-2">{relatorioActual.por_tipo?.map((t: any, i: number) => <div key={i} className="flex justify-between"><span>{t.tipo}</span><span className="font-bold">{t.contagem}</span></div>)}</div></div></div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default RelatoriosPage;
