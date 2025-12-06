import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Icons } from './ui/Icons'
import { translateError } from '../utils/translations'

interface Aluno {
    id: string
    nome: string
    numero: string
    turma_id: string
    turma?: {
        nome: string
    }
}

interface Turma {
    id: string
    nome: string
}

export const StudentsPage: React.FC = () => {
    const [alunos, setAlunos] = useState<Aluno[]>([])
    const [turmas, setTurmas] = useState<Turma[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [selectedTurma, setSelectedTurma] = useState<string>('all')
    const [formData, setFormData] = useState({
        nome: '',
        numero: '',
        turma_id: '',
    })
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    useEffect(() => {
        loadTurmas()
        loadAlunos()
    }, [selectedTurma])

    const loadTurmas = async () => {
        try {
            const { data, error } = await supabase
                .from('turmas')
                .select('id, nome')
                .order('nome')

            if (error) throw error
            setTurmas(data || [])
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar turmas'
            setError(translateError(errorMessage))
        }
    }

    const loadAlunos = async () => {
        try {
            setLoading(true)
            let query = supabase
                .from('alunos')
                .select(`
          id,
          nome,
          numero,
          turma_id,
          turmas(nome)
        `)
                .order('nome')

            if (selectedTurma !== 'all') {
                query = query.eq('turma_id', selectedTurma)
            }

            const { data, error } = await query

            if (error) throw error
            setAlunos(data || [])
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar alunos'
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
            const { error: insertError } = await supabase
                .from('alunos')
                .insert(formData)

            if (insertError) throw insertError

            setSuccess('Aluno adicionado com sucesso!')
            setShowModal(false)
            setFormData({ nome: '', numero: '', turma_id: '' })
            loadAlunos()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao adicionar aluno'
            setError(translateError(errorMessage))
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este aluno?')) return

        try {
            const { error } = await supabase
                .from('alunos')
                .delete()
                .eq('id', id)

            if (error) throw error

            setSuccess('Aluno excluído com sucesso!')
            loadAlunos()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir aluno'
            setError(translateError(errorMessage))
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="mt-4 text-slate-600">Carregando alunos...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Alunos</h2>
                    <p className="text-slate-600 mt-1">Gerencie os alunos das suas turmas</p>
                </div>
                <Button
                    variant="primary"
                    icon={<Icons.UserPlus />}
                    onClick={() => setShowModal(true)}
                >
                    Novo Aluno
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

            {/* Filter */}
            <Card>
                <CardBody className="p-4">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-slate-700">Filtrar por turma:</label>
                        <select
                            value={selectedTurma}
                            onChange={(e) => setSelectedTurma(e.target.value)}
                            className="form-input max-w-xs"
                        >
                            <option value="all">Todas as turmas</option>
                            {turmas.map((turma) => (
                                <option key={turma.id} value={turma.id}>
                                    {turma.nome}
                                </option>
                            ))}
                        </select>
                        <span className="text-sm text-slate-600">
                            {alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'}
                        </span>
                    </div>
                </CardBody>
            </Card>

            {/* Alunos Table */}
            {alunos.length === 0 ? (
                <Card>
                    <CardBody className="text-center py-12">
                        <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum aluno encontrado</h3>
                        <p className="text-slate-600 mb-4">Adicione alunos às suas turmas</p>
                        <Button variant="primary" onClick={() => setShowModal(true)}>
                            Adicionar Primeiro Aluno
                        </Button>
                    </CardBody>
                </Card>
            ) : (
                <Card>
                    <CardBody className="p-0">
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Número</th>
                                        <th>Nome</th>
                                        <th>Turma</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alunos.map((aluno) => (
                                        <tr key={aluno.id}>
                                            <td className="font-medium text-slate-900">{aluno.numero}</td>
                                            <td className="text-slate-900">{aluno.nome}</td>
                                            <td className="text-slate-600">{aluno.turma?.nome || '-'}</td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" size="sm">
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => handleDelete(aluno.id)}
                                                    >
                                                        Excluir
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <Card className="w-full max-w-md animate-slide-up">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-900">Novo Aluno</h3>
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
                                    label="Nome Completo"
                                    type="text"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    placeholder="João Silva"
                                    required
                                    icon={<Icons.User />}
                                />

                                <Input
                                    label="Número do Aluno"
                                    type="text"
                                    value={formData.numero}
                                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                                    placeholder="001"
                                    required
                                />

                                <div>
                                    <label className="form-label">Turma</label>
                                    <select
                                        value={formData.turma_id}
                                        onChange={(e) => setFormData({ ...formData, turma_id: e.target.value })}
                                        className="form-input"
                                        required
                                    >
                                        <option value="">Selecione uma turma</option>
                                        {turmas.map((turma) => (
                                            <option key={turma.id} value={turma.id}>
                                                {turma.nome}
                                            </option>
                                        ))}
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
                                        Adicionar Aluno
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
