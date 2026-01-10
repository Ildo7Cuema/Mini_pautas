/**
 * Provincial Reports Page
 * Generate and export consolidated reports
 * Mobile-first design with summarized view and clear export feedback
 */

import React, { useState } from 'react';
import { Icons } from '../../../components/ui/Icons';
import { useRelatoriosProvinciais } from '../hooks/useRelatoriosProvinciais';
import type { RelatorioConsolidadoProvincia } from '../types';

// Report card for municipalities
const MunicipioCard: React.FC<{
    municipio: string;
    total_alunos: number;
    taxa_aprovacao: number;
}> = ({ municipio, total_alunos, taxa_aprovacao }) => (
    <div className="bg-white rounded-xl border border-slate-200/60 p-4">
        <div className="flex items-center justify-between">
            <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">{municipio}</p>
                <p className="text-sm text-slate-500">{total_alunos.toLocaleString()} alunos</p>
            </div>
            <div className="text-right">
                <p className={`text-xl font-bold ${taxa_aprovacao >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {taxa_aprovacao.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-400">aprovação</p>
            </div>
        </div>
    </div>
);

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
    const [relatorio, setRelatorio] = useState<RelatorioConsolidadoProvincia | null>(null);
    const [exportSuccess, setExportSuccess] = useState<string | null>(null);

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
            setExportSuccess('CSV exportado com sucesso!');
            setTimeout(() => setExportSuccess(null), 3000);
        } catch (err) {
            console.error('Error exporting CSV:', err);
        }
    };

    const handleExportJSON = async () => {
        if (!relatorio) return;
        try {
            await exportarRelatorioJSON(relatorio);
            setExportSuccess('JSON exportado com sucesso!');
            setTimeout(() => setExportSuccess(null), 3000);
        } catch (err) {
            console.error('Error exporting JSON:', err);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="px-4 pt-4 pb-2 sm:px-6">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Relatórios</h1>
                <p className="text-sm text-slate-500">Gere relatórios consolidados</p>
            </div>

            <div className="px-4 sm:px-6 pb-6 space-y-4">
                {/* Controls */}
                <div className="bg-white rounded-2xl border border-slate-200/60 p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">
                                Ano Lectivo
                            </label>
                            <select
                                value={anoLectivo}
                                onChange={(e) => setAnoLectivo(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                            >
                                <option value="">Todos</option>
                                <option value="2024">2024</option>
                                <option value="2024/2025">2024/2025</option>
                                <option value="2025">2025</option>
                                <option value="2025/2026">2025/2026</option>
                                <option value="2026">2026</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">
                                Trimestre
                            </label>
                            <select
                                value={trimestre || ''}
                                onChange={(e) => setTrimestre(e.target.value ? Number(e.target.value) as 1 | 2 | 3 : undefined)}
                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                            >
                                <option value="">Todo o Ano</option>
                                <option value="1">1º Trimestre</option>
                                <option value="2">2º Trimestre</option>
                                <option value="3">3º Trimestre</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleGerarRelatorio}
                        disabled={loading}
                        className="w-full py-3.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[48px] shadow-sm"
                    >
                        <Icons.Refresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'A gerar...' : 'Gerar Relatório'}
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                        <Icons.ExclamationCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Export success toast */}
                {exportSuccess && (
                    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-slide-up z-50">
                        <Icons.CheckCircle className="w-5 h-5" />
                        {exportSuccess}
                    </div>
                )}

                {/* Report Display */}
                {relatorio && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Export actions - sticky on mobile */}
                        <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm py-3 -mx-4 px-4 sm:mx-0 sm:px-0 sm:static sm:bg-transparent">
                            <div className="flex gap-2">
                                <button
                                    onClick={handleExportCSV}
                                    disabled={loadingExport}
                                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[44px] shadow-sm disabled:opacity-50"
                                >
                                    <Icons.FileSpreadsheet className="w-4 h-4" />
                                    CSV
                                </button>
                                <button
                                    onClick={handleExportJSON}
                                    disabled={loadingExport}
                                    className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[44px] shadow-sm disabled:opacity-50"
                                >
                                    <Icons.FileJson className="w-4 h-4" />
                                    JSON
                                </button>
                            </div>
                        </div>

                        {/* Summary Cards - 2x2 grid on mobile */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                                <p className="text-xs text-slate-500 font-medium">Escolas</p>
                                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{relatorio.estatisticas_gerais.total_escolas}</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                                <p className="text-xs text-slate-500 font-medium">Alunos</p>
                                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{relatorio.estatisticas_gerais.total_alunos.toLocaleString()}</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                                <p className="text-xs text-slate-500 font-medium">Professores</p>
                                <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{relatorio.estatisticas_gerais.total_professores.toLocaleString()}</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                                <p className="text-xs text-slate-500 font-medium">Aprovação</p>
                                <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">{relatorio.estatisticas_gerais.taxa_aprovacao_media.toFixed(1)}%</p>
                            </div>
                        </div>

                        {/* Municipality Performance - vertical list on mobile */}
                        <div>
                            <h2 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <Icons.BarChart className="w-5 h-5 text-primary-600" />
                                Por Município
                            </h2>
                            <div className="space-y-3">
                                {relatorio.dados_por_municipio.map(mun => (
                                    <MunicipioCard
                                        key={mun.municipio}
                                        municipio={mun.municipio}
                                        total_alunos={mun.total_alunos}
                                        taxa_aprovacao={mun.taxa_aprovacao}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Alerts section - compact cards */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                                <p className="text-xs font-medium text-red-700">Inactivas</p>
                                <p className="text-2xl font-bold text-red-700 mt-1">{relatorio.estatisticas_gerais.escolas_inactivas}</p>
                            </div>
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                <p className="text-xs font-medium text-amber-700">Bloqueadas</p>
                                <p className="text-2xl font-bold text-amber-700 mt-1">{relatorio.estatisticas_gerais.escolas_bloqueadas}</p>
                            </div>
                        </div>

                        {/* Generated footer */}
                        <p className="text-center text-xs text-slate-400 pt-4">
                            Gerado em {new Date(relatorio.data_geracao).toLocaleString('pt-AO')}
                        </p>
                    </div>
                )}

                {/* Empty state */}
                {!relatorio && !loading && (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/60">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Icons.DocumentText className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-500">Nenhum relatório</h3>
                        <p className="text-sm text-slate-400 mt-1">Seleccione as opções e gere o relatório</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RelatoriosProvinciaisPage;
