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
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="mt-4 text-slate-600">Carregando turmas...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900">Minhas Turmas</h2>
                    <p className="text-sm md:text-base text-slate-600 mt-1">Gerencie suas turmas e alunos</p>
                </div>
                <Button
                    variant="primary"
                    icon={<Icons.UserPlus />}
                    onClick={handleNewTurma}
                    className="w-full sm:w-auto"
                >
                    Nova Turma
                </Button>
            </div>

            {/* Messages */}
            {success && (
                <div className="alert alert-success animate-slide-down">
                    <Icons.Check />
                    <span className="ml-2 text-sm">{success}</span>
                </div>
            )}

            {/* Turmas Grid - Stack on mobile, grid on desktop */}
            {error ? (
                <Card>
                    <CardBody className="text-center py-8 md:py-12">
                        <svg className="w-12 h-12 md:w-16 md:h-16 text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-2">Erro ao carregar turmas</h3>
                        <p className="text-sm md:text-base text-slate-600 mb-4">{error}</p>
                        <Button variant="primary" onClick={loadTurmas} className="w-full sm:w-auto">
                            Tentar Novamente
                        </Button>
                    </CardBody>
                </Card>
            ) : filteredTurmas.length === 0 ? (
                <Card>
                    <CardBody className="text-center py-8 md:py-12">
                        <svg className="w-12 h-12 md:w-16 md:h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-2">
                            {searchQuery ? 'Nenhuma turma encontrada' : 'Nenhuma turma encontrada'}
                        </h3>
                        <p className="text-sm md:text-base text-slate-600 mb-4">
                            {searchQuery ? 'Tente pesquisar com outros termos' : 'Comece criando sua primeira turma'}
                        </p>
                        {!searchQuery && (
                            <Button variant="primary" onClick={handleNewTurma} className="w-full sm:w-auto">
                                Criar Primeira Turma
                            </Button>
                        )}
                    </CardBody>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {filteredTurmas.map((turma) => (
                        <Card key={turma.id} className="hover:shadow-lg transition-shadow">
                            <CardBody className="p-4 md:p-6">
                                <div className="flex items-start justify-between mb-3 md:mb-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-1 truncate">{turma.nome}</h3>
                                        <p className="text-xs md:text-sm text-slate-600">Ano Lectivo: {turma.ano_lectivo}</p>
                                    </div>
                                    <span className="badge badge-primary text-xs ml-2 flex-shrink-0">{turma.trimestre}º Trim</span>
                                </div>

                                <div className="flex items-center gap-2 text-slate-600 mb-3 md:mb-4">
                                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    <span className="text-xs md:text-sm">{turma.total_alunos} alunos</span>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => handleViewDetails(turma.id)}
                                        className="flex-1 min-h-touch"
                                    >
                                        Ver Detalhes
                                    </Button>
                                    {!isProfessor && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(turma)}
                                                className="min-h-touch min-w-touch"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => handleDeleteClick(turma.id)}
                                                className="min-h-touch min-w-touch"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* Modal - Full screen on mobile */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center md:p-4 z-50 animate-fade-in">
                    <Card className="w-full md:max-w-md md:rounded-lg rounded-t-2xl rounded-b-none md:rounded-b-lg animate-slide-up max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-900">{editMode ? 'Editar Turma' : 'Nova Turma'}</h3>
                                <button
                                    onClick={() => {
                                        setShowModal(false)
                                        setEditMode(false)
                                        setSelectedTurmaId(null)
                                    }}
                                    className="text-slate-400 hover:text-slate-600 min-h-touch min-w-touch flex items-center justify-center -mr-2"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </CardHeader>
                        <CardBody>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input
                                    label="Nome da Turma"
                                    type="text"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    placeholder="Ex: 10ª Classe A"
                                    required
                                />

                                <Input
                                    label="Ano Lectivo"
                                    type="number"
                                    value={formData.ano_lectivo}
                                    onChange={(e) => setFormData({ ...formData, ano_lectivo: parseInt(e.target.value) })}
                                    placeholder="2025"
                                    required
                                />

                                <div>
                                    <label className="form-label">Nível de Ensino</label>
                                    <select
                                        value={formData.nivel_ensino}
                                        onChange={(e) => setFormData({ ...formData, nivel_ensino: e.target.value })}
                                        className="form-input min-h-touch"
                                        required
                                    >
                                        <option value="Ensino Primário">Ensino Primário</option>
                                        <option value="Ensino Secundário">Ensino Secundário</option>
                                        <option value="Ensino Médio">Ensino Médio</option>
                                        <option value="Ensino Técnico">Ensino Técnico</option>
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => {
                                            setShowModal(false)
                                            setEditMode(false)
                                            setSelectedTurmaId(null)
                                        }}
                                        className="flex-1"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button type="submit" variant="primary" loading={submitting} className="flex-1">
                                        {editMode ? 'Atualizar Turma' : 'Criar Turma'}
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
                title="Excluir Turma?"
                message="Tem certeza que deseja excluir esta turma? Esta ação não pode ser desfeita e todos os dados associados serão removidos."
                confirmText="Sim, Excluir"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    )
}
