/**
 * Provincial Circulars Management Page
 * Mobile-first design with cards, bottom sheet actions, and touch-friendly editor
 */

import React, { useState, useEffect } from 'react';
import { Icons } from '../../../components/ui/Icons';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { useCircularesProvinciais } from '../hooks/useCircularesProvinciais';
import { supabase } from '../../../lib/supabaseClient';
import type { CircularProvincial } from '../types';

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

// Circular card for mobile
const CircularCard: React.FC<{
    circular: CircularProvincial;
    onView: () => void;
    onOpenActions: () => void;
}> = ({ circular, onView, onOpenActions }) => (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-4">
            {/* Header badges */}
            <div className="flex items-center justify-between mb-3">
                {circular.urgente && (
                    <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200">
                        URGENTE
                    </span>
                )}
                <span className={`ml-auto px-2.5 py-1 text-xs font-medium rounded-full border ${circular.publicado
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                    {circular.publicado ? 'Publicada' : 'Rascunho'}
                </span>
            </div>

            {/* Title and content preview */}
            <h3 className="font-semibold text-slate-900 line-clamp-2 mb-2">{circular.titulo}</h3>
            <p className="text-sm text-slate-500 line-clamp-2 mb-3">{circular.conteudo}</p>

            {/* Metadata */}
            <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                    <Icons.Clock className="w-3.5 h-3.5" />
                    {new Date(circular.created_at).toLocaleDateString('pt-AO')}
                </span>
                {circular.publicado && (
                    <span className="flex items-center gap-1">
                        <Icons.Users className="w-3.5 h-3.5" />
                        {circular.leituras_count || 0} leituras
                    </span>
                )}
            </div>
        </div>

        {/* Actions footer */}
        <div className="flex items-center border-t border-slate-100">
            <button
                onClick={onView}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors min-h-[48px]"
            >
                <Icons.EyeOpen className="w-4 h-4" />
                Ver
            </button>
            <div className="w-px h-6 bg-slate-100" />
            <button
                onClick={onOpenActions}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors min-h-[48px]"
            >
                <Icons.ClipboardList className="w-4 h-4" />
                Opções
            </button>
        </div>
    </div>
);

export const CircularesProvinciaisPage: React.FC = () => {
    const {
        circulares,
        loading,
        error,
        criarCircular,
        actualizarCircular,
        eliminarCircular,
        publicarCircular
    } = useCircularesProvinciais();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterTipo, setFilterTipo] = useState<'todos' | 'rascunho' | 'publicado'>('todos');

    // Bottom sheet and modals
    const [showActionsSheet, setShowActionsSheet] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [publishAction, setPublishAction] = useState<{ id: string; publicar: boolean } | null>(null);
    const [selectedCircular, setSelectedCircular] = useState<CircularProvincial | null>(null);

    // Form state
    const [formData, setFormData] = useState<{
        titulo: string;
        conteudo: string;
        urgente: boolean;
        tipo: 'circular' | 'aviso' | 'comunicado' | 'despacho';
    }>({
        titulo: '',
        conteudo: '',
        urgente: false,
        tipo: 'circular'
    });
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Filtering
    const filteredCirculares = circulares.filter(circular => {
        const matchesSearch =
            circular.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            circular.conteudo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter =
            filterTipo === 'todos' ||
            (filterTipo === 'rascunho' && !circular.publicado) ||
            (filterTipo === 'publicado' && circular.publicado);
        return matchesSearch && matchesFilter;
    });

    // Handlers
    const resetForm = () => {
        setFormData({ titulo: '', conteudo: '', urgente: false, tipo: 'circular' });
        setAttachmentFile(null);
        setSelectedCircular(null);
    };

    const handleOpenActions = (circular: CircularProvincial) => {
        setSelectedCircular(circular);
        setShowActionsSheet(true);
    };

    const handleOpenEdit = () => {
        if (!selectedCircular) return;
        setShowActionsSheet(false);
        setFormData({
            titulo: selectedCircular.titulo,
            conteudo: selectedCircular.conteudo,
            urgente: selectedCircular.urgente || false,
            tipo: selectedCircular.tipo || 'circular'
        });
        setShowEditModal(true);
    };

    const handleCreate = async () => {
        if (!formData.titulo || !formData.conteudo) return;
        try {
            setActionLoading(true);
            let anexo_url: string | undefined;
            let anexo_filename: string | undefined;

            if (attachmentFile) {
                const fileExt = attachmentFile.name.split('.').pop();
                const fileName = `provincial_${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('circulares').upload(fileName, attachmentFile);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('circulares').getPublicUrl(fileName);
                anexo_url = publicUrl;
                anexo_filename = attachmentFile.name;
            }

            await criarCircular({ ...formData, anexo_url, anexo_filename });
            setShowCreateModal(false);
            resetForm();
        } catch (err) {
            console.error('Error creating:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!selectedCircular || !formData.titulo || !formData.conteudo) return;
        try {
            setActionLoading(true);
            await actualizarCircular(selectedCircular.id, formData);
            setShowEditModal(false);
            resetForm();
        } catch (err) {
            console.error('Error updating:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedCircular) return;
        try {
            setActionLoading(true);
            await eliminarCircular(selectedCircular.id);
            setShowDeleteModal(false);
            setSelectedCircular(null);
        } catch (err) {
            console.error('Error deleting:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handlePublish = async () => {
        setShowActionsSheet(false);
        if (!selectedCircular) return;
        setPublishAction({ id: selectedCircular.id, publicar: !selectedCircular.publicado });
        setShowPublishModal(true);
    };

    const confirmPublish = async () => {
        if (!publishAction) return;
        try {
            setActionLoading(true);
            await publicarCircular(publishAction.id, publishAction.publicar);
            setShowPublishModal(false);
            setPublishAction(null);
        } catch (err) {
            console.error('Error publishing:', err);
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
            {/* Header with create button */}
            <div className="px-4 pt-4 pb-2 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Circulares</h1>
                        <p className="text-sm text-slate-500">Comunicados provinciais</p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowCreateModal(true); }}
                        className="flex-shrink-0 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 active:scale-95 transition-all flex items-center gap-2 shadow-sm min-h-[44px]"
                    >
                        <Icons.Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">Nova</span>
                    </button>
                </div>
            </div>

            <div className="px-4 sm:px-6 pb-6 space-y-4">
                {/* Search and filter */}
                <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm pb-3 -mx-4 px-4 pt-2 sm:mx-0 sm:px-0">
                    <div className="relative mb-3">
                        <Icons.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Pesquisar circulares..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-base focus:ring-2 focus:ring-primary-500 min-h-[48px]"
                        />
                    </div>

                    {/* Filter chips */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {[
                            { id: 'todos', label: 'Todas' },
                            { id: 'rascunho', label: 'Rascunhos' },
                            { id: 'publicado', label: 'Publicadas' },
                        ].map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => setFilterTipo(filter.id as any)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all min-h-[36px] ${filterTipo === filter.id
                                        ? 'bg-primary-600 text-white shadow-sm'
                                        : 'bg-white text-slate-600 border border-slate-200'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                        <Icons.ExclamationCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Circulars grid/list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCirculares.map(circular => (
                        <CircularCard
                            key={circular.id}
                            circular={circular}
                            onView={() => { setSelectedCircular(circular); setShowDetailsModal(true); }}
                            onOpenActions={() => handleOpenActions(circular)}
                        />
                    ))}
                </div>

                {filteredCirculares.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/60">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Icons.DocumentText className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-500">Nenhuma circular</h3>
                        <p className="text-sm text-slate-400 mt-1">Crie uma nova circular para começar</p>
                    </div>
                )}
            </div>

            {/* Bottom Sheet for Actions */}
            <BottomSheet
                isOpen={showActionsSheet}
                onClose={() => setShowActionsSheet(false)}
                title={selectedCircular?.titulo}
                actions={[
                    {
                        label: 'Ver Detalhes',
                        icon: <Icons.EyeOpen className="w-5 h-5" />,
                        onClick: () => { setShowActionsSheet(false); setShowDetailsModal(true); },
                    },
                    ...(!selectedCircular?.publicado ? [
                        {
                            label: 'Editar',
                            icon: <Icons.Edit className="w-5 h-5" />,
                            onClick: handleOpenEdit,
                        },
                        {
                            label: 'Publicar',
                            icon: <Icons.Send className="w-5 h-5" />,
                            onClick: handlePublish,
                            variant: 'success' as const,
                        },
                        {
                            label: 'Eliminar',
                            icon: <Icons.Trash className="w-5 h-5" />,
                            onClick: () => { setShowActionsSheet(false); setShowDeleteModal(true); },
                            variant: 'danger' as const,
                        },
                    ] : [
                        {
                            label: 'Reverter para Rascunho',
                            icon: <Icons.History className="w-5 h-5" />,
                            onClick: handlePublish,
                            variant: 'danger' as const,
                        },
                    ]),
                ]}
            />

            {/* Create/Edit Modal */}
            <Modal
                isOpen={showCreateModal || showEditModal}
                onClose={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}
                title={showCreateModal ? 'Nova Circular' : 'Editar Circular'}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Título *</label>
                        <input
                            type="text"
                            value={formData.titulo}
                            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 min-h-[48px]"
                            placeholder="Ex: Orientações para o Ano Lectivo"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Conteúdo *</label>
                        <textarea
                            value={formData.conteudo}
                            onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                            rows={6}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                            placeholder="Escreva o conteúdo da circular..."
                        />
                    </div>

                    {/* Urgent toggle */}
                    <label className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.urgente}
                            onChange={(e) => setFormData({ ...formData, urgente: e.target.checked })}
                            className="w-5 h-5 rounded text-red-600 focus:ring-red-500"
                        />
                        <div>
                            <p className="font-medium text-red-700">Marcar como Urgente</p>
                            <p className="text-xs text-red-500">Destaca a circular com prioridade máxima</p>
                        </div>
                    </label>

                    {/* Attachment */}
                    <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Icons.Paperclip className="w-4 h-4 inline mr-1" />
                            Anexar Documento
                        </label>
                        <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                        />
                        {attachmentFile && (
                            <p className="mt-2 text-sm text-emerald-600 flex items-center gap-1">
                                <Icons.CheckCircle className="w-4 h-4" />
                                {attachmentFile.name}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                            onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}
                            className="flex-1 py-3 text-slate-700 bg-slate-100 rounded-xl font-medium hover:bg-slate-200 transition-colors min-h-[48px]"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={showCreateModal ? handleCreate : handleUpdate}
                            disabled={actionLoading || !formData.titulo || !formData.conteudo}
                            className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors min-h-[48px]"
                        >
                            {actionLoading ? 'A guardar...' : (showCreateModal ? 'Criar' : 'Guardar')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Eliminar Circular"
            >
                <div className="space-y-4">
                    <p className="text-slate-600">
                        Eliminar <strong>"{selectedCircular?.titulo}"</strong>? Esta acção não pode ser desfeita.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium min-h-[48px]">
                            Cancelar
                        </button>
                        <button onClick={handleDelete} disabled={actionLoading} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium disabled:opacity-50 min-h-[48px]">
                            {actionLoading ? 'A eliminar...' : 'Eliminar'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Details Modal */}
            <Modal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                title="Detalhes da Circular"
            >
                {selectedCircular && (
                    <div className="space-y-4">
                        <div className="text-center pb-4 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900">{selectedCircular.titulo}</h2>
                            <p className="text-sm text-slate-500 mt-1">
                                {new Date(selectedCircular.created_at).toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                {selectedCircular.urgente && (
                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">URGENTE</span>
                                )}
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${selectedCircular.publicado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {selectedCircular.publicado ? 'Publicada' : 'Rascunho'}
                                </span>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl">
                            <p className="text-slate-700 whitespace-pre-wrap">{selectedCircular.conteudo}</p>
                        </div>

                        {selectedCircular.publicado && (
                            <div className="flex items-center gap-2 text-emerald-600">
                                <Icons.Users className="w-5 h-5" />
                                <span className="text-sm font-medium">{selectedCircular.leituras_count || 0} direções leram esta circular</span>
                            </div>
                        )}

                        {selectedCircular.anexo_url && (
                            <a
                                href={selectedCircular.anexo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-primary-50 text-primary-700 rounded-xl hover:bg-primary-100 transition-colors"
                            >
                                <Icons.Download className="w-5 h-5" />
                                <span className="font-medium">{selectedCircular.anexo_filename || 'Descarregar anexo'}</span>
                            </a>
                        )}
                    </div>
                )}
            </Modal>

            {/* Publish Modal */}
            <Modal
                isOpen={showPublishModal}
                onClose={() => { setShowPublishModal(false); setPublishAction(null); }}
                title={publishAction?.publicar ? 'Publicar Circular' : 'Reverter para Rascunho'}
            >
                <div className="space-y-4">
                    <div className="text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${publishAction?.publicar ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                            {publishAction?.publicar ? <Icons.Send className="w-8 h-8 text-emerald-600" /> : <Icons.History className="w-8 h-8 text-amber-600" />}
                        </div>
                        <p className="text-slate-600">
                            {publishAction?.publicar
                                ? 'Todas as Direções Municipais serão notificadas.'
                                : 'A circular deixará de estar visível.'}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => setShowPublishModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium min-h-[48px]">
                            Cancelar
                        </button>
                        <button
                            onClick={confirmPublish}
                            disabled={actionLoading}
                            className={`flex-1 py-3 text-white rounded-xl font-medium disabled:opacity-50 min-h-[48px] ${publishAction?.publicar ? 'bg-emerald-600' : 'bg-amber-600'}`}
                        >
                            {actionLoading ? 'A processar...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CircularesProvinciaisPage;
