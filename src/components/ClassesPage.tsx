/*
component-meta:
  name: ClassesPage
  description: Page for managing classes/turmas
  tokens: [--color-primary, --fs-md, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Icons } from './ui/Icons'
import { translateError } from '../utils/translations'
import { ProfileSetupModal } from './ProfileSetupModal'
import { ConfirmModal } from './ui/ConfirmModal'
import { useAuth } from '../contexts/AuthContext'

interface Turma {
    id: string
    nome: string
    ano_lectivo: string
    trimestre: number
    total_alunos?: number
}

interface ClassesPageProps {
    onNavigate?: (page: string, params?: { turmaId?: string }) => void
    searchQuery?: string
}

export const ClassesPage: React.FC<ClassesPageProps> = ({ onNavigate, searchQuery = '' }) => {
    const { isProfessor } = useAuth()
    const [turmas, setTurmas] = useState<Turma[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showProfileSetup, setShowProfileSetup] = useState(false)
    const [showConfirmDelete, setShowConfirmDelete] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [selectedTurmaId, setSelectedTurmaId] = useState<string | null>(null)
    const [turmaToDelete, setTurmaToDelete] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        nome: '',
        ano_lectivo: new Date().getFullYear(),
        trimestre: 1,
        nivel_ensino: 'Ensino Secundário',
    })
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        loadTurmas()
    }, [])

    const loadTurmas = async () => {
        try {
            setLoading(true)
            setError(null) // Clear any previous errors
            const { data, error } = await supabase
                .from('turmas')
                .select(`
          id,
          nome,
          ano_lectivo,
          trimestre,
          alunos(count)
        `)
                .order('created_at', { ascending: false })

            if (error) throw error

            const turmasWithCount = data?.map(turma => ({
                ...turma,
                total_alunos: turma.alunos?.[0]?.count || 0
            })) || []

            setTurmas(turmasWithCount)
            // Successfully loaded - clear any previous errors
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar turmas'
            setError(translateError(errorMessage))
            setTurmas([]) // Clear turmas on error
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)
        setSubmitting(true)
        console.log('🔄 Iniciando criação de turma...', formData)

        try {
            if (editMode && selectedTurmaId) {
                // Update existing turma
                const { error: updateError } = await supabase
                    .from('turmas')
                    .update({
                        nome: formData.nome,
                        ano_lectivo: formData.ano_lectivo,
                        trimestre: formData.trimestre,
                        nivel_ensino: formData.nivel_ensino,
                    })
                    .eq('id', selectedTurmaId)

                if (updateError) throw updateError

                setSuccess('Turma atualizada com sucesso!')
            } else {
                // Get current user
                const { data: { user } } = await supabase.auth.getUser()
                console.log('🔍 DEBUG - User:', user)
                if (!user) throw new Error('Usuário não autenticado')

                // Get professor profile with escola_id
                console.log('🔍 DEBUG - Buscando professor com user_id:', user.id)
                const { data: professor, error: profError } = await supabase
                    .from('professores')
                    .select('id, escola_id')
                    .eq('user_id', user.id)
                    .maybeSingle()

                console.log('🔍 DEBUG - Resposta professor:', { professor, profError })

                if (profError) {
                    console.error('❌ ERRO ao buscar professor:', profError)
                    throw profError
                }

                if (!professor) {
                    // Show profile setup modal instead of throwing error
                    setShowProfileSetup(true)
                    setShowModal(false)
                    return
                }

                // Auto-generate codigo_turma (e.g., "10A-2025-T1")
                const nomeSimplificado = formData.nome.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)
                const codigo_turma = `${nomeSimplificado}-${formData.ano_lectivo}-T${formData.trimestre}`

                // Create turma
                const { error: insertError } = await supabase
                    .from('turmas')
                    .insert({
                        nome: formData.nome,
                        ano_lectivo: formData.ano_lectivo,
                        trimestre: formData.trimestre,
                        nivel_ensino: formData.nivel_ensino,
                        codigo_turma: codigo_turma,
                        professor_id: professor.id,
                        escola_id: professor.escola_id,
                        capacidade_maxima: 40,
                    })

                if (insertError) throw insertError

                setSuccess('Turma criada com sucesso!')
            }

            setShowModal(false)
            setEditMode(false)
            setSelectedTurmaId(null)
            setFormData({
                nome: '',
                ano_lectivo: new Date().getFullYear(),
                trimestre: 1,
                nivel_ensino: 'Ensino Secundário',
            })
            loadTurmas()
        } catch (err) {
            console.error('❌ Erro ao criar/atualizar turma:', err)
            const errorMessage = err instanceof Error ? err.message : editMode ? 'Erro ao atualizar turma' : 'Erro ao criar turma'
            setError(translateError(errorMessage))
        } finally {
            setSubmitting(false)
        }
    }

    const handleEdit = (turma: Turma) => {
        setEditMode(true)
        setSelectedTurmaId(turma.id)
        setFormData({
            nome: turma.nome,
            ano_lectivo: parseInt(turma.ano_lectivo),
            trimestre: turma.trimestre,
            nivel_ensino: 'Ensino Secundário', // Default since we don't store this in the Turma interface
        })
        setShowModal(true)
    }

    const handleDeleteClick = (id: string) => {
        setTurmaToDelete(id)
        setShowConfirmDelete(true)
    }

    const handleConfirmDelete = async () => {
        if (!turmaToDelete) return

        try {
            const { error } = await supabase
                .from('turmas')
                .delete()
                .eq('id', turmaToDelete)

            if (error) throw error

            setSuccess('Turma excluída com sucesso!')
            setShowConfirmDelete(false)
            setTurmaToDelete(null)
            loadTurmas()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir turma'
            setError(translateError(errorMessage))
            setShowConfirmDelete(false)
            setTurmaToDelete(null)
        }
    }

    const handleViewDetails = (turmaId: string) => {
        if (onNavigate) {
            onNavigate('class-details', { turmaId })
        }
    }

    const handleNewTurma = () => {
        setEditMode(false)
        setSelectedTurmaId(null)
        setFormData({
            nome: '',
            ano_lectivo: new Date().getFullYear(),
            trimestre: 1,
            nivel_ensino: 'Ensino Secundário',
        })
        setShowModal(true)
    }

    // Filter turmas based on search query
    const filteredTurmas = turmas.filter(turma =>
        turma.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        turma.ano_lectivo.toString().includes(searchQuery) ||
        `${turma.trimestre}º trim`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `trimestre ${turma.trimestre}`.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center animate-fade-in">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-primary-600"></div>
                    <p className="mt-4 text-slate-500 font-medium animate-pulse">Carregando turmas...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Minhas Turmas</h2>
                    <p className="text-slate-500 mt-1">Gerencie suas turmas, alunos e pautas.</p>
                </div>
                <Button
                    variant="primary"
                    icon={<Icons.UserPlus />}
                    onClick={handleNewTurma}
                    className="w-full sm:w-auto btn-premium shadow-lg shadow-primary-500/20"
                >
                    Nova Turma
                </Button>
            </div>

            {/* Messages */}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center shadow-sm animate-slide-down">
                    <Icons.Check />
                    <span className="ml-2 font-medium">{success}</span>
                </div>
            )}

            {/* Turmas Grid */}
            {error ? (
                <Card className="border-red-100 shadow-red-100/50">
                    <CardBody className="text-center py-12">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Erro ao carregar turmas</h3>
                        <p className="text-slate-500 mb-6 max-w-md mx-auto">{error}</p>
                        <Button variant="primary" onClick={loadTurmas} className="w-full sm:w-auto">
                            Tentar Novamente
                        </Button>
                    </CardBody>
                </Card>
            ) : filteredTurmas.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
                    <CardBody className="text-center py-16 px-6">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-6 relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50 to-purple-50 rounded-2xl opacity-50"></div>
                            <svg className="w-10 h-10 text-indigo-300 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                            {searchQuery ? 'Nenhuma turma encontrada' : 'Nenhuma turma criada'}
                        </h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                            {searchQuery ? 'Tente ajustar seus termos de pesquisa para encontrar o que procura.' : 'Comece criando sua primeira turma para gerenciar alunos e lançar notas.'}
                        </p>
                        {!searchQuery && (
                            <Button
                                variant="primary"
                                onClick={handleNewTurma}
                                className="btn-premium shadow-lg shadow-primary-500/20"
                            >
                                <Icons.UserPlus className="mr-2" />
                                Criar Primeira Turma
                            </Button>
                        )}
                    </CardBody>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
                    {filteredTurmas.map((turma, index) => (
                        <Card
                            key={turma.id}
                            className="group hover:shadow-xl hover:shadow-slate-300/30 transition-all duration-300 border-0 shadow-md shadow-slate-200/50 overflow-hidden relative"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            {/* Decorative Gradient Background */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110 opacity-60" />

                            <CardBody className="p-6 relative z-10">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-primary-600 text-white flex items-center justify-center text-lg font-bold shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                                        {turma.nome.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-white shadow-sm text-slate-600 border border-slate-100">
                                        {turma.trimestre}º Trimestre
                                    </span>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-primary-600 transition-colors truncate" title={turma.nome}>
                                        {turma.nome}
                                    </h3>
                                    <p className="text-sm text-slate-500 font-medium">Ano Lectivo: {turma.ano_lectivo}</p>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-slate-600 mb-6 bg-slate-50/80 p-3 rounded-lg border border-slate-100/50">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        <span className="font-semibold">{turma.total_alunos}</span> <span className="text-slate-400">alunos</span>
                                    </div>
                                    <div className="w-px h-4 bg-slate-200"></div>
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="font-semibold text-slate-400">--</span> <span className="text-slate-400">média</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="primary"
                                        onClick={() => handleViewDetails(turma.id)}
                                        className="min-h-touch min-w-[44px] sm:flex-1 shadow-md shadow-primary-500/10 group-hover:shadow-primary-500/20 whitespace-nowrap"
                                    >
                                        <span className="hidden sm:inline">Ver Detalhes</span>
                                        <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </Button>
                                    {!isProfessor && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleEdit(turma)}
                                                className="min-h-touch min-w-[44px] px-3 hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                                                title="Editar Turma"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleDeleteClick(turma.id)}
                                                className="min-h-touch min-w-[44px] px-3 hover:bg-red-50 text-slate-400 hover:text-red-500"
                                                title="Excluir Turma"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4 z-50 animate-fade-in">
                    <Card className="w-full md:max-w-md bg-white shadow-2xl ring-1 ring-black/5 rounded-t-2xl md:rounded-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
                        <CardHeader className="border-b border-slate-100 p-5 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900">{editMode ? 'Editar Turma' : 'Nova Turma'}</h3>
                                <button
                                    onClick={() => {
                                        setShowModal(false)
                                        setEditMode(false)
                                        setSelectedTurmaId(null)
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </CardHeader>
                        <CardBody className="p-6 space-y-6">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-4">
                                    <div className="input-glow rounded-xl">
                                        <Input
                                            label="Nome da Turma"
                                            type="text"
                                            value={formData.nome}
                                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                            placeholder="Ex: 10ª Classe A"
                                            required
                                        />
                                    </div>

                                    <div className="input-glow rounded-xl">
                                        <Input
                                            label="Ano Lectivo"
                                            type="number"
                                            value={formData.ano_lectivo}
                                            onChange={(e) => setFormData({ ...formData, ano_lectivo: parseInt(e.target.value) })}
                                            placeholder="2025"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label block text-sm font-medium text-slate-700 mb-1.5">Nível de Ensino</label>
                                        <div className="relative">
                                            <select
                                                value={formData.nivel_ensino}
                                                onChange={(e) => setFormData({ ...formData, nivel_ensino: e.target.value })}
                                                className="w-full appearance-none bg-white border border-slate-300 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block p-3 pr-10 shadow-sm transition-all hover:border-slate-400"
                                                required
                                            >
                                                <option value="Ensino Primário">Ensino Primário</option>
                                                <option value="Ensino Secundário">Ensino Secundário</option>
                                                <option value="Ensino Médio">Ensino Médio</option>
                                                <option value="Ensino Técnico">Ensino Técnico</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="lg"
                                        onClick={() => {
                                            setShowModal(false)
                                            setEditMode(false)
                                            setSelectedTurmaId(null)
                                        }}
                                        className="flex-1"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="lg"
                                        loading={submitting}
                                        className="flex-1 btn-premium shadow-lg shadow-primary-500/20"
                                    >
                                        {editMode ? 'Salvar Alterações' : 'Criar Turma'}
                                    </Button>
                                </div>
                            </form>
                        </CardBody>
                    </Card>
                </div>
            )}

            {/* Profile Setup Modal */}
            {showProfileSetup && (
                <ProfileSetupModal
                    onComplete={() => {
                        setShowProfileSetup(false)
                        setSuccess('Perfil criado com sucesso! Agora pode criar turmas.')
                        loadTurmas()
                    }}
                />
            )}

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={showConfirmDelete}
                onClose={() => {
                    setShowConfirmDelete(false)
                    setTurmaToDelete(null)
                }}
                onConfirm={handleConfirmDelete}
                title="Excluir Turma"
                message="Tem certeza que deseja excluir esta turma? Todos os alunos, notas e dados associados serão removidos permanentemente."
                confirmText="Sim, Excluir Turma"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    )
}
