/**
 * Circulares Page - Official communications management
 */

import { useState, useEffect } from 'react';
import { useCirculares } from '../hooks/useCirculares';
import type { TipoCircular, CreateCircularRequest, CircularMunicipal } from '../types';
import { supabase } from '../../../lib/supabaseClient';

interface CircularesPageProps {
    onNavigate?: (page: string, params?: Record<string, any>) => void;
}

const tipoLabels: Record<TipoCircular, { label: string; icon: string }> = {
    'circular': { label: 'Circular', icon: '📋' },
    'aviso': { label: 'Aviso', icon: '⚠️' },
    'comunicado': { label: 'Comunicado', icon: '📢' },
    'despacho': { label: 'Despacho', icon: '📑' }
};

export function CircularesPage({ onNavigate }: CircularesPageProps) {
    const { circulares, loading, stats, selectedCircular, leituras, escolasPendentes, filtros, setFiltros, refresh, selectCircular, criar, eliminar, getNextNumber } = useCirculares();
    const [showModal, setShowModal] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [formData, setFormData] = useState<CreateCircularRequest>({ titulo: '', conteudo: '', tipo: 'circular', urgente: false });
    const [file, setFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    // Auto-generate number when modal opens or type changes
    useEffect(() => {
        if (showModal && formData.tipo) {
            getNextNumber(formData.tipo).then(number => {
                setFormData(prev => ({ ...prev, numero_circular: number }));
            });
        }
    }, [showModal, formData.tipo, getNextNumber]);

    const handleCreate = async () => {
        if (!formData.titulo.trim() || !formData.conteudo.trim()) return;
        setSaving(true);
        try {
            let anexo_url = undefined;
            let anexo_filename = undefined;

            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('circulares')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('circulares')
                    .getPublicUrl(filePath);

                anexo_url = publicUrl;
                anexo_filename = file.name;
            }

            await criar({
                ...formData,
                anexo_url,
                anexo_filename
            });
            setShowModal(false);
            setFormData({ titulo: '', conteudo: '', tipo: 'circular', urgente: false });
            setFile(null);
        } catch (err: any) {
            console.error('Erro ao criar circular:', err);
            const errorMessage = err.message || err.error_description || JSON.stringify(err) || 'Erro desconhecido';
            alert('Erro: ' + errorMessage);
        }
        finally { setSaving(false); }
    };

    const handleSelectCircular = async (circular: CircularMunicipal) => { await selectCircular(circular); setShowDetails(true); };

    if (loading && circulares.length === 0) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

    return (
        <div className="space-y-6 pb-24 md:pb-6 animate-fade-in">
            {/* Modern Header with Gradient */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 rounded-2xl p-6 md:p-8 text-white shadow-xl">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                                <span className="text-3xl">📢</span>
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white drop-shadow-lg" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                    Comunicação Oficial
                                </h1>
                                <p className="text-white/80 font-medium mt-1">
                                    Circulares, avisos e comunicados
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all font-medium backdrop-blur-sm border border-white/20 flex items-center gap-2">
                            ➕ Nova Comunicação
                        </button>
                    </div>
                </div>
            </div>

            {stats && (
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border"><div className="text-2xl font-bold">{stats.total}</div><div className="text-sm text-gray-500">Total</div></div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100"><div className="text-2xl font-bold text-blue-600">{stats.circulares}</div><div className="text-sm text-blue-600">Circulares</div></div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100"><div className="text-2xl font-bold text-red-600">{stats.urgentes}</div><div className="text-sm text-red-600">Urgentes</div></div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100"><div className="text-2xl font-bold text-green-600">{stats.este_mes}</div><div className="text-sm text-green-600">Este Mês</div></div>
                </div>
            )}

            <div className="flex gap-2">
                <button onClick={() => setFiltros({})} className={`px-4 py-2 rounded-lg ${!filtros.tipo ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Todos</button>
                {(Object.keys(tipoLabels) as TipoCircular[]).map(tipo => (
                    <button key={tipo} onClick={() => setFiltros({ tipo })} className={`px-4 py-2 rounded-lg ${filtros.tipo === tipo ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{tipoLabels[tipo].icon} {tipoLabels[tipo].label}</button>
                ))}
            </div>

            <div className="space-y-4">
                {circulares.map(c => (
                    <div key={c.id} onClick={() => handleSelectCircular(c)} className={`bg-white rounded-xl shadow-sm border ${c.urgente ? 'border-red-300' : 'border-gray-100'} p-4 cursor-pointer hover:shadow-md`}>
                        <div className="flex justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    {c.urgente && <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">🔴 URGENTE</span>}
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{tipoLabels[c.tipo].icon} {tipoLabels[c.tipo].label}</span>
                                </div>
                                <h3 className="font-semibold text-gray-900">{c.titulo}</h3>
                                <p className="text-gray-600 text-sm mt-1 line-clamp-2">{c.conteudo}</p>
                            </div>
                            <div className="text-right ml-4">
                                <div className="text-sm text-gray-500">{new Date(c.data_publicacao).toLocaleDateString('pt-AO')}</div>
                                <div className="mt-2 text-sm text-green-600">✓ {c.leituras_count || 0} leituras</div>
                            </div>
                        </div>
                    </div>
                ))}
                {circulares.length === 0 && <div className="bg-white rounded-xl p-8 text-center text-gray-500">Nenhuma comunicação</div>}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
                        <h3 className="text-lg font-semibold mb-4">Nova Comunicação</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <select value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value as TipoCircular })} className="px-4 py-2 border rounded-lg">
                                    <option value="circular">📋 Circular</option><option value="aviso">⚠️ Aviso</option><option value="comunicado">📢 Comunicado</option><option value="despacho">📑 Despacho</option>
                                </select>
                                <input type="text" value={formData.numero_circular || ''} onChange={e => setFormData({ ...formData, numero_circular: e.target.value })} placeholder="Nº (opcional)" className="px-4 py-2 border rounded-lg" />
                            </div>
                            <input type="text" value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} placeholder="Título *" className="w-full px-4 py-2 border rounded-lg" />
                            <textarea value={formData.conteudo} onChange={e => setFormData({ ...formData, conteudo: e.target.value })} placeholder="Conteúdo *" rows={6} className="w-full px-4 py-2 border rounded-lg" />
                            <label className="flex items-center gap-2"><input type="checkbox" checked={formData.urgente} onChange={e => setFormData({ ...formData, urgente: e.target.checked })} className="rounded" /><span>🔴 Urgente</span></label>

                            <div className="border rounded-lg p-4 bg-gray-50">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Anexar Documento (PDF ou Imagem)</label>
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                                    className="block w-full text-sm text-gray-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-blue-50 file:text-blue-700
                                        hover:file:bg-blue-100"
                                />
                                {file && <div className="mt-2 text-sm text-green-600">Arquivo selecionado: {file.name}</div>}
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancelar</button>
                            <button onClick={handleCreate} disabled={saving || !formData.titulo.trim()} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">{saving ? 'A publicar...' : 'Publicar'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showDetails && selectedCircular && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[85vh] overflow-auto">
                        <div className="flex justify-between mb-4">
                            <div className="flex gap-2">{selectedCircular.urgente && <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">🔴 URGENTE</span>}<span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{tipoLabels[selectedCircular.tipo].icon}</span></div>
                            <button onClick={() => setShowDetails(false)} className="text-gray-500">✕</button>
                        </div>
                        <h2 className="text-xl font-bold mb-2">{selectedCircular.titulo}</h2>
                        <p className="text-sm text-gray-500 mb-4">Publicado em {new Date(selectedCircular.data_publicacao).toLocaleDateString('pt-AO')}</p>
                        <div className="bg-gray-50 p-4 rounded-lg mb-6 whitespace-pre-wrap">{selectedCircular.conteudo}</div>
                        <h3 className="font-semibold mb-3">📋 Leitura ({leituras.length}/{leituras.length + escolasPendentes.length})</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><h4 className="text-green-700 mb-2">✓ Leram</h4>{leituras.map(l => <div key={l.id} className="bg-green-50 p-2 rounded mb-1">{l.escola?.nome}</div>)}</div>
                            <div><h4 className="text-yellow-700 mb-2">⏳ Pendentes</h4>{escolasPendentes.map(e => <div key={e.id} className="bg-yellow-50 p-2 rounded mb-1">{e.nome}</div>)}</div>
                        </div>

                        {selectedCircular.anexo_url && (
                            <div className="mt-6 border-t pt-4">
                                <h3 className="font-semibold mb-3">📎 Anexo</h3>
                                <a
                                    href={selectedCircular.anexo_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    <span>📄</span>
                                    {selectedCircular.anexo_filename || 'Visualizar documento'}
                                    <span className="text-xs opacity-50">↗</span>
                                </a>
                            </div>
                        )}
                        <button onClick={() => setShowDetails(false)} className="w-full mt-6 px-4 py-2 bg-gray-100 rounded-lg">Fechar</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CircularesPage;
