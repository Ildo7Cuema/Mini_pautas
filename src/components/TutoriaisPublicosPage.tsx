/**
 * @component TutoriaisPublicosPage
 * @description Página pública para exibir tutoriais do sistema EduGest Angola
 * @tokens [--color-primary, --gradient-primary]
 * @responsive true
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Button } from './ui/Button'
import { Card, CardBody } from './ui/Card'
import type { Tutorial, CategoriaTutorial } from '../types'

interface TutoriaisPublicosPageProps {
    onBack?: () => void
}

const CATEGORIAS: { value: CategoriaTutorial | 'todos'; label: string; icon: string }[] = [
    { value: 'todos', label: 'Todos', icon: '📚' },
    { value: 'geral', label: 'Geral', icon: '🎯' },
    { value: 'login', label: 'Login & Cadastro', icon: '🔐' },
    { value: 'turmas', label: 'Turmas', icon: '👥' },
    { value: 'notas', label: 'Notas', icon: '📝' },
    { value: 'relatorios', label: 'Relatórios', icon: '📊' },
    { value: 'configuracoes', label: 'Configurações', icon: '⚙️' }
]

export const TutoriaisPublicosPage: React.FC<TutoriaisPublicosPageProps> = ({ onBack }) => {
    const [tutoriais, setTutoriais] = useState<Tutorial[]>([])
    const [loading, setLoading] = useState(true)
    const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaTutorial | 'todos'>('todos')
    const [tutorialSelecionado, setTutorialSelecionado] = useState<Tutorial | null>(null)

    useEffect(() => {
        loadTutoriais()
    }, [])

    const loadTutoriais = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('tutoriais')
                .select('*')
                .eq('publico', true)
                .eq('ativo', true)
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

    const tutoriaisFiltrados = categoriaFiltro === 'todos'
        ? tutoriais
        : tutoriais.filter(t => t.categoria === categoriaFiltro)

    // Convert YouTube URL to embed URL
    const getEmbedUrl = (url: string): string => {
        // Handle YouTube URLs
        if (url.includes('youtube.com/watch')) {
            const videoId = new URL(url).searchParams.get('v')
            return `https://www.youtube.com/embed/${videoId}`
        }
        if (url.includes('youtu.be/')) {
            const videoId = url.split('youtu.be/')[1]?.split('?')[0]
            return `https://www.youtube.com/embed/${videoId}`
        }
        // Already embed URL or Vimeo
        if (url.includes('/embed/') || url.includes('player.vimeo.com')) {
            return url
        }
        // Handle Vimeo URLs
        if (url.includes('vimeo.com/')) {
            const videoId = url.split('vimeo.com/')[1]?.split('?')[0]
            return `https://player.vimeo.com/video/${videoId}`
        }
        return url
    }

    // Get thumbnail from YouTube URL
    const getThumbnail = (tutorial: Tutorial): string => {
        if (tutorial.thumbnail_url) return tutorial.thumbnail_url

        const url = tutorial.url_video
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            let videoId = ''
            if (url.includes('youtube.com/watch')) {
                videoId = new URL(url).searchParams.get('v') || ''
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
            } else if (url.includes('/embed/')) {
                videoId = url.split('/embed/')[1]?.split('?')[0] || ''
            }
            if (videoId) {
                return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            }
        }
        return '/placeholder-video.png'
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/80 to-indigo-100">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="blob blob-1 w-[500px] h-[500px] -top-32 -right-32" />
                <div className="blob blob-2 w-[400px] h-[400px] -bottom-24 -left-24" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 rounded-xl bg-white/80 hover:bg-white shadow-sm transition-all"
                            >
                                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-3">
                                <span className="text-3xl">📹</span>
                                Tutoriais
                            </h1>
                            <p className="text-slate-500 text-sm mt-1">
                                Aprenda a usar o EduGest Angola
                            </p>
                        </div>
                    </div>

                    {onBack && (
                        <Button
                            variant="ghost"
                            onClick={onBack}
                            className="hidden sm:flex"
                        >
                            ← Voltar ao Login
                        </Button>
                    )}
                </div>

                {/* Category Filter */}
                <div className="mb-8 overflow-x-auto pb-2">
                    <div className="flex gap-2 min-w-max">
                        {CATEGORIAS.map((cat) => (
                            <button
                                key={cat.value}
                                onClick={() => setCategoriaFiltro(cat.value)}
                                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${categoriaFiltro === cat.value
                                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                                        : 'bg-white/80 text-slate-600 hover:bg-white hover:shadow-md'
                                    }`}
                            >
                                <span className="mr-2">{cat.icon}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600" />
                    </div>
                )}

                {/* Empty State */}
                {!loading && tutoriaisFiltrados.length === 0 && (
                    <Card className="bg-white/80 backdrop-blur-sm">
                        <CardBody className="py-16 text-center">
                            <div className="text-6xl mb-4">📹</div>
                            <h3 className="text-xl font-semibold text-slate-800 mb-2">
                                Nenhum tutorial disponível
                            </h3>
                            <p className="text-slate-500">
                                {categoriaFiltro !== 'todos'
                                    ? 'Não há tutoriais nesta categoria.'
                                    : 'Os tutoriais serão adicionados em breve.'}
                            </p>
                        </CardBody>
                    </Card>
                )}

                {/* Tutorials Grid */}
                {!loading && tutoriaisFiltrados.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tutoriaisFiltrados.map((tutorial) => (
                            <Card
                                key={tutorial.id}
                                className="bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
                                onClick={() => setTutorialSelecionado(tutorial)}
                            >
                                {/* Thumbnail */}
                                <div className="relative aspect-video bg-slate-100 overflow-hidden">
                                    <img
                                        src={getThumbnail(tutorial)}
                                        alt={tutorial.titulo}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,' + encodeURIComponent(`
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225" fill="none">
                                                    <rect width="400" height="225" fill="#e2e8f0"/>
                                                    <circle cx="200" cy="112" r="40" fill="#cbd5e1"/>
                                                    <path d="M188 92v40l30-20z" fill="#94a3b8"/>
                                                </svg>
                                            `)
                                        }}
                                    />
                                    {/* Play Button Overlay */}
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                            <svg className="w-8 h-8 text-primary-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    </div>
                                    {/* Category Badge */}
                                    <div className="absolute top-3 left-3">
                                        <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-medium text-slate-700">
                                            {CATEGORIAS.find(c => c.value === tutorial.categoria)?.icon}{' '}
                                            {CATEGORIAS.find(c => c.value === tutorial.categoria)?.label || tutorial.categoria}
                                        </span>
                                    </div>
                                </div>

                                <CardBody className="p-4">
                                    <h3 className="font-semibold text-slate-800 group-hover:text-primary-600 transition-colors line-clamp-2">
                                        {tutorial.titulo}
                                    </h3>
                                    {tutorial.descricao && (
                                        <p className="text-slate-500 text-sm mt-2 line-clamp-2">
                                            {tutorial.descricao}
                                        </p>
                                    )}
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Video Modal */}
                {tutorialSelecionado && (
                    <div
                        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                        onClick={() => setTutorialSelecionado(null)}
                    >
                        <div
                            className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl animate-scale-in"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                                <h3 className="font-semibold text-slate-800 text-lg line-clamp-1">
                                    {tutorialSelecionado.titulo}
                                </h3>
                                <button
                                    onClick={() => setTutorialSelecionado(null)}
                                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Video Player */}
                            <div className="aspect-video bg-black">
                                <iframe
                                    src={getEmbedUrl(tutorialSelecionado.url_video)}
                                    title={tutorialSelecionado.titulo}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>

                            {/* Modal Footer */}
                            {tutorialSelecionado.descricao && (
                                <div className="p-4 border-t border-slate-100">
                                    <p className="text-slate-600 text-sm">
                                        {tutorialSelecionado.descricao}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="relative z-10 text-center py-8 border-t border-slate-200/50">
                <p className="text-slate-500 text-sm">
                    © 2025 EduGest Angola · Sistema de Gestão Educacional
                </p>
            </div>
        </div>
    )
}

export default TutoriaisPublicosPage
