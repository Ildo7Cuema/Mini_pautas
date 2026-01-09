/**
 * Provincial Reports Page
 * Generate and export consolidated reports
 */

import React, { useState } from 'react';
import { Icons } from '../../../components/ui/Icons';
import { useRelatoriosProvinciais } from '../hooks/useRelatoriosProvinciais';
import type { RelatorioConsolidadoProvincial } from '../types';

export const RelatoriosProvinciaisPage: React.FC = () => {
    const {
        loading,
        loadingExport,
        error,
        gerarRelatorioConsolidado,
        exportarRelatorioCSV,
        exportarRelatorioJSON
    } = useRelatoriosProvinciais();

    const [trimestre, setTrimestre] = useState<1 | 2 | 3 | undefined>(undefined);
    const [anoLectivo, setAnoLectivo] = useState(new Date().getFullYear().toString());
    const [relatorio, setRelatorio] = useState<RelatorioConsolidadoProvincial | null>(null);

    const handleGerarRelatorio = async () => {
        try {
            const dados = await gerarRelatorioConsolidado(anoLectivo, trimestre);
            setRelatorio(dados);
        } catch (err) {
            console.error('Error generating report:', err);
        }
    };

    const handleExportCSV = async () => {
        if (!relatorio) return;
        try {
            await exportarRelatorioCSV(relatorio);
        } catch (err) {
            console.error('Error exporting CSV:', err);
        }
    };

    const handleExportJSON = async () => {
        if (!relatorio) return;
        try {
            await exportarRelatorioJSON(relatorio);
        } catch (err) {
            console.error('Error exporting JSON:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Relatórios Consolidados</h1>
                <p className="text-gray-600 mt-1">Gere e exporte relatórios provinciais completos</p>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Icons.Calendar className="w-4 h-4 inline mr-1" />
                            Ano Lectivo
                        </label>
                        <select
                            value={anoLectivo}
                            onChange={(e) => setAnoLectivo(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Trimestre
                        </label>
                        <select
                            value={trimestre || ''}
                            onChange={(e) => setTrimestre(e.target.value ? Number(e.target.value) as 1 | 2 | 3 : undefined)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Todo o Ano</option>
                            <option value="1">1º Trimestre</option>
                            <option value="2">2º Trimestre</option>
                            <option value="3">3º Trimestre</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <button
                            onClick={handleGerarRelatorio}
                            disabled={loading}
                            className="w-full md:w-auto px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Icons.Refresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'A Gerar...' : 'Gerar Relatório'}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    <Icons.ExclamationCircle className="w-5 h-5 inline mr-2" />
                    {error}
                </div>
            )}

            {/* Report Display */}
            {relatorio && (
                <div className="space-y-6 animate-fade-in">
                    {/* Actions Bar */}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={handleExportCSV}
                            disabled={loadingExport}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm"
                        >
                            <Icons.FileSpreadsheet className="w-4 h-4" />
                            Exportar CSV
                        </button>
                        <button
                            onClick={handleExportJSON}
                            disabled={loadingExport}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 shadow-sm"
                        >
                            <Icons.FileJson className="w-4 h-4" />
                            Exportar JSON
                        </button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
                            <p className="text-gray-500 text-sm">Total de Escolas</p>
                            <p className="text-3xl font-bold text-gray-800">{relatorio.estatisticas_gerais.total_escolas}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-500">
                            <p className="text-gray-500 text-sm">Total de Alunos</p>
                            <p className="text-3xl font-bold text-gray-800">{relatorio.estatisticas_gerais.total_alunos.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
                            <p className="text-gray-500 text-sm">Total de Professores</p>
                            <p className="text-3xl font-bold text-gray-800">{relatorio.estatisticas_gerais.total_professores.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
                            <p className="text-gray-500 text-sm">Taxa Média Aprovação</p>
                            <p className="text-3xl font-bold text-green-600">{relatorio.estatisticas_gerais.taxa_aprovacao_media.toFixed(1)}%</p>
                        </div>
                    </div>

                    {/* Report Content - Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Municipalities Performance */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Icons.BarChart className="w-5 h-5 text-indigo-500" />
                                Desempenho por Município
                            </h3>
                            <div className="space-y-4">
                                {relatorio.dados_por_municipio.map(mun => (
                                    <div key={mun.municipio} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="font-semibold text-gray-800">{mun.municipio}</p>
                                            <p className="text-xs text-gray-500">{mun.total_alunos} alunos</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold ${mun.taxa_aprovacao >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                                                {mun.taxa_aprovacao.toFixed(1)}%
                                            </p>
                                            <p className="text-xs text-gray-400">Aprovação</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Problems distribution */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Icons.ExclamationCircle className="w-5 h-5 text-red-500" />
                                Alertas e Problemas
                            </h3>
                            <div className="space-y-4">
                                <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-100">
                                    <h4 className="font-semibold">Escolas Inactivas</h4>
                                    <p className="text-3xl font-bold mt-2">{relatorio.estatisticas_gerais.escolas_inactivas}</p>
                                </div>
                                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-100">
                                    <h4 className="font-semibold">Escolas Bloqueadas</h4>
                                    <p className="text-3xl font-bold mt-2">{relatorio.estatisticas_gerais.escolas_bloqueadas}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Generated At Footer */}
                    <div className="text-center text-sm text-gray-400 mt-8">
                        Relatório gerado em: {new Date(relatorio.data_geracao).toLocaleString('pt-AO')}
                    </div>
                </div>
            )}

            {!relatorio && !loading && (
                <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                    <Icons.DocumentText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-400">Nenhum relatório gerado</h3>
                    <p className="text-gray-400 mt-2">Seleccione as opções acima e clique em "Gerar Relatório"</p>
                </div>
            )}
        </div>
    );
};

export default RelatoriosProvinciaisPage;
