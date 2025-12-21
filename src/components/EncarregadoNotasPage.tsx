/*
component-meta:
  name: EncarregadoNotasPage
  description: Read-only page for guardians to view their students' grades
  tokens: [--color-primary, --fs-md, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import type { Disciplina, Nota, NotaFinal, ComponenteAvaliacao, AlunoProfile } from '../types'

interface DisciplinaWithGrades extends Disciplina {
    notas: Nota[]
    notaFinal: NotaFinal | null
    componentes: ComponenteAvaliacao[]
}

export const EncarregadoNotasPage: React.FC = () => {
    const { encarregadoProfile, isEncarregado } = useAuth()
    const [selectedAluno, setSelectedAluno] = useState<AlunoProfile | null>(null)
    const [disciplinas, setDisciplinas] = useState<DisciplinaWithGrades[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedTrimestre, setSelectedTrimestre] = useState<1 | 2 | 3>(1)

    // Initialize selected aluno when profile loads
    useEffect(() => {
        const alunos = encarregadoProfile?.alunos_associados
        if (alunos && alunos.length > 0 && !selectedAluno) {
            setSelectedAluno(alunos[0])
        }
    }, [encarregadoProfile, selectedAluno])

    // Load grades when aluno or trimestre changes
    useEffect(() => {
        if (isEncarregado && selectedAluno) {
            loadGrades()
        }
    }, [isEncarregado, selectedAluno, selectedTrimestre])

    const loadGrades = async () => {
        if (!selectedAluno) return

        setLoading(true)
        setError(null)

        try {
            const turmaId = selectedAluno.turma_id

            // Fetch disciplinas for this turma
            const { data: disciplinasData, error: disciplinasError } = await supabase
                .from('disciplinas')
                .select('*')
                .eq('turma_id', turmaId)
                .order('ordem', { ascending: true })

            if (disciplinasError) throw disciplinasError

            // For each disciplina, fetch componentes, notas, and notas_finais
            const disciplinasWithGrades: DisciplinaWithGrades[] = []

            for (const disciplina of disciplinasData || []) {
                // Fetch componentes
                const { data: componentesData } = await supabase
                    .from('componentes_avaliacao')
                    .select('*')
                    .eq('disciplina_id', disciplina.id)
                    .eq('turma_id', turmaId)
                    .order('ordem', { ascending: true })

                // Fetch notas for this student
                const { data: notasData } = await supabase
                    .from('notas')
                    .select('*')
                    .eq('aluno_id', selectedAluno.id)
                    .eq('turma_id', turmaId)
                    .eq('trimestre', selectedTrimestre)
                    .in('componente_id', (componentesData || []).map(c => c.id))

                // Fetch nota final
                const { data: notaFinalData } = await supabase
                    .from('notas_finais')
                    .select('*')
                    .eq('aluno_id', selectedAluno.id)
                    .eq('turma_id', turmaId)
                    .eq('disciplina_id', disciplina.id)
                    .eq('trimestre', selectedTrimestre)
                    .maybeSingle()

                disciplinasWithGrades.push({
                    ...disciplina,
                    componentes: componentesData || [],
                    notas: notasData || [],
                    notaFinal: notaFinalData
                })
            }

            setDisciplinas(disciplinasWithGrades)
        } catch (err) {
            console.error('Error loading grades:', err)
            setError('Erro ao carregar notas. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    // Helper function to get classification badge color
    const getClassificationColor = (classificacao: string): string => {
        switch (classificacao) {
            case 'Excelente':
                return 'bg-emerald-100 text-emerald-700 border-emerald-200'
            case 'Bom':
                return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'Suficiente':
                return 'bg-amber-100 text-amber-700 border-amber-200'
            case 'Insuficiente':
                return 'bg-red-100 text-red-700 border-red-200'
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200'
        }
    }

    // Helper to get grade color based on value
    const getGradeColor = (nota: number): string => {
        if (nota >= 17) return 'text-emerald-600'
        if (nota >= 14) return 'text-blue-600'
        if (nota >= 10) return 'text-amber-600'
        return 'text-red-600'
    }

    if (!isEncarregado || !encarregadoProfile) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Não Autorizado</h2>
                    <p className="text-slate-600">Esta página é exclusiva para encarregados de educação.</p>
                </div>
            </div>
        )
    }

    if (encarregadoProfile.alunos_associados.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Sem Educandos Associados</h2>
                    <p className="text-slate-600">Não existem alunos associados à sua conta.</p>
                    <p className="text-sm text-slate-500 mt-2">Contacte a escola para efectuar a associação.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Notas dos Educandos</h1>
                        <p className="text-slate-600 mt-1">
                            {encarregadoProfile.escola?.nome || 'Escola'}
                        </p>
                    </div>

                    {/* Student Selector & Trimestre */}
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Student Selector */}
                        {encarregadoProfile.alunos_associados.length > 1 && (
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                    Seleccionar Educando
                                </label>
                                <select
                                    value={selectedAluno?.id || ''}
                                    onChange={(e) => {
                                        const aluno = encarregadoProfile.alunos_associados.find(a => a.id === e.target.value)
                                        if (aluno) setSelectedAluno(aluno)
                                    }}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                >
                                    {encarregadoProfile.alunos_associados.map((aluno) => (
                                        <option key={aluno.id} value={aluno.id}>
                                            {aluno.nome_completo} • {aluno.turma?.nome || 'Turma'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Single Student Display */}
                        {encarregadoProfile.alunos_associados.length === 1 && selectedAluno && (
                            <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <p className="text-sm text-slate-500">Educando</p>
                                <p className="font-semibold text-slate-800">{selectedAluno.nome_completo}</p>
                                <p className="text-sm text-slate-600">{selectedAluno.turma?.nome || 'Turma'}</p>
                            </div>
                        )}

                        {/* Trimestre Selector */}
                        <div className="flex items-end gap-2">
                            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
                                {[1, 2, 3].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setSelectedTrimestre(t as 1 | 2 | 3)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${selectedTrimestre === t
                                            ? 'bg-primary-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        {t}º Tri
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-4"></div>
                        <p className="text-slate-600">Carregando notas...</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {/* Grades Grid */}
            {!loading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {disciplinas.map((disciplina) => (
                        <div
                            key={disciplina.id}
                            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
                        >
                            {/* Discipline Header */}
                            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                                <h3 className="font-bold text-slate-800 truncate" title={disciplina.nome}>
                                    {disciplina.nome}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">{disciplina.codigo_disciplina}</p>
                            </div>

                            {/* Component Grades */}
                            <div className="p-4 space-y-3">
                                {disciplina.componentes.map((componente) => {
                                    const nota = disciplina.notas.find(n => n.componente_id === componente.id)
                                    return (
                                        <div key={componente.id} className="flex items-center justify-between">
                                            <span className="text-sm text-slate-600 truncate flex-1 pr-2" title={componente.nome}>
                                                {componente.codigo_componente}
                                            </span>
                                            <span className={`font-bold text-lg ${nota ? getGradeColor(nota.valor) : 'text-slate-300'}`}>
                                                {nota ? nota.valor.toFixed(1) : '--'}
                                            </span>
                                        </div>
                                    )
                                })}

                                {disciplina.componentes.length === 0 && (
                                    <p className="text-sm text-slate-400 text-center py-4">
                                        Sem componentes
                                    </p>
                                )}
                            </div>

                            {/* Final Grade Footer */}
                            <div className="p-4 border-t border-slate-100 bg-slate-50">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-600">Nota Final</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xl font-bold ${disciplina.notaFinal ? getGradeColor(disciplina.notaFinal.nota_final) : 'text-slate-300'}`}>
                                            {disciplina.notaFinal ? disciplina.notaFinal.nota_final.toFixed(1) : '--'}
                                        </span>
                                        {disciplina.notaFinal?.classificacao && (
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getClassificationColor(disciplina.notaFinal.classificacao)}`}>
                                                {disciplina.notaFinal.classificacao}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {disciplinas.length === 0 && (
                        <div className="col-span-full text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Sem disciplinas</h3>
                            <p className="text-slate-600">Não foram encontradas disciplinas para este trimestre.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Statistics Summary */}
            {!loading && !error && disciplinas.length > 0 && selectedAluno && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-4">
                        Resumo de {selectedAluno.nome_completo.split(' ')[0]} - {selectedTrimestre}º Trimestre
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Total Disciplines */}
                        <div className="bg-slate-50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-slate-800">{disciplinas.length}</p>
                            <p className="text-xs text-slate-500 mt-1">Disciplinas</p>
                        </div>

                        {/* Average */}
                        <div className="bg-primary-50 rounded-xl p-4 text-center">
                            <p className={`text-2xl font-bold ${disciplinas.filter(d => d.notaFinal).length > 0
                                ? getGradeColor(
                                    disciplinas.filter(d => d.notaFinal).reduce((acc, d) => acc + (d.notaFinal?.nota_final || 0), 0) /
                                    disciplinas.filter(d => d.notaFinal).length
                                )
                                : 'text-slate-400'
                                }`}>
                                {disciplinas.filter(d => d.notaFinal).length > 0
                                    ? (
                                        disciplinas.filter(d => d.notaFinal).reduce((acc, d) => acc + (d.notaFinal?.nota_final || 0), 0) /
                                        disciplinas.filter(d => d.notaFinal).length
                                    ).toFixed(1)
                                    : '--'
                                }
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Média Geral</p>
                        </div>

                        {/* Approved */}
                        <div className="bg-emerald-50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-emerald-600">
                                {disciplinas.filter(d => d.notaFinal && d.notaFinal.nota_final >= 10).length}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Aprovado</p>
                        </div>

                        {/* Failed */}
                        <div className="bg-red-50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-red-600">
                                {disciplinas.filter(d => d.notaFinal && d.notaFinal.nota_final < 10).length}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Reprovado</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
