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
    trimestre_atual: number
}

interface Aluno {
    id: string
    nome: string
    numero: string
}

interface Componente {
    id: string
    nome: string
    peso: number
}

interface Nota {
    id?: string
    aluno_id: string
    componente_id: string
    valor: number
    trimestre: number
}

export const GradesPage: React.FC = () => {
    const [turmas, setTurmas] = useState<Turma[]>([])
    const [selectedTurma, setSelectedTurma] = useState<string>('')
    const [alunos, setAlunos] = useState<Aluno[]>([])
    const [componentes, setComponentes] = useState<Componente[]>([])
    const [notas, setNotas] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [trimestre, setTrimestre] = useState(1)

    useEffect(() => {
        loadTurmas()
    }, [])

    useEffect(() => {
        if (selectedTurma) {
            loadAlunosEComponentes()
        }
    }, [selectedTurma, trimestre])

    const loadTurmas = async () => {
        try {
            const { data, error } = await supabase
                .from('turmas')
                .select('id, nome, trimestre_atual')
                .order('nome')

            if (error) throw error
            setTurmas(data || [])
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar turmas'
            setError(translateError(errorMessage))
        }
    }

    const loadAlunosEComponentes = async () => {
        try {
            setLoading(true)

            // Load students
            const { data: alunosData, error: alunosError } = await supabase
                .from('alunos')
                .select('id, nome, numero')
                .eq('turma_id', selectedTurma)
                .order('numero')

            if (alunosError) throw alunosError

            // Load components
            const { data: componentesData, error: componentesError } = await supabase
                .from('componentes')
                .select('id, nome, peso')
                .eq('turma_id', selectedTurma)
                .order('nome')

            if (componentesError) throw componentesError

            setAlunos(alunosData || [])
            setComponentes(componentesData || [])

            // Load existing grades
            if (alunosData && componentesData) {
                const { data: notasData, error: notasError } = await supabase
                    .from('notas')
                    .select('aluno_id, componente_id, valor')
                    .in('aluno_id', alunosData.map(a => a.id))
                    .eq('trimestre', trimestre)

                if (notasError) throw notasError

                const notasMap: Record<string, number> = {}
                notasData?.forEach(nota => {
                    notasMap[`${nota.aluno_id}-${nota.componente_id}`] = nota.valor
                })
                setNotas(notasMap)
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    const handleNotaChange = (alunoId: string, componenteId: string, valor: string) => {
        const key = `${alunoId}-${componenteId}`
        const numericValue = parseFloat(valor)

        if (valor === '' || (numericValue >= 0 && numericValue <= 20)) {
            setNotas(prev => ({
                ...prev,
                [key]: valor === '' ? 0 : numericValue
            }))
        }
    }

    const handleSaveNotas = async () => {
        try {
            setLoading(true)
            setError(null)
            setSuccess(null)

            const notasToSave = Object.entries(notas).map(([key, valor]) => {
                const [aluno_id, componente_id] = key.split('-')
                return {
                    aluno_id,
                    componente_id,
                    valor,
                    trimestre,
                }
            }).filter(nota => nota.valor > 0)

            if (notasToSave.length === 0) {
                setError('Nenhuma nota para salvar')
                return
            }

            // Upsert grades
            const { error: upsertError } = await supabase
                .from('notas')
                .upsert(notasToSave, {
                    onConflict: 'aluno_id,componente_id,trimestre'
                })

            if (upsertError) throw upsertError

            setSuccess(`${notasToSave.length} notas salvas com sucesso!`)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar notas'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Lançamento de Notas</h2>
                <p className="text-slate-600 mt-1">Registre as notas dos alunos por componente</p>
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

            {/* Filters */}
            <Card>
                <CardBody className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="form-label">Turma</label>
                            <select
                                value={selectedTurma}
                                onChange={(e) => setSelectedTurma(e.target.value)}
                                className="form-input"
                            >
                                <option value="">Selecione uma turma</option>
                                {turmas.map((turma) => (
                                    <option key={turma.id} value={turma.id}>
                                        {turma.nome}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="form-label">Trimestre</label>
                            <select
                                value={trimestre}
                                onChange={(e) => setTrimestre(parseInt(e.target.value))}
                                className="form-input"
                            >
                                <option value={1}>1º Trimestre</option>
                                <option value={2}>2º Trimestre</option>
                                <option value={3}>3º Trimestre</option>
                            </select>
                        </div>

                        <div className="flex items-end">
                            <Button
                                variant="primary"
                                onClick={handleSaveNotas}
                                loading={loading}
                                disabled={!selectedTurma || alunos.length === 0}
                                className="w-full"
                            >
                                Salvar Notas
                            </Button>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Grades Table */}
            {selectedTurma && (
                <Card>
                    <CardHeader>
                        <h3 className="text-lg font-semibold text-slate-900">
                            Notas - {turmas.find(t => t.id === selectedTurma)?.nome} - {trimestre}º Trimestre
                        </h3>
                    </CardHeader>
                    <CardBody className="p-0">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                                    <p className="mt-4 text-slate-600">Carregando...</p>
                                </div>
                            </div>
                        ) : alunos.length === 0 || componentes.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-slate-600">
                                    {alunos.length === 0
                                        ? 'Nenhum aluno encontrado nesta turma'
                                        : 'Nenhum componente de avaliação configurado'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th className="sticky left-0 bg-white z-10">Nº</th>
                                            <th className="sticky left-12 bg-white z-10">Aluno</th>
                                            {componentes.map((comp) => (
                                                <th key={comp.id} className="text-center">
                                                    {comp.nome}
                                                    <br />
                                                    <span className="text-xs text-slate-500 font-normal">
                                                        (Peso: {comp.peso})
                                                    </span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {alunos.map((aluno) => (
                                            <tr key={aluno.id}>
                                                <td className="sticky left-0 bg-white font-medium">{aluno.numero}</td>
                                                <td className="sticky left-12 bg-white">{aluno.nome}</td>
                                                {componentes.map((comp) => {
                                                    const key = `${aluno.id}-${comp.id}`
                                                    return (
                                                        <td key={comp.id} className="text-center">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="20"
                                                                step="0.5"
                                                                value={notas[key] || ''}
                                                                onChange={(e) => handleNotaChange(aluno.id, comp.id, e.target.value)}
                                                                className="w-20 px-2 py-1 border border-slate-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                                placeholder="0-20"
                                                            />
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardBody>
                </Card>
            )}
        </div>
    )
}
