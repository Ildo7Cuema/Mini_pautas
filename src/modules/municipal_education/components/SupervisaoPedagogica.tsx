/**
 * Supervisão Pedagógica Page
 * READ-ONLY view of grades and attendance for supervision
 */

import { useState } from 'react';
import { usePedagogicData } from '../hooks/usePedagogicData';
import type { IndicadoresPedagogicos } from '../types';

interface SupervisaoPedagogicaProps {
    onNavigate?: (page: string, params?: Record<string, any>) => void;
}

export function SupervisaoPedagogica({ onNavigate }: SupervisaoPedagogicaProps) {
    const {
        indicadores,
        loading,
        error,
        pautas,
        estatisticasConsolidadas,
        anoLectivo,
        trimestre,
        setAnoLectivo,
        setTrimestre,
        refresh,
        loadPautasEscola
    } = usePedagogicData();

    const [selectedEscola, setSelectedEscola] = useState<IndicadoresPedagogicos | null>(null);
    const [showPautas, setShowPautas] = useState(false);
    const [expandedPauta, setExpandedPauta] = useState<string | null>(null);

    const handleSelectEscola = async (indicador: IndicadoresPedagogicos) => {
        setSelectedEscola(indicador);
        await loadPautasEscola(indicador.escola_id);
        setShowPautas(true);
    };

    const getClassificacaoColor = (nota: number | null) => {
        if (nota === null) return 'text-gray-400';
        if (nota >= 17) return 'text-green-600';
        if (nota >= 14) return 'text-blue-600';
        if (nota >= 10) return 'text-yellow-600';
        return 'text-red-600';
    };

    if (loading && indicadores.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 md:pb-6 animate-fade-in">
            {/* Modern Header with Gradient */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 rounded-2xl p-6 md:p-8 text-white shadow-xl">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                                <span className="text-3xl">📊</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white drop-shadow-lg" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                        Supervisão Pedagógica
                                    </h1>
                                    <span className="px-3 py-1 bg-white/20 text-white text-xs font-medium rounded-full backdrop-blur-sm">
                                        🔒 LEITURA
                                    </span>
                                </div>
                                <p className="text-white/80 font-medium">
                                    Visualização de pautas e indicadores das escolas
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={refresh}
                            className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all font-medium backdrop-blur-sm border border-white/20 flex items-center gap-2"
                        >
                            🔄 Actualizar
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Ano Lectivo</label>
                        <select
                            value={anoLectivo}
                            onChange={e => setAnoLectivo(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 transition-colors"
                        >
                            <option value="2023/2024">2023/2024</option>
                            <option value="2024/2025">2024/2025</option>
                            <option value="2025/2026">2025/2026</option>
                            <option value="2026/2027">2026/2027</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Trimestre</label>
                        <select
                            value={trimestre || ''}
                            onChange={e => setTrimestre(e.target.value ? parseInt(e.target.value) as 1 | 2 | 3 : undefined)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 transition-colors"
                        >
                            <option value="">Todos</option>
                            <option value="1">1º Trimestre</option>
                            <option value="2">2º Trimestre</option>
                            <option value="3">3º Trimestre</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Consolidated Stats */}
            {estatisticasConsolidadas && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl text-white">
                        <div className="text-3xl font-bold">{estatisticasConsolidadas.total_escolas}</div>
                        <div className="text-blue-100">Escolas</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl text-white">
                        <div className="text-3xl font-bold">{estatisticasConsolidadas.total_alunos.toLocaleString()}</div>
                        <div className="text-purple-100">Alunos</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl text-white">
                        <div className="text-3xl font-bold">{estatisticasConsolidadas.media_municipal}</div>
                        <div className="text-green-100">Média Municipal</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-xl text-white">
                        <div className="text-3xl font-bold">{estatisticasConsolidadas.taxa_aprovacao_municipal}%</div>
                        <div className="text-orange-100">Taxa Aprovação</div>
                    </div>
                </div>
            )}

            {/* Best/Worst Schools */}
            {estatisticasConsolidadas && (estatisticasConsolidadas.melhor_escola || estatisticasConsolidadas.pior_escola) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {estatisticasConsolidadas.melhor_escola && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">🏆</span>
                                <span className="font-semibold text-green-800">Melhor Desempenho</span>
                            </div>
                            <div className="text-lg font-medium text-gray-900">{estatisticasConsolidadas.melhor_escola.nome}</div>
                            <div className="text-green-600 font-bold">Média: {estatisticasConsolidadas.melhor_escola.media}</div>
                        </div>
                    )}
                    {estatisticasConsolidadas.pior_escola && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-red-200">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">⚠️</span>
                                <span className="font-semibold text-red-800">Requer Atenção</span>
                            </div>
                            <div className="text-lg font-medium text-gray-900">{estatisticasConsolidadas.pior_escola.nome}</div>
                            <div className="text-red-600 font-bold">Média: {estatisticasConsolidadas.pior_escola.media}</div>
                        </div>
                    )}
                </div>
            )}

            {/* Schools Indicators Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">📊 Indicadores por Escola</h3>
                </div>
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Escola</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Turmas</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Alunos</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Média</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aprovação</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Classificações</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acções</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {indicadores.map(indicador => (
                            <tr key={indicador.escola_id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{indicador.escola_nome}</div>
                                </td>
                                <td className="px-6 py-4 text-center text-gray-600">{indicador.total_turmas}</td>
                                <td className="px-6 py-4 text-center text-gray-600">{indicador.total_alunos}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`font-bold ${getClassificacaoColor(indicador.media_geral)}`}>
                                        {indicador.media_geral || '-'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`font-bold ${indicador.taxa_aprovacao >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                        {indicador.taxa_aprovacao}%
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-1 justify-center">
                                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded" title="Excelente">
                                            {indicador.notas_por_classificacao.excelente}
                                        </span>
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded" title="Bom">
                                            {indicador.notas_por_classificacao.bom}
                                        </span>
                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded" title="Suficiente">
                                            {indicador.notas_por_classificacao.suficiente}
                                        </span>
                                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded" title="Insuficiente">
                                            {indicador.notas_por_classificacao.insuficiente}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleSelectEscola(indicador)}
                                        className="text-blue-600 hover:text-blue-800"
                                        title="Ver pautas"
                                    >
                                        📋 Ver Pautas
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {indicadores.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        Nenhum indicador disponível
                    </div>
                )}
            </div>

            {/* Pautas Modal */}
            {showPautas && selectedEscola && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[85vh] overflow-auto">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-semibold">Pautas - {selectedEscola.escola_nome}</h3>
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                    🔒 Apenas Leitura
                                </span>
                            </div>
                            <button onClick={() => setShowPautas(false)} className="text-gray-500 hover:text-gray-700">
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            {pautas.map(pauta => (
                                <div key={`${pauta.turma_id}-${pauta.disciplina_id}`} className="border border-gray-200 rounded-lg">
                                    <div
                                        className="px-4 py-3 bg-gray-50 flex justify-between items-center cursor-pointer"
                                        onClick={() => setExpandedPauta(
                                            expandedPauta === `${pauta.turma_id}-${pauta.disciplina_id}`
                                                ? null
                                                : `${pauta.turma_id}-${pauta.disciplina_id}`
                                        )}
                                    >
                                        <div>
                                            <span className="font-medium">{pauta.turma_nome}</span>
                                            <span className="text-gray-500"> - </span>
                                            <span className="text-gray-600">{pauta.disciplina_nome}</span>
                                            <span className="text-gray-400 text-sm ml-2">({pauta.professor_nome})</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`font-bold ${getClassificacaoColor(pauta.estatisticas.media)}`}>
                                                Média: {pauta.estatisticas.media}
                                            </span>
                                            <span className="text-green-600">✓ {pauta.estatisticas.aprovados}</span>
                                            <span className="text-red-600">✗ {pauta.estatisticas.reprovados}</span>
                                            <span className="text-gray-400">
                                                {expandedPauta === `${pauta.turma_id}-${pauta.disciplina_id}` ? '▼' : '▶'}
                                            </span>
                                        </div>
                                    </div>

                                    {expandedPauta === `${pauta.turma_id}-${pauta.disciplina_id}` && (
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nº Processo</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nome</th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Nota Final</th>
                                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Classificação</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {pauta.alunos.map(aluno => (
                                                    <tr key={aluno.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-2 text-sm text-gray-600">{aluno.numero_processo}</td>
                                                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{aluno.nome}</td>
                                                        <td className={`px-4 py-2 text-center font-bold ${getClassificacaoColor(aluno.nota_final)}`}>
                                                            {aluno.nota_final ?? '-'}
                                                        </td>
                                                        <td className="px-4 py-2 text-center text-sm text-gray-600">
                                                            {aluno.classificacao || '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            ))}
                            {pautas.length === 0 && (
                                <p className="text-gray-500 text-center py-8">Nenhuma pauta disponível</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SupervisaoPedagogica;
