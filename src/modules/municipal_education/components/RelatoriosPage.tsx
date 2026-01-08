/**
 * Relatórios Page - Consolidated reports for Municipal Education Direction
 */

import { useState, useEffect } from 'react';
import { useRelatoriosMunicipais } from '../hooks/useRelatoriosMunicipais';

interface RelatoriosPageProps {
    onNavigate?: (page: string, params?: Record<string, any>) => void;
}

export function RelatoriosPage({ onNavigate }: RelatoriosPageProps) {
    const { estatisticas, loading, error, relatorioActual, tipoRelatorioActual, loadEstatisticas, generateRelatorio, clearRelatorio } = useRelatoriosMunicipais();
    const [generating, setGenerating] = useState(false);
    const [anoLectivo, setAnoLectivo] = useState('2025/2026');
    const [trimestre, setTrimestre] = useState<1 | 2 | 3 | undefined>(undefined);

    useEffect(() => { loadEstatisticas(); }, [loadEstatisticas]);

    const handleGenerate = async (tipo: 'escolas' | 'aprovacao' | 'funcionarios' | 'solicitacoes') => {
        setGenerating(true);
        try { await generateRelatorio(tipo, { anoLectivo, trimestre }); }
        catch (err) { alert('Erro ao gerar relatório'); }
        finally { setGenerating(false); }
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { tipo: 'escolas' as const, icon: '🏫', label: 'Relatório de Escolas', desc: 'Estado e estatísticas das escolas' },
                    { tipo: 'aprovacao' as const, icon: '📊', label: 'Aproveitamento Escolar', desc: 'Taxas de aprovação e médias' },
                    { tipo: 'funcionarios' as const, icon: '👥', label: 'Funcionários', desc: 'Professores e administrativos' },
                    { tipo: 'solicitacoes' as const, icon: '📋', label: 'Solicitações', desc: 'Pedidos de documentos' }
                ].map(r => (
                    <div key={r.tipo} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
                        <div className="text-3xl mb-2">{r.icon}</div>
                        <h3 className="font-semibold text-gray-900">{r.label}</h3>
                        <p className="text-sm text-gray-500 mb-4">{r.desc}</p>
                        <button onClick={() => handleGenerate(r.tipo)} disabled={generating} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{generating ? 'A gerar...' : '📄 Gerar'}</button>
                    </div>
                ))}
            </div>

            {relatorioActual && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-6 py-4 border-b flex justify-between items-center">
                        <div><h3 className="font-semibold">{relatorioActual.titulo}</h3><p className="text-sm text-gray-500">Gerado em {formatDate(relatorioActual.data_geracao)}</p></div>
                        <div className="flex gap-2"><button onClick={clearRelatorio} className="px-4 py-2 border rounded-lg">✕ Fechar</button><button className="px-4 py-2 bg-green-600 text-white rounded-lg">📥 Exportar</button></div>
                    </div>
                    <div className="p-6">
                        {tipoRelatorioActual === 'escolas' && relatorioActual.escolas && (
                            <table className="w-full"><thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Escola</th><th className="px-4 py-2 text-center">Estado</th><th className="px-4 py-2 text-center">Turmas</th><th className="px-4 py-2 text-center">Alunos</th><th className="px-4 py-2 text-center">Média</th></tr></thead>
                                <tbody>{relatorioActual.escolas.map((e: any) => <tr key={e.codigo} className="border-t"><td className="px-4 py-2">{e.nome}</td><td className="px-4 py-2 text-center"><span className={`px-2 py-1 rounded text-xs ${e.estado === 'activa' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>{e.estado}</span></td><td className="px-4 py-2 text-center">{e.turmas}</td><td className="px-4 py-2 text-center">{e.alunos}</td><td className="px-4 py-2 text-center font-bold">{e.media || '-'}</td></tr>)}</tbody></table>
                        )}
                        {tipoRelatorioActual === 'aprovacao' && relatorioActual.escolas && (
                            <div><div className="grid grid-cols-4 gap-4 mb-6 text-center"><div className="bg-blue-50 p-3 rounded"><div className="font-bold text-blue-600">{relatorioActual.totais.total_alunos}</div><div className="text-xs">Total Alunos</div></div><div className="bg-green-50 p-3 rounded"><div className="font-bold text-green-600">{relatorioActual.totais.total_aprovados}</div><div className="text-xs">Aprovados</div></div><div className="bg-red-50 p-3 rounded"><div className="font-bold text-red-600">{relatorioActual.totais.total_reprovados}</div><div className="text-xs">Reprovados</div></div><div className="bg-purple-50 p-3 rounded"><div className="font-bold text-purple-600">{relatorioActual.totais.media_municipal}</div><div className="text-xs">Média Municipal</div></div></div>
                                <table className="w-full"><thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Escola</th><th className="px-4 py-2 text-center">Alunos</th><th className="px-4 py-2 text-center">Aprovados</th><th className="px-4 py-2 text-center">Taxa</th><th className="px-4 py-2 text-center">Média</th></tr></thead>
                                    <tbody>{relatorioActual.escolas.map((e: any, i: number) => <tr key={i} className="border-t"><td className="px-4 py-2">{e.nome}</td><td className="px-4 py-2 text-center">{e.total_alunos}</td><td className="px-4 py-2 text-center text-green-600">{e.aprovados}</td><td className="px-4 py-2 text-center font-bold">{e.taxa_aprovacao}%</td><td className="px-4 py-2 text-center">{e.media}</td></tr>)}</tbody></table></div>
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
