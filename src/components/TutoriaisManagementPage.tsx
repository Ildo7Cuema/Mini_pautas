/**
 * @component TutoriaisManagementPage
 * @description Página premium mobile-first de gerenciamento de tutoriais para SuperAdmin
 * @tokens [--color-primary, --gradient-primary, --shadow-elevation-2]
 * @responsive true
 * @tested-on [360x800, 375x812, 768x1024, 1440x900]
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Icons } from './ui/Icons'
import type { Tutorial, TutorialPerfil, CategoriaTutorial, UserRole } from '../types'

const CATEGORIAS: { value: CategoriaTutorial; label: string; icon: string; color: string }[] = [
    { value: 'geral', label: 'Geral', icon: '🎯', color: 'from-blue-500 to-blue-600' },
    { value: 'login', label: 'Login & Cadastro', icon: '🔐', color: 'from-amber-500 to-orange-600' },
    { value: 'turmas', label: 'Turmas', icon: '👥', color: 'from-green-500 to-emerald-600' },
    { value: 'notas', label: 'Notas', icon: '📝', color: 'from-purple-500 to-violet-600' },
    { value: 'relatorios', label: 'Relatórios', icon: '📊', color: 'from-pink-500 to-rose-600' },
    { value: 'configuracoes', label: 'Configurações', icon: '⚙️', color: 'from-slate-500 to-slate-600' }
]

const PERFIS: { value: UserRole; label: string; icon: string }[] = [
    { value: 'ESCOLA', label: 'Escola', icon: '🏫' },
    { value: 'PROFESSOR', label: 'Professor', icon: '👨‍🏫' },
    { value: 'SECRETARIO', label: 'Secretário', icon: '📋' },
    { value: 'ALUNO', label: 'Aluno', icon: '🎓' },
    { value: 'ENCARREGADO', label: 'Encarregado', icon: '👨‍👩‍👧' }
]

interface TutorialWithPerfis extends Tutorial {
    tutorial_perfis?: TutorialPerfil[]
}

export const TutoriaisManagementPage: React.FC = () => {
    const [tutoriais, setTutoriais] = useState<TutorialWithPerfis[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingTutorial, setEditingTutorial] = useState<TutorialWithPerfis | null>(null)
    const [saving, setSaving] = useState(false)
    const [activeFilter, setActiveFilter] = useState<'todos' | 'ativos' | 'inativos' | 'publicos'>('todos')
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [tutorialToDelete, setTutorialToDelete] = useState<TutorialWithPerfis | null>(null)
    const [deleting, setDeleting] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        titulo: '',
        descricao: '',
        url_video: '',
        thumbnail_url: '',
        categoria: 'geral' as CategoriaTutorial,
        ordem: 0,
        publico: true,
        ativo: true,
        perfis: [] as UserRole[]
    })

    useEffect(() => {
        loadTutoriais()
    }, [])

    const loadTutoriais = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('tutoriais')
                .select('*, tutorial_perfis(*)')
                .order('ordem', { ascending: true })
                .order('created_at', { ascending: false })

            if (error) throw error
            setTutoriais(data || [])
        } catch (error) {
            console.error('Erro ao carregar tutoriais:', error)
        } finally {
            setLoading(false)
        }
    }

    const openModal = (tutorial?: TutorialWithPerfis) => {
        if (tutorial) {
            setEditingTutorial(tutorial)
            const perfisSelecionados = (tutorial.tutorial_perfis || []).map(p => p.perfil)
            setFormData({
                titulo: tutorial.titulo,
                descricao: tutorial.descricao || '',
                url_video: tutorial.url_video,
                thumbnail_url: tutorial.thumbnail_url || '',
                categoria: tutorial.categoria,
                ordem: tutorial.ordem,
                publico: tutorial.publico,
                ativo: tutorial.ativo,
                perfis: perfisSelecionados
            })
        } else {
            setEditingTutorial(null)
            setFormData({
                titulo: '',
                descricao: '',
                url_video: '',
                thumbnail_url: '',
                categoria: 'geral',
                ordem: tutoriais.length + 1,
                publico: true,
                ativo: true,
                perfis: []
            })
        }
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setEditingTutorial(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            if (editingTutorial) {
                const { error: updateError } = await supabase
                    .from('tutoriais')
                    .update({
                        titulo: formData.titulo,
                        descricao: formData.descricao || null,
                        url_video: formData.url_video,
                        thumbnail_url: formData.thumbnail_url || null,
                        categoria: formData.categoria,
                        ordem: formData.ordem,
                        publico: formData.publico,
                        ativo: formData.ativo
                    })
                    .eq('id', editingTutorial.id)

                if (updateError) throw updateError

                await supabase.from('tutorial_perfis').delete().eq('tutorial_id', editingTutorial.id)

                if (formData.perfis.length > 0) {
                    await supabase.from('tutorial_perfis').insert(
                        formData.perfis.map(perfil => ({ tutorial_id: editingTutorial.id, perfil }))
                    )
                }
            } else {
                const { data: newTutorial, error: insertError } = await supabase
                    .from('tutoriais')
                    .insert({
                        titulo: formData.titulo,
                        descricao: formData.descricao || null,
                        url_video: formData.url_video,
                        thumbnail_url: formData.thumbnail_url || null,
                        categoria: formData.categoria,
                        ordem: formData.ordem,
                        publico: formData.publico,
                        ativo: formData.ativo
                    })
                    .select()
                    .single()

                if (insertError) throw insertError

                if (formData.perfis.length > 0 && newTutorial) {
                    await supabase.from('tutorial_perfis').insert(
                        formData.perfis.map(perfil => ({ tutorial_id: newTutorial.id, perfil }))
                    )
                }
            }

            closeModal()
            loadTutoriais()
        } catch (error) {
            console.error('Erro ao salvar tutorial:', error)
            alert('Erro ao salvar tutorial. Verifique os dados e tente novamente.')
        } finally {
            setSaving(false)
        }
    }

    const toggleAtivo = async (tutorial: TutorialWithPerfis) => {
        try {
            await supabase.from('tutoriais').update({ ativo: !tutorial.ativo }).eq('id', tutorial.id)
            loadTutoriais()
        } catch (error) {
            console.error('Erro ao atualizar tutorial:', error)
        }
    }

    const openDeleteModal = (tutorial: TutorialWithPerfis) => {
        setTutorialToDelete(tutorial)
        setShowDeleteModal(true)
    }

    const closeDeleteModal = () => {
        setShowDeleteModal(false)
        setTutorialToDelete(null)
        setDeleting(false)
    }

    const confirmDeleteTutorial = async () => {
        if (!tutorialToDelete) return
        setDeleting(true)
        try {
            await supabase.from('tutoriais').delete().eq('id', tutorialToDelete.id)
            loadTutoriais()
            closeDeleteModal()
        } catch (error) {
            console.error('Erro ao excluir tutorial:', error)
            setDeleting(false)
        }
    }

    const togglePerfil = (perfil: UserRole) => {
        setFormData(prev => ({
            ...prev,
            perfis: prev.perfis.includes(perfil)
                ? prev.perfis.filter(p => p !== perfil)
                : [...prev.perfis, perfil]
        }))
    }

    const getEmbedUrl = (url: string): string => {
        if (url.includes('youtube.com/watch')) {
            const videoId = new URL(url).searchParams.get('v')
            return `https://www.youtube.com/embed/${videoId}`
        }
        if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1]?.split('?')[0]
            return `https://www.youtube.com/embed/${videoId}`
        }
        if (url.includes('/embed/') || url.includes('player.vimeo.com')) return url
        if (url.includes('vimeo.com/')) {
            const videoId = url.split('vimeo.com/')[1]?.split('?')[0]
            return `https://player.vimeo.com/video/${videoId}`
        }
        return url
    }

    const getThumbnail = (tutorial: TutorialWithPerfis): string => {
        if (tutorial.thumbnail_url) return tutorial.thumbnail_url
        const url = tutorial.url_video
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            let videoId = ''
            if (url.includes('youtube.com/watch')) videoId = new URL(url).searchParams.get('v') || ''
            else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
            else if (url.includes('/embed/')) videoId = url.split('/embed/')[1]?.split('?')[0] || ''
            if (videoId) return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        }
        return ''
    }

    // Filter tutorials
    const filteredTutoriais = tutoriais.filter(t => {
        if (activeFilter === 'ativos') return t.ativo
        if (activeFilter === 'inativos') return !t.ativo
        if (activeFilter === 'publicos') return t.publico
        return true
    })

    const stats = {
        total: tutoriais.length,
        ativos: tutoriais.filter(t => t.ativo).length,
        publicos: tutoriais.filter(t => t.publico).length,
        inativos: tutoriais.filter(t => !t.ativo).length
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Native Mobile Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-6 shadow-xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzR2LTRoLTJ2NGgtNHYyaDR2NGgydi00aDR2LTJoLTR6bTAtMzBWMGgtMnY0aC00djJoNHY0aDJWNmg0VjRoLTR6TTYgMzR2LTRINHY0SDB2Mmg0djRoMnYtNGg0di0ySDZ6TTYgNFYwSDR2NEgwdjJoNHY0aDJWNmg0VjRINnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
                <div className="relative z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-lg">
                                <span className="text-3xl">📹</span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Tutoriais</h1>
                                <p className="text-white/70 text-sm">Gerencie vídeos de ajuda</p>
                            </div>
                        </div>
                        <button
                            onClick={() => openModal()}
                            className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white hover:bg-white/30 transition-all active:scale-95 shadow-lg"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-3 mt-6">
                        {[
                            { label: 'Total', value: stats.total, filter: 'todos' as const },
                            { label: 'Ativos', value: stats.ativos, filter: 'ativos' as const },
                            { label: 'Públicos', value: stats.publicos, filter: 'publicos' as const },
                            { label: 'Inativos', value: stats.inativos, filter: 'inativos' as const }
                        ].map((stat) => (
                            <button
                                key={stat.filter}
                                onClick={() => setActiveFilter(stat.filter)}
                                className={`p-3 rounded-xl text-center transition-all active:scale-95 ${activeFilter === stat.filter
                                    ? 'bg-white text-purple-600 shadow-lg'
                                    : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                            >
                                <div className="text-xl font-bold">{stat.value}</div>
                                <div className="text-[10px] font-medium opacity-80">{stat.label}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-16 h-16 rounded-full border-4 border-primary-100 border-t-primary-600 animate-spin" />
                    <p className="mt-4 text-slate-500 font-medium">Carregando tutoriais...</p>
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredTutoriais.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">📹</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                        {activeFilter === 'todos' ? 'Nenhum tutorial cadastrado' : `Nenhum tutorial ${activeFilter}`}
                    </h3>
                    <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                        {activeFilter === 'todos'
                            ? 'Adicione vídeos tutoriais para ajudar os usuários do sistema.'
                            : 'Tente outro filtro ou adicione novos tutoriais.'
                        }
                    </p>
                    {activeFilter === 'todos' && (
                        <Button variant="primary" onClick={() => openModal()} className="btn-premium">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Adicionar Primeiro Tutorial
                        </Button>
                    )}
                </div>
            )}

            {/* Tutorials Grid */}
            {!loading && filteredTutoriais.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTutoriais.map((tutorial, index) => (
                        <div
                            key={tutorial.id}
                            className={`group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${!tutorial.ativo ? 'opacity-60' : ''}`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            {/* Thumbnail */}
                            <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                                {getThumbnail(tutorial) ? (
                                    <img
                                        src={getThumbnail(tutorial)}
                                        alt={tutorial.titulo}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-5xl opacity-50">📹</span>
                                    </div>
                                )}

                                {/* Play Button Overlay */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all shadow-xl">
                                        <svg className="w-6 h-6 text-primary-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Category Badge */}
                                <div className="absolute top-3 left-3">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r ${CATEGORIAS.find(c => c.value === tutorial.categoria)?.color} shadow-lg`}>
                                        {CATEGORIAS.find(c => c.value === tutorial.categoria)?.icon}
                                    </span>
                                </div>

                                {/* Status Badges */}
                                <div className="absolute top-3 right-3 flex gap-1.5">
                                    {tutorial.publico && (
                                        <span className="px-2 py-1 bg-green-500 rounded-lg text-[10px] font-bold text-white shadow-lg">
                                            🌐
                                        </span>
                                    )}
                                    {!tutorial.ativo && (
                                        <span className="px-2 py-1 bg-red-500 rounded-lg text-[10px] font-bold text-white shadow-lg">
                                            ⏸️
                                        </span>
                                    )}
                                </div>

                                {/* Order Badge */}
                                <div className="absolute bottom-3 right-3">
                                    <span className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-xs font-bold text-white">
                                        #{tutorial.ordem}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="font-bold text-slate-800 line-clamp-1 group-hover:text-primary-600 transition-colors">
                                    {tutorial.titulo}
                                </h3>
                                {tutorial.descricao && (
                                    <p className="text-slate-500 text-sm mt-1 line-clamp-2">
                                        {tutorial.descricao}
                                    </p>
                                )}

                                {/* Perfis */}
                                {(tutorial.tutorial_perfis || []).length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-3">
                                        {(tutorial.tutorial_perfis || []).map(tp => (
                                            <span key={tp.id} className="text-xs">
                                                {PERFIS.find(p => p.value === tp.perfil)?.icon}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Stats Row */}
                                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        {(tutorial.visualizacoes || 0).toLocaleString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                        {(tutorial.likes || 0).toLocaleString()}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                                    <button
                                        onClick={() => openModal(tutorial)}
                                        className="flex-1 py-2 px-3 text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all active:scale-95"
                                    >
                                        <Icons.Edit className="w-4 h-4 inline mr-1" /> Editar
                                    </button>
                                    <button
                                        onClick={() => toggleAtivo(tutorial)}
                                        className="py-2 px-3 text-sm font-medium text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all active:scale-95"
                                    >
                                        {tutorial.ativo ? '⏸️' : '▶️'}
                                    </button>
                                    <button
                                        onClick={() => openDeleteModal(tutorial)}
                                        className="py-2 px-3 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                                    >
                                        <Icons.Trash className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Native Mobile Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
                        onClick={closeModal}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up overflow-hidden flex flex-col safe-area-inset-bottom">
                        {/* Drag Handle (Mobile) */}
                        <div className="sm:hidden flex justify-center py-3">
                            <div className="w-10 h-1 bg-slate-300 rounded-full" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                                    <span className="text-lg">{editingTutorial ? '✏️' : '📹'}</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">
                                        {editingTutorial ? 'Editar Tutorial' : 'Novo Tutorial'}
                                    </h2>
                                    <p className="text-xs text-slate-500">Preencha os dados abaixo</p>
                                </div>
                            </div>
                            <button
                                onClick={closeModal}
                                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors active:scale-95"
                            >
                                <Icons.X />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Título */}
                            <Input
                                label="Título *"
                                value={formData.titulo}
                                onChange={e => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                                placeholder="Ex: Como lançar notas"
                                required
                            />

                            {/* Descrição */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Descrição
                                </label>
                                <textarea
                                    value={formData.descricao}
                                    onChange={e => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                                    placeholder="Descreva o conteúdo do tutorial..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none transition-all"
                                />
                            </div>

                            {/* URL do Vídeo */}
                            <Input
                                label="URL do Vídeo *"
                                value={formData.url_video}
                                onChange={e => setFormData(prev => ({ ...prev, url_video: e.target.value }))}
                                placeholder="https://youtube.com/watch?v=..."
                                required
                            />

                            {/* Video Preview */}
                            {formData.url_video && (
                                <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 shadow-inner">
                                    <iframe
                                        src={getEmbedUrl(formData.url_video)}
                                        title="Preview"
                                        className="w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    />
                                </div>
                            )}

                            {/* Categoria & Ordem */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Categoria *
                                    </label>
                                    <select
                                        value={formData.categoria}
                                        onChange={e => setFormData(prev => ({ ...prev, categoria: e.target.value as CategoriaTutorial }))}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                        required
                                    >
                                        {CATEGORIAS.map(cat => (
                                            <option key={cat.value} value={cat.value}>
                                                {cat.icon} {cat.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <Input
                                    label="Ordem"
                                    type="number"
                                    value={formData.ordem.toString()}
                                    onChange={e => setFormData(prev => ({ ...prev, ordem: parseInt(e.target.value) || 0 }))}
                                    min="0"
                                />
                            </div>

                            {/* Toggles */}
                            <div className="grid grid-cols-2 gap-3">
                                <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.publico ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.publico}
                                        onChange={e => setFormData(prev => ({ ...prev, publico: e.target.checked }))}
                                        className="sr-only"
                                    />
                                    <span className="text-2xl">{formData.publico ? '🌐' : '🔒'}</span>
                                    <div>
                                        <div className="text-sm font-semibold text-slate-800">Público</div>
                                        <div className="text-[10px] text-slate-500">Visível sem login</div>
                                    </div>
                                </label>
                                <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.ativo ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.ativo}
                                        onChange={e => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                                        className="sr-only"
                                    />
                                    <span className="text-2xl">{formData.ativo ? '✅' : '⏸️'}</span>
                                    <div>
                                        <div className="text-sm font-semibold text-slate-800">Ativo</div>
                                        <div className="text-[10px] text-slate-500">Exibir no sistema</div>
                                    </div>
                                </label>
                            </div>

                            {/* Perfis */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-3">
                                    Visível para perfis
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {PERFIS.map(perfil => (
                                        <button
                                            key={perfil.value}
                                            type="button"
                                            onClick={() => togglePerfil(perfil.value)}
                                            className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium transition-all active:scale-95 ${formData.perfis.includes(perfil.value)
                                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            <span className="text-lg">{perfil.icon}</span>
                                            <span className="truncate">{perfil.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </form>

                        {/* Actions */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={closeModal}
                                    fullWidth
                                    className="!py-3"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    loading={saving}
                                    fullWidth
                                    className="btn-premium !py-3"
                                    onClick={handleSubmit}
                                >
                                    {saving ? 'Salvando...' : editingTutorial ? 'Salvar' : 'Criar'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {showDeleteModal && tutorialToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                        onClick={closeDeleteModal}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
                        {/* Animated Warning Header */}
                        <div className="relative bg-gradient-to-br from-red-500 via-rose-500 to-pink-600 px-6 py-8 text-center overflow-hidden">
                            {/* Animated Background Pattern */}
                            <div className="absolute inset-0 opacity-20">
                                <div className="absolute top-0 left-0 w-20 h-20 bg-white/30 rounded-full -translate-x-10 -translate-y-10 animate-pulse" />
                                <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/20 rounded-full translate-x-16 translate-y-16 animate-pulse" style={{ animationDelay: '0.5s' }} />
                            </div>

                            {/* Warning Icon with Animation */}
                            <div className="relative mx-auto mb-4">
                                <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center shadow-lg animate-bounce-subtle">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner">
                                        <svg className="w-10 h-10 text-red-500 animate-shake" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-1">Eliminar Tutorial?</h3>
                            <p className="text-white/80 text-sm">Esta ação não pode ser desfeita</p>
                        </div>

                        {/* Tutorial Info Card */}
                        <div className="px-6 py-5">
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <div className="flex items-start gap-4">
                                    {/* Thumbnail */}
                                    <div className="w-16 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 flex-shrink-0 shadow-sm">
                                        {getThumbnail(tutorialToDelete) ? (
                                            <img
                                                src={getThumbnail(tutorialToDelete)}
                                                alt={tutorialToDelete.titulo}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="text-xl opacity-50">📹</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-800 text-sm line-clamp-1">
                                            {tutorialToDelete.titulo}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white bg-gradient-to-r ${CATEGORIAS.find(c => c.value === tutorialToDelete.categoria)?.color}`}>
                                                {CATEGORIAS.find(c => c.value === tutorialToDelete.categoria)?.icon} {CATEGORIAS.find(c => c.value === tutorialToDelete.categoria)?.label}
                                            </span>
                                        </div>
                                        {tutorialToDelete.descricao && (
                                            <p className="text-slate-500 text-xs mt-1 line-clamp-1">
                                                {tutorialToDelete.descricao}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-slate-200">
                                    <div className="text-center">
                                        <div className="flex items-center gap-1 text-slate-600">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            <span className="text-xs font-semibold">{(tutorialToDelete.visualizacoes || 0).toLocaleString()}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400">visualizações</span>
                                    </div>
                                    <div className="text-center">
                                        <div className="flex items-center gap-1 text-slate-600">
                                            <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                            </svg>
                                            <span className="text-xs font-semibold">{(tutorialToDelete.likes || 0).toLocaleString()}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400">curtidas</span>
                                    </div>
                                </div>
                            </div>

                            {/* Warning Message */}
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                <div className="flex items-start gap-2">
                                    <span className="text-lg">⚠️</span>
                                    <p className="text-xs text-amber-700 leading-relaxed">
                                        Todos os dados associados a este tutorial serão <strong>permanentemente eliminados</strong>, incluindo estatísticas e configurações de perfil.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="px-6 pb-6">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={closeDeleteModal}
                                    disabled={deleting}
                                    className="flex-1 py-3.5 px-4 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDeleteTutorial}
                                    disabled={deleting}
                                    className="flex-1 py-3.5 px-4 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 rounded-xl shadow-lg shadow-red-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {deleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Eliminando...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Sim, Eliminar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default TutoriaisManagementPage
