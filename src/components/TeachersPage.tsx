/*
component-meta:
  name: TeachersPage
  description: Page for managing teachers/professores
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
import { ConfirmModal } from './ui/ConfirmModal'
import { useAuth } from '../contexts/AuthContext'

interface Professor {
    id: string
    user_id?: string | null
    nome_completo: string
    email: string
    telefone: string
    especialidade: string
    ativo: boolean
    numero_agente: string
}
interface TeachersPageProps {
    onNavigate?: (page: string) => void
}
export const TeachersPage: React.FC<TeachersPageProps> = ({ onNavigate }) => {

    const { escolaProfile } = useAuth()
    const [professores, setProfessores] = useState<Professor[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showConfirmDelete, setShowConfirmDelete] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [selectedProfessorId, setSelectedProfessorId] = useState<string | null>(null)
    const [professorToDelete, setProfessorToDelete] = useState<string | null>(null)

    // Form data
    const [formData, setFormData] = useState({
        nome_completo: '',
        email: '',
        telefone: '',
        especialidade: '',
        numero_agente: '',
    })

    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (escolaProfile) {
            loadProfessores()
        }
    }, [escolaProfile])

    const handleCopyInvite = (professor: Professor) => {
        const origin = window.location.origin
        const inviteLink = `${origin}/register-professor?email=${encodeURIComponent(professor.email)}`

        navigator.clipboard.writeText(inviteLink).then(() => {
            setSuccess('Link de convite copiado para a área de transferência!')
            setTimeout(() => setSuccess(null), 3000)
        }).catch(() => {
            setError('Erro ao copiar link. Tente manualmente.')
        })
    }

    const loadProfessores = async () => {
        if (!escolaProfile) return

        try {
            setLoading(true)
            setError(null)

            const { data, error } = await supabase
                .from('professores')
                .select('*')
                .eq('escola_id', escolaProfile.id)
                .order('nome_completo', { ascending: true })

            if (error) throw error

            setProfessores(data || [])
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar professores'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!escolaProfile) return

        setError(null)
        setSuccess(null)
        setSubmitting(true)

        try {
            // Validate required fields
            if (!formData.nome_completo || !formData.email) {
                throw new Error('Nome e Email são obrigatórios')
            }

            if (editMode && selectedProfessorId) {
                // Update existing professor
                const { error: updateError } = await supabase
                    .from('professores')
                    .update({
                        nome_completo: formData.nome_completo,
                        email: formData.email,
                        telefone: formData.telefone,
                        especialidade: formData.especialidade,
                        numero_agente: formData.numero_agente,
                    })
                    .eq('id', selectedProfessorId)

                if (updateError) throw updateError
                setSuccess('Professor atualizado com sucesso!')
            } else {
                // Create new professor
                // NOTE: This might fail if user_id is NOT NULL and we don't provide it.
                // Assuming we can create a professor record first or there's a trigger handling it.
                // If it fails, we need a "Invite Professor" flow that creates an Auth User.

                // Generating a temporary dummy user_id if strict constraint exists is risky.
                // Let's try inserting without user_id first if the schema allows nullable.
                // If the schema requires user_id, this insert will fail and we'll see the error.

                const { error: insertError } = await supabase
                    .from('professores')
                    .insert({
                        escola_id: escolaProfile.id,
                        nome_completo: formData.nome_completo,
                        email: formData.email,
                        telefone: formData.telefone,
                        especialidade: formData.especialidade,
                        numero_agente: formData.numero_agente,
                        ativo: true,
                        funcoes: ['Docente'],
                        // user_id: ??? - If required, we have a problem without creating Auth user.
                    })

                if (insertError) {
                    throw insertError
                }

                setSuccess('Professor cadastrado com sucesso!')
            }

            setShowModal(false)
            resetForm()
            loadProfessores()
        } catch (err) {
            console.error('Erro ao salvar professor:', err)
            const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar professor'
            setError(translateError(errorMessage))
        } finally {
            setSubmitting(false)
        }
    }

    const resetForm = () => {
        setEditMode(false)
        setSelectedProfessorId(null)
        setFormData({
            nome_completo: '',
            email: '',
            telefone: '',
            especialidade: '',
            numero_agente: '',
        })
    }

    const handleEdit = (professor: Professor) => {
        setEditMode(true)
        setSelectedProfessorId(professor.id)
        setFormData({
            nome_completo: professor.nome_completo,
            email: professor.email,
            telefone: professor.telefone || '',
            especialidade: professor.especialidade || '',
            numero_agente: professor.numero_agente || '',
        })
        setShowModal(true)
    }

    const handleDeleteClick = (id: string) => {
        setProfessorToDelete(id)
        setShowConfirmDelete(true)
    }

    const handleConfirmDelete = async () => {
        if (!professorToDelete) return

        try {
            const { error } = await supabase
                .from('professores')
                .delete()
                .eq('id', professorToDelete)

            if (error) throw error

            setSuccess('Professor removido com sucesso!')
            setShowConfirmDelete(false)
            setProfessorToDelete(null)
            loadProfessores()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao remover professor'
            setError(translateError(errorMessage))
            setShowConfirmDelete(false)
            setProfessorToDelete(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="mt-4 text-slate-600">Carregando professores...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900">Professores</h2>
                    <p className="text-sm md:text-base text-slate-600 mt-1">Gerencie o corpo docente da escola</p>
                </div>
                <Button
                    variant="primary"
                    icon={<Icons.UserPlus />}
                    onClick={() => {
                        resetForm()
                        setShowModal(true)
                    }}
                    className="w-full sm:w-auto"
                >
                    Novo Professor
                </Button>
            </div>

            {/* Messages */}
            {success && (
                <div className="alert alert-success animate-slide-down">
                    <Icons.Check />
                    <span className="ml-2 text-sm">{success}</span>
                </div>
            )}

            {error && (
                <div className="alert alert-error animate-slide-down">
                    <span className="ml-2 text-sm">{error}</span>
                </div>
            )}

            {/* Empty State */}
            {!loading && professores.length === 0 && !error ? (
                <Card>
                    <CardBody className="text-center py-8 md:py-12">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Icons.User className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-2">Nenhum professor cadastrado</h3>
                        <p className="text-sm md:text-base text-slate-600 mb-4">Cadastre os professores para vinculá-los às turmas</p>
                        <Button variant="primary" onClick={() => setShowModal(true)} className="w-full sm:w-auto">
                            Cadastrar Professor
                        </Button>
                    </CardBody>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {professores.map((prof) => (
                        <Card key={prof.id} className="hover:shadow-lg transition-shadow">
                            <CardBody className="p-4 md:p-6">
                                <div className="flex items-start justify-between mb-3 md:mb-4">
                                    <div className="flex flex-col">
                                        <h3 className="text-base md:text-lg font-semibold text-slate-900 truncate">{prof.nome_completo}</h3>
                                        <p className="text-xs md:text-sm text-slate-500">{prof.email}</p>
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${prof.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                        {prof.ativo ? 'Ativo' : 'Inativo'}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ml-2 ${prof.user_id ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                        {prof.user_id ? 'Registado' : 'Pendente'}
                                    </span>
                                </div>

                                <div className="space-y-2 mb-4">
                                    {prof.especialidade && (
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Especialidade:</span>
                                            <span className="text-sm">{prof.especialidade}</span>
                                        </div>
                                    )}
                                    {prof.telefone && (
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Icons.Phone className="w-4 h-4" />
                                            <span className="text-sm">{prof.telefone}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 border-t pt-4 mt-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(prof)}
                                        className="flex-1"
                                    >
                                        <span className="mr-2">Editar</span>
                                        <Icons.Edit className="w-4 h-4" />
                                    </Button>

                                    {!prof.user_id && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleCopyInvite(prof)}
                                            className="min-h-touch min-w-touch"
                                            title="Copiar link de convite"
                                        >
                                            <Icons.Link className="w-4 h-4" />
                                        </Button>
                                    )}

                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => handleDeleteClick(prof.id)}
                                        className="min-h-touch min-w-touch"
                                    >
                                        <Icons.Trash className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center md:p-4 z-50 animate-fade-in">
                    <Card className="w-full md:max-w-md md:rounded-lg rounded-t-2xl rounded-b-none md:rounded-b-lg animate-slide-up max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-900">{editMode ? 'Editar Professor' : 'Novo Professor'}</h3>
                                <button
                                    onClick={() => {
                                        setShowModal(false)
                                        resetForm()
                                    }}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <Icons.X className="w-6 h-6" />
                                </button>
                            </div>
                        </CardHeader>
                        <CardBody>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input
                                    label="Nome Completo"
                                    type="text"
                                    value={formData.nome_completo}
                                    onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                                    placeholder="Ex: João da Silva"
                                    required
                                />

                                <Input
                                    label="Email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="professor@exemplo.com"
                                    required
                                />

                                <Input
                                    label="Telefone"
                                    type="tel"
                                    value={formData.telefone}
                                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                    placeholder="+244 9..."
                                />

                                <Input
                                    label="Especialidade"
                                    type="text"
                                    value={formData.especialidade}
                                    onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
                                    placeholder="Ex: Matemática, Física"
                                />

                                <Input
                                    label="Número de Agente"
                                    type="text"
                                    value={formData.numero_agente}
                                    onChange={(e) => setFormData({ ...formData, numero_agente: e.target.value })}
                                    placeholder="Número de identificação escolar"
                                />

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => {
                                            setShowModal(false)
                                            resetForm()
                                        }}
                                        className="flex-1"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button type="submit" variant="primary" loading={submitting} className="flex-1">
                                        {editMode ? 'Salvar' : 'Cadastrar'}
                                    </Button>
                                </div>
                            </form>
                        </CardBody>
                    </Card>
                </div>
            )}

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={showConfirmDelete}
                onClose={() => {
                    setShowConfirmDelete(false)
                    setProfessorToDelete(null)
                }}
                onConfirm={handleConfirmDelete}
                title="Remover Professor?"
                message="Tem certeza que deseja remover este professor? Isso pode afetar turmas e histórico."
                confirmText="Sim, Remover"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    )
}
