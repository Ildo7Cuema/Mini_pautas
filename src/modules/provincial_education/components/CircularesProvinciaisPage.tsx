/**
 * Provincial Circulars Management Page
 */

import React, { useState } from 'react';
import { Icons } from '../../../components/ui/Icons';
import { useCircularesProvinciais } from '../hooks/useCircularesProvinciais';
import type { CircularProvincial } from '../types';

// Modal Component
const Modal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <Icons.X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    {children}
                </div>
            </div>
        </div>
    );
};

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
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedCircular, setSelectedCircular] = useState<CircularProvincial | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        titulo: '',
        conteudo: '',
        importante: false,
        anexos: [] as string[]
    });
    const [actionLoading, setActionLoading] = useState(false);

    // Filtering
    const filteredCirculares = circulares.filter(circular => {
        const matchesSearch =
            circular.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            circular.conteudo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter =
            filterTipo === 'todos' ||
            (filterTipo === 'rascunho' && circular.estado === 'rascunho') ||
            (filterTipo === 'publicado' && circular.estado === 'publicada');

        return matchesSearch && matchesFilter;
    });

    // Handlers
    const resetForm = () => {
        setFormData({
            titulo: '',
            conteudo: '',
            importante: false,
            anexos: []
        });
        setSelectedCircular(null);
    };

    const handleOpenEdit = (circular: CircularProvincial) => {
        setSelectedCircular(circular);
        setFormData({
            titulo: circular.titulo,
            conteudo: circular.conteudo,
            importante: circular.importante,
            anexos: circular.anexos || []
        });
        setShowEditModal(true);
    };

    const handleCreate = async () => {
        if (!formData.titulo || !formData.conteudo) return;

        try {
            setActionLoading(true);
            await criarCircular(formData);
            setShowCreateModal(false);
            resetForm();
        } catch (err) {
            console.error('Error creating circular:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!selectedCircular || !formData.titulo || !formData.conteudo) return;

        try {
            setActionLoading(true);
            await atualizarCircular(selectedCircular.id, formData);
            setShowEditModal(false);
            resetForm();
        } catch (err) {
            console.error('Error updating circular:', err);
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
            console.error('Error deleting circular:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handlePublish = async (id: string, publicar: boolean) => {
        if (!confirm(publicar ? 'Tem certeza que deseja publicar esta circular?' : 'Tem certeza que deseja reverter para rascunho?')) return;

        try {
            setActionLoading(true);
            await publicarCircular(id, publicar);
        } catch (err) {
            console.error('Error publishing circular:', err);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Circulares Provinciais</h1>
                    <p className="text-gray-600 mt-1">Gerencie comunicados para as direções municipais</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowCreateModal(true); }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-lg hover:shadow-xl"
                >
                    <Icons.Plus className="w-5 h-5" />
                    Nova Circular
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Pesquisar por título ou conteúdo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Icons.Filter className="text-gray-400 w-5 h-5" />
                        <select
                            value={filterTipo}
                            onChange={(e) => setFilterTipo(e.target.value as any)}
                            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="todos">Todos os estados</option>
                            <option value="rascunho">Rascunhos</option>
                            <option value="publicado">Publicadas</option>
                        </select>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    <Icons.ExclamationCircle className="w-5 h-5 inline mr-2" />
                    {error}
                </div>
            )}

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCirculares.map(circular => (
                    <div key={circular.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow">
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-2 rounded-lg ${circular.importante ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                    <Icons.DocumentText className="w-6 h-6" />
                                </div>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${circular.estado === 'publicada'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {circular.estado === 'publicada' ? 'Publicada' : 'Rascunho'}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1">
                                {circular.titulo}
                            </h3>
                            <p className="text-gray-600 mb-4 line-clamp-3 text-sm">
                                {circular.conteudo}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                                <div className="flex items-center gap-1">
                                    <Icons.Clock className="w-4 h-4" />
                                    {new Date(circular.created_at).toLocaleDateString('pt-AO')}
                                </div>
                                {circular.estado === 'publicada' && (
                                    <div className="flex items-center gap-1" title="Lido por">
                                        <Icons.Users className="w-4 h-4" />
                                        {circular.lido_por?.length || 0}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t">
                                <button
                                    onClick={() => { setSelectedCircular(circular); setShowDetailsModal(true); }}
                                    className="text-gray-600 hover:text-indigo-600 transition-colors"
                                    title="Ver detalhes"
                                >
                                    <Icons.EyeOpen className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-2">
                                    {circular.estado === 'rascunho' && (
                                        <>
                                            <button
                                                onClick={() => handleOpenEdit(circular)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                title="Editar"
                                            >
                                                <Icons.Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedCircular(circular); setShowDeleteModal(true); }}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                title="Eliminar"
                                            >
                                                <Icons.Trash className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handlePublish(circular.id, true)}
                                                disabled={actionLoading}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                                title="Publicar"
                                            >
                                                <Icons.Send className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                    {circular.estado === 'publicada' && (
                                        <button
                                            onClick={() => handlePublish(circular.id, false)}
                                            disabled={actionLoading}
                                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                                            title="Reverter para rascunho"
                                        >
                                            <Icons.History className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredCirculares.length === 0 && (
                <div className="text-center py-12">
                    <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Icons.DocumentText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Nenhuma circular encontrada</h3>
                    <p className="text-gray-500 mt-1">Tente ajustar os filtros ou criar uma nova circular.</p>
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={showCreateModal || showEditModal}
                onClose={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}
                title={showCreateModal ? 'Nova Circular' : 'Editar Circular'}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                        <input
                            type="text"
                            value={formData.titulo}
                            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ex: Orientações para o Ano Lectivo"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo *</label>
                        <textarea
                            value={formData.conteudo}
                            onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                            rows={6}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="Escreva o conteúdo da circular..."
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="importante"
                            checked={formData.importante}
                            onChange={(e) => setFormData({ ...formData, importante: e.target.checked })}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="importante" className="text-sm font-medium text-gray-700">
                            Marcar como Importante
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={showCreateModal ? handleCreate : handleUpdate}
                            disabled={actionLoading || !formData.titulo || !formData.conteudo}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {actionLoading ? 'A guardar...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Eliminar Circular"
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Tem certeza que deseja eliminar a circular <strong>{selectedCircular?.titulo}</strong>?
                        Esta acção não pode ser desfeita.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowDeleteModal(false)}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
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
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-gray-900">{selectedCircular.titulo}</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {new Date(selectedCircular.created_at).toLocaleDateString('pt-AO', {
                                    day: 'numeric', month: 'long', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </p>
                            {selectedCircular.importante && (
                                <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded uppercase">
                                    Importante
                                </span>
                            )}
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <p className="text-gray-800 whitespace-pre-wrap">{selectedCircular.conteudo}</p>
                        </div>

                        {selectedCircular.estado === 'publicada' && (
                            <div className="border-t pt-4">
                                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <Icons.CheckCircle className="w-4 h-4 text-green-600" />
                                    Leituras ({selectedCircular.lido_por?.length || 0})
                                </h4>
                                {selectedCircular.lido_por && selectedCircular.lido_por.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedCircular.lido_por.map((leitorId) => (
                                            <span key={leitorId} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                                                ID: {leitorId.substring(0, 8)}...
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">Nenhuma leitura registada ainda.</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default CircularesProvinciaisPage;
