import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Icons } from './ui/Icons'
import { translateError } from '../utils/translations'

interface Turma {
    id: string
    nome: string
    ano_lectivo: string
    trimestre_atual: number
    total_alunos?: number
}

export const ClassesPage: React.FC = () => {
    const [turmas, setTurmas] = useState<Turma[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({
        nome: '',
        ano_lectivo: new Date().getFullYear().toString(),
        trimestre_atual: 1,
    })
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    useEffect(() => {
        loadTurmas()
    }, [])

    const loadTurmas = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('turmas')
                .select(`
          id,
          nome,
          ano_lectivo,
          trimestre_atual,
          alunos(count)
        `)
                .order('created_at', { ascending: false })

            if (error) throw error

            const turmasWithCount = data?.map(turma => ({
                ...turma,
                total_alunos: turma.alunos?.[0]?.count || 0
            })) || []

            setTurmas(turmasWithCount)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar turmas'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuário não autenticado')

            // Get professor profile
            const { data: professor, error: profError } = await supabase
                .from('professores')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (profError) throw profError
            if (!professor) throw new Error('Perfil de professor não encontrado')

            // Create turma
            const { error: insertError } = await supabase
                .from('turmas')
                .insert({
                    ...formData,
                    professor_id: professor.id,
                })

            if (insertError) throw insertError

            setSuccess('Turma criada com sucesso!')
            setShowModal(false)
            setFormData({
                nome: '',
                ano_lectivo: new Date().getFullYear().toString(),
                trimestre_atual: 1,
            })
            loadTurmas()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao criar turma'
            setError(translateError(errorMessage))
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta turma?')) return

        try {
            const { error } = await supabase
                .from('turmas')
                .delete()
                .eq('id', id)

            if (error) throw error

            setSuccess('Turma excluída com sucesso!')
            loadTurmas()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir turma'
            setError(translateError(errorMessage))
        }
    }

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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Minhas Turmas</h2>
                    <p className="text-slate-600 mt-1">Gerencie suas turmas e alunos</p>
                </div>
                <Button
                    variant="primary"
                    icon={<Icons.UserPlus />}
                    onClick={() => setShowModal(true)}
                >
                    Nova Turma
                </Button>
            </div>

            {/* Messages */}
            {error && (
                <div className="alert alert-error animate-slide-down">
                    <span className="text-sm">{error}</span>
                </div>
            )}
            {success && (
                <div className="alert alert-success animate-slide-down">
                    <Icons.Check />
                    <span className="ml-2 text-sm">{success}</span>
                </div>
            )}

            {/* Turmas Grid */}
            {turmas.length === 0 ? (
                <Card>
                    <CardBody className="text-center py-12">
                        <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhuma turma encontrada</h3>
                        <p className="text-slate-600 mb-4">Comece criando sua primeira turma</p>
                        <Button variant="primary" onClick={() => setShowModal(true)}>
                            Criar Primeira Turma
                        </Button>
                    </CardBody>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {turmas.map((turma) => (
                        <Card key={turma.id} className="hover:shadow-lg transition-shadow">
                            <CardBody className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-slate-900 mb-1">{turma.nome}</h3>
                                        <p className="text-sm text-slate-600">Ano Lectivo: {turma.ano_lectivo}</p>
                                    </div>
                                    <span className="badge badge-primary">{turma.trimestre_atual}º Trim</span>
                                </div>

                                <div className="flex items-center gap-2 text-slate-600 mb-4">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    <span className="text-sm">{turma.total_alunos} alunos</span>
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="primary" size="sm" className="flex-1">
                                        Ver Detalhes
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => handleDelete(turma.id)}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <Card className="w-full max-w-md animate-slide-up">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-900">Nova Turma</h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-slate-400 hover:text-slate-600"
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
                                    type="text"
                                    value={formData.ano_lectivo}
                                    onChange={(e) => setFormData({ ...formData, ano_lectivo: e.target.value })}
                                    placeholder="2025"
                                    required
                                />

                                <div>
                                    <label className="form-label">Trimestre Atual</label>
                                    <select
                                        value={formData.trimestre_atual}
                                        onChange={(e) => setFormData({ ...formData, trimestre_atual: parseInt(e.target.value) })}
                                        className="form-input"
                                    >
                                        <option value={1}>1º Trimestre</option>
                                        <option value={2}>2º Trimestre</option>
                                        <option value={3}>3º Trimestre</option>
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button type="submit" variant="primary" className="flex-1">
                                        Criar Turma
                                    </Button>
                                </div>
                            </form>
                        </CardBody>
                    </Card>
                </div>
            )}
        </div>
    )
}
