/*
component-meta:
  name: GradesPage
  description: Enhanced grade entry page with filters, search, validation, statistics, and import/export
  tokens: [--color-primary, --fs-md, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Button } from './ui/Button'
import { Icons } from './ui/Icons'
import { Input } from './ui/Input'
import { translateError } from '../utils/translations'
import { GradeStatsCard } from './GradeStatsCard'
import { GradeImportModal } from './GradeImportModal'
import { useAuth } from '../contexts/AuthContext'
import {
    calculateGradeStats,
    validateGradeValue,
    exportGradesToCSV,
    downloadCSV,
    generateCSVTemplate,
    getGradeColor,
    getGradeBgColor,
    GradeData
} from '../utils/gradeUtils'
import type { Aluno, ComponenteAvaliacao, Disciplina } from '../types'

interface Turma {
    id: string
    nome: string
    codigo_turma: string
    trimestre: number
}

interface GradesPageProps {
    searchQuery?: string
}

export const GradesPage: React.FC<GradesPageProps> = ({ searchQuery: topbarSearchQuery = '' }) => {
    const { isProfessor, professorProfile } = useAuth()
    // Selection state
    const [turmas, setTurmas] = useState<Turma[]>([])
    const [selectedTurma, setSelectedTurma] = useState<string>('')
    const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
    const [selectedDisciplina, setSelectedDisciplina] = useState<string>('')
    const [componentes, setComponentes] = useState<ComponenteAvaliacao[]>([])
    const [selectedComponente, setSelectedComponente] = useState<string>('')
    const [trimestre, setTrimestre] = useState(1)

    // Data state
    const [alunos, setAlunos] = useState<Aluno[]>([])
    const [notas, setNotas] = useState<Record<string, number>>({})
    const [originalNotas, setOriginalNotas] = useState<Record<string, number>>({})
    const [errors, setErrors] = useState<Record<string, string>>({})

    // UI state
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    // Use topbar search if provided, otherwise use local state
    const searchQuery = topbarSearchQuery
    const [sortBy, setSortBy] = useState<'nome' | 'numero' | 'nota'>('numero')
    const [filterStatus, setFilterStatus] = useState<'all' | 'filled' | 'pending'>('all')
    const [showImportModal, setShowImportModal] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    // Auto-save timer
    const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)

    useEffect(() => {
        loadTurmas()
    }, [])

    useEffect(() => {
        if (selectedTurma) {
            loadDisciplinas()
            loadAlunos()
        }
    }, [selectedTurma])

    useEffect(() => {
        if (selectedDisciplina) {
            loadComponentes()
        }
    }, [selectedDisciplina, trimestre]) // Reload when trimestre changes

    useEffect(() => {
        if (selectedComponente && selectedTurma) {
            loadNotas()
        }
    }, [selectedComponente, selectedTurma, trimestre])

    // Check for changes
    useEffect(() => {
        const changed = JSON.stringify(notas) !== JSON.stringify(originalNotas)
        setHasChanges(changed)
    }, [notas, originalNotas])

    // Auto-save every 30 seconds if there are changes
    useEffect(() => {
        if (hasChanges && Object.keys(errors).length === 0) {
            if (autoSaveTimer) clearTimeout(autoSaveTimer)

            const timer = setTimeout(() => {
                handleSaveNotas(true) // silent save
            }, 30000)

            setAutoSaveTimer(timer)
        }

        return () => {
            if (autoSaveTimer) clearTimeout(autoSaveTimer)
        }
    }, [hasChanges, errors])

    const loadTurmas = async () => {
        try {
            // Check if user is authenticated
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                console.warn('No active session when loading turmas')
                return
            }

            if (isProfessor && professorProfile) {
                console.log('📊 GradesPage: Loading turmas for professor:', professorProfile.id)

                // Try NEW MODEL first: Get turmas via turma_professores
                const { data: turmaProfsData, error: turmaProfsError } = await supabase
                    .from('turma_professores')
                    .select(`
                        turma_id,
                        turmas!inner (
                            id,
                            nome,
                            codigo_turma,
                            trimestre
                        )
                    `)
                    .eq('professor_id', professorProfile.id)

                console.log('📊 GradesPage: Turma_professores query result:', {
                    count: turmaProfsData?.length || 0,
                    error: turmaProfsError
                })

                let turmasData: any[] = []

                if (!turmaProfsError && turmaProfsData && turmaProfsData.length > 0) {
                    // NEW MODEL: Extract unique turmas from turma_professores
                    console.log('✅ GradesPage: Using NEW model (turma_professores)')
                    const turmasMap = new Map()
                    turmaProfsData.forEach(tp => {
                        const turma = tp.turmas as any
                        if (!turmasMap.has(turma.id)) {
                            turmasMap.set(turma.id, {
                                id: turma.id,
                                nome: turma.nome,
                                codigo_turma: turma.codigo_turma,
                                trimestre: turma.trimestre
                            })
                        }
                    })
                    turmasData = Array.from(turmasMap.values())
                } else {
                    // OLD MODEL fallback: Get turmas via disciplinas
                    console.log('⚠️ GradesPage: Falling back to OLD model (disciplinas.professor_id)')

                    const { data, error } = await supabase
                        .from('disciplinas')
                        .select(`
                            turma_id,
                            turmas!inner (
                                id,
                                nome,
                                codigo_turma,
                                trimestre
                            )
                        `)
                        .eq('professor_id', professorProfile.id)

                    if (error) throw error

                    // Extract unique turmas
                    const turmasMap = new Map()
                    data?.forEach(disc => {
                        const turma = disc.turmas as any
                        if (!turmasMap.has(turma.id)) {
                            turmasMap.set(turma.id, {
                                id: turma.id,
                                nome: turma.nome,
                                codigo_turma: turma.codigo_turma,
                                trimestre: turma.trimestre
                            })
                        }
                    })

                    turmasData = Array.from(turmasMap.values())

                    console.log('📊 GradesPage: Old model query result:', {
                        count: turmasData.length
                    })
                }

                setTurmas(turmasData)
                console.log('✅ GradesPage: Loaded', turmasData.length, 'turmas')
            } else {
                // For escola: load all turmas
                const { data, error } = await supabase
                    .from('turmas')
                    .select('id, nome, codigo_turma, trimestre')
                    .order('nome')

                if (error) throw error
                setTurmas(data || [])
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar turmas'
            console.error('❌ GradesPage: Error loading turmas:', err)
            setError(translateError(errorMessage))
        }
    }

    const loadDisciplinas = async () => {
        try {
            // Check if user is authenticated
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                console.warn('No active session when loading disciplinas')
                return
            }

            if (isProfessor && professorProfile) {
                console.log('📊 GradesPage: Loading disciplinas for professor:', professorProfile.id, 'turma:', selectedTurma)

                // Try NEW MODEL first: Get disciplinas via turma_professores
                const { data: turmaProfsData, error: turmaProfsError } = await supabase
                    .from('turma_professores')
                    .select(`
                        disciplina_id,
                        disciplinas!inner (
                            id,
                            nome,
                            codigo_disciplina,
                            professor_id,
                            turma_id,
                            carga_horaria,
                            descricao,
                            created_at,
                            updated_at,
                            professores!inner (
                                nome_completo
                            )
                        )
                    `)
                    .eq('professor_id', professorProfile.id)
                    .eq('turma_id', selectedTurma)

                console.log('📊 GradesPage: Turma_professores disciplinas query result:', {
                    count: turmaProfsData?.length || 0,
                    error: turmaProfsError
                })

                let disciplinasData: any[] = []

                if (!turmaProfsError && turmaProfsData && turmaProfsData.length > 0) {
                    // NEW MODEL: Extract disciplinas from turma_professores
                    console.log('✅ GradesPage: Using NEW model (turma_professores)')
                    disciplinasData = turmaProfsData.map(tp => tp.disciplinas)
                } else {
                    // OLD MODEL fallback: Query disciplinas directly
                    console.log('⚠️ GradesPage: Falling back to OLD model (disciplinas.professor_id)')

                    const { data, error } = await supabase
                        .from('disciplinas')
                        .select(`
                            id,
                            nome,
                            codigo_disciplina,
                            professor_id,
                            turma_id,
                            carga_horaria,
                            descricao,
                            created_at,
                            updated_at,
                            professores!inner (
                                nome_completo
                            )
                        `)
                        .eq('turma_id', selectedTurma)
                        .eq('professor_id', professorProfile.id)
                        .order('nome')

                    if (error) throw error
                    disciplinasData = data || []

                    console.log('📊 GradesPage: Old model disciplinas query result:', {
                        count: disciplinasData.length
                    })
                }

                setDisciplinas(disciplinasData)
                console.log('✅ GradesPage: Loaded', disciplinasData.length, 'disciplinas')
            } else {
                // For escola: load all disciplinas for the turma
                let query = supabase
                    .from('disciplinas')
                    .select(`
                        id,
                        nome,
                        codigo_disciplina,
                        professor_id,
                        turma_id,
                        carga_horaria,
                        descricao,
                        created_at,
                        updated_at,
                        professores!inner (
                            nome_completo
                        )
                    `)
                    .eq('turma_id', selectedTurma)

                const { data, error } = await query.order('nome')

                if (error) throw error
                setDisciplinas(data || [])
            }

            setSelectedDisciplina('')
            setComponentes([])
            setSelectedComponente('')
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar disciplinas'
            console.error('❌ GradesPage: Error loading disciplinas:', err)
            setError(translateError(errorMessage))
        }
    }

    const loadComponentes = async () => {
        try {
            // Check if user is authenticated
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                console.warn('No active session when loading componentes')
                return
            }

            const { data, error } = await supabase
                .from('componentes_avaliacao')
                .select('*')
                .eq('disciplina_id', selectedDisciplina)
                .eq('trimestre', trimestre) // Filter by selected trimestre
                .eq('is_calculated', false) // Only load non-calculated components for manual entry
                .order('ordem')

            if (error) throw error
            setComponentes(data || [])
            setSelectedComponente('')
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar componentes'
            setError(translateError(errorMessage))
        }
    }

    const loadAlunos = async () => {
        try {
            setLoading(true)
            // Check if user is authenticated
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                console.warn('No active session when loading alunos')
                return
            }

            const { data, error } = await supabase
                .from('alunos')
                .select('id, turma_id, nome_completo, numero_processo, ativo, created_at, updated_at')
                .eq('turma_id', selectedTurma)
                .eq('ativo', true)
                .order('numero_processo')

            if (error) throw error
            setAlunos(data || [])
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar alunos'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    const loadNotas = async () => {
        try {
            setLoading(true)
            // Check if user is authenticated
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                console.warn('No active session when loading notas')
                return
            }

            const { data, error } = await supabase
                .from('notas')
                .select('aluno_id, valor')
                .eq('componente_id', selectedComponente)
                .eq('turma_id', selectedTurma)
                .eq('trimestre', trimestre)

            if (error) throw error

            const notasMap: Record<string, number> = {}
            data?.forEach(nota => {
                notasMap[nota.aluno_id] = nota.valor
            })

            setNotas(notasMap)
            setOriginalNotas(notasMap)
            setErrors({})
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar notas'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    const handleNotaChange = (alunoId: string, valor: string) => {
        const numericValue = parseFloat(valor)
        const componente = componentes.find(c => c.id === selectedComponente)

        if (!componente) return

        if (valor === '' || isNaN(numericValue)) {
            const newNotas = { ...notas }
            delete newNotas[alunoId]
            setNotas(newNotas)

            const newErrors = { ...errors }
            delete newErrors[alunoId]
            setErrors(newErrors)
            return
        }

        const validation = validateGradeValue(numericValue, componente.escala_minima, componente.escala_maxima)

        if (!validation.valid) {
            setErrors({ ...errors, [alunoId]: validation.message || 'Valor inválido' })
        } else {
            const newErrors = { ...errors }
            delete newErrors[alunoId]
            setErrors(newErrors)
        }

        setNotas({ ...notas, [alunoId]: numericValue })
    }

    const handleSaveNotas = async (silent: boolean = false) => {
        if (Object.keys(errors).length > 0) {
            if (!silent) setError('Corrija os erros antes de salvar')
            return
        }

        try {
            setSaving(true)
            if (!silent) {
                setError(null)
                setSuccess(null)
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuário não autenticado')

            const { data: professor } = await supabase
                .from('professores')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!professor) throw new Error('Professor não encontrado')

            const notasToSave = Object.entries(notas).map(([alunoId, valor]) => ({
                aluno_id: alunoId,
                componente_id: selectedComponente,
                turma_id: selectedTurma,
                trimestre,
                valor,
                lancado_por: professor.id,
                data_lancamento: new Date().toISOString()
            }))

            // Diagnostic logging
            console.log('=== SAVING GRADES DEBUG ===')
            console.log('Number of grades to save:', notasToSave.length)
            console.log('Sample grade data:', notasToSave[0])
            console.log('Trimestre:', trimestre)
            console.log('Componente ID:', selectedComponente)
            console.log('Turma ID:', selectedTurma)

            const { data: upsertData, error: upsertError } = await supabase
                .from('notas')
                .upsert(notasToSave, {
                    onConflict: 'aluno_id,componente_id,trimestre',
                    ignoreDuplicates: false
                })
                .select()

            console.log('Upsert response data:', upsertData)
            console.log('Upsert error:', upsertError)

            if (upsertError) {
                console.error('UPSERT ERROR DETAILS:', {
                    message: upsertError.message,
                    details: upsertError.details,
                    hint: upsertError.hint,
                    code: upsertError.code
                })
                throw upsertError
            }

            console.log('✅ Grades saved successfully')
            setOriginalNotas({ ...notas })
            setHasChanges(false)

            if (!silent) {
                setSuccess(`${notasToSave.length} ${notasToSave.length === 1 ? 'nota salva' : 'notas salvas'} com sucesso!`)
                setTimeout(() => setSuccess(null), 3000)
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar notas'
            console.error('❌ SAVE GRADES ERROR:', err)
            if (!silent) setError(translateError(errorMessage))
        } finally {
            setSaving(false)
        }
    }

    const handleExportCSV = () => {
        const turma = turmas.find(t => t.id === selectedTurma)
        const componente = componentes.find(c => c.id === selectedComponente)

        if (!turma || !componente) return

        const csv = exportGradesToCSV(alunos, notas, componente.nome, turma.nome)
        const filename = `notas_${turma.codigo_turma}_${componente.codigo_componente}_${new Date().toISOString().split('T')[0]}.csv`
        downloadCSV(csv, filename)
        setSuccess('Notas exportadas com sucesso!')
        setTimeout(() => setSuccess(null), 3000)
    }

    const handleDownloadTemplate = () => {
        const turma = turmas.find(t => t.id === selectedTurma)
        const componente = componentes.find(c => c.id === selectedComponente)

        if (!turma || !componente) return

        const csv = generateCSVTemplate(alunos, componente.nome, turma.nome)
        const filename = `template_${turma.codigo_turma}_${componente.codigo_componente}.csv`
        downloadCSV(csv, filename)
        setSuccess('Template baixado com sucesso!')
        setTimeout(() => setSuccess(null), 3000)
    }

    const handleImport = (data: GradeData[]) => {
        const newNotas = { ...notas }
        data.forEach(item => {
            newNotas[item.alunoId] = item.valor
        })
        setNotas(newNotas)
        setSuccess(`${data.length} ${data.length === 1 ? 'nota importada' : 'notas importadas'} com sucesso!`)
        setTimeout(() => setSuccess(null), 3000)
    }

    const handleClearAll = () => {
        if (confirm('Tem certeza que deseja limpar todas as notas? Esta ação não pode ser desfeita.')) {
            setNotas({})
            setErrors({})
        }
    }

    // Filter and sort students
    const filteredAndSortedAlunos = alunos
        .filter(aluno => {
            // Search filter
            const matchesSearch = searchQuery === '' ||
                aluno.nome_completo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                aluno.numero_processo.toLowerCase().includes(searchQuery.toLowerCase())

            // Status filter
            const hasNota = notas[aluno.id] !== undefined
            const matchesStatus = filterStatus === 'all' ||
                (filterStatus === 'filled' && hasNota) ||
                (filterStatus === 'pending' && !hasNota)

            return matchesSearch && matchesStatus
        })
        .sort((a, b) => {
            if (sortBy === 'nome') {
                return a.nome_completo.localeCompare(b.nome_completo)
            } else if (sortBy === 'numero') {
                return a.numero_processo.localeCompare(b.numero_processo)
            } else if (sortBy === 'nota') {
                const notaA = notas[a.id] ?? -1
                const notaB = notas[b.id] ?? -1
                return notaB - notaA
            }
            return 0
        })

    const stats = calculateGradeStats(notas, alunos)
    const selectedComponenteData = componentes.find(c => c.id === selectedComponente)
    const selectedTurmaData = turmas.find(t => t.id === selectedTurma)

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">Lançamento de Notas</h2>
                <p className="text-sm md:text-base text-slate-600 mt-1">Registre as notas dos alunos por componente</p>
            </div>

            {/* Messages */}
            {error && (
                <div className="alert alert-error animate-slide-down">
                    <span className="text-sm">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
            {success && (
                <div className="alert alert-success animate-slide-down">
                    <Icons.Check />
                    <span className="ml-2 text-sm">{success}</span>
                </div>
            )}
            {hasChanges && (
                <div className="alert bg-amber-50 border-amber-200 text-amber-800 animate-slide-down">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="ml-2 text-sm">Você tem alterações não salvas. Salvamento automático em 30s...</span>
                </div>
            )}

            {/* Filters */}
            <Card>
                <CardBody className="p-3 md:p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        <div>
                            <label className="form-label">Turma</label>
                            <select
                                value={selectedTurma}
                                onChange={(e) => setSelectedTurma(e.target.value)}
                                className="form-input min-h-touch"
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
                            <label className="form-label">Disciplina</label>
                            <select
                                value={selectedDisciplina}
                                onChange={(e) => setSelectedDisciplina(e.target.value)}
                                className="form-input min-h-touch"
                                disabled={!selectedTurma}
                            >
                                <option value="">Selecione uma disciplina</option>
                                {disciplinas.map((disciplina) => {
                                    const professorName = (disciplina as any).professores?.nome_completo
                                    return (
                                        <option key={disciplina.id} value={disciplina.id}>
                                            {disciplina.nome}{professorName ? ` (Prof. ${professorName})` : ''}
                                        </option>
                                    )
                                })}
                            </select>
                            {selectedTurma && disciplinas.length === 0 && (
                                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex gap-2">
                                        <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="text-sm text-amber-800">
                                            <p className="font-medium mb-1">Nenhuma disciplina cadastrada</p>
                                            <p>Para lançar notas, primeiro cadastre disciplinas na página de detalhes da turma.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="form-label">Componente</label>
                            <select
                                value={selectedComponente}
                                onChange={(e) => setSelectedComponente(e.target.value)}
                                className="form-input min-h-touch"
                                disabled={!selectedDisciplina}
                            >
                                <option value="">Selecione um componente</option>
                                {componentes.map((comp) => (
                                    <option key={comp.id} value={comp.id}>
                                        {comp.nome} ({comp.peso_percentual}%)
                                    </option>
                                ))}
                            </select>
                            {selectedDisciplina && componentes.length === 0 && (
                                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex gap-2">
                                        <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="text-sm text-amber-800">
                                            <p className="font-medium mb-1">Nenhum componente de avaliação cadastrado</p>
                                            <p>Para lançar notas, primeiro configure os componentes de avaliação (ex: MAC, CPP, PPT) na página de gestão de disciplinas.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="form-label">Trimestre</label>
                            <select
                                value={trimestre}
                                onChange={(e) => setTrimestre(parseInt(e.target.value))}
                                className="form-input min-h-touch"
                            >
                                <option value={1}>1º Trimestre</option>
                                <option value={2}>2º Trimestre</option>
                                <option value={3}>3º Trimestre</option>
                            </select>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Statistics */}
            {selectedComponente && alunos.length > 0 && (
                <GradeStatsCard stats={stats} loading={loading} />
            )}

            {/* Grades Table */}
            {selectedComponente && (
                <Card>
                    <CardHeader>
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                            <div>
                                <h3 className="text-base md:text-lg font-semibold text-slate-900">
                                    {selectedTurmaData?.nome} - {selectedComponenteData?.nome}
                                </h3>
                                {selectedComponenteData && (
                                    <p className="text-sm text-slate-600 mt-1">
                                        Escala: {selectedComponenteData.escala_minima} - {selectedComponenteData.escala_maxima} •
                                        Peso: {selectedComponenteData.peso_percentual}%
                                    </p>
                                )}
                            </div>

                            {/* Search and Filters */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative flex-1 sm:min-w-[200px]">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Buscar aluno..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-touch"
                                    />
                                </div>

                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="form-input text-sm min-h-touch"
                                >
                                    <option value="numero">Ordenar por Nº</option>
                                    <option value="nome">Ordenar por Nome</option>
                                    <option value="nota">Ordenar por Nota</option>
                                </select>

                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as any)}
                                    className="form-input text-sm min-h-touch"
                                >
                                    <option value="all">Todos</option>
                                    <option value="filled">Lançadas</option>
                                    <option value="pending">Pendentes</option>
                                </select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardBody className="p-0">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                                    <p className="mt-4 text-slate-600">Carregando...</p>
                                </div>
                            </div>
                        ) : alunos.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-slate-600">Nenhum aluno encontrado nesta turma</p>
                            </div>
                        ) : filteredAndSortedAlunos.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-slate-600">Nenhum aluno corresponde aos filtros</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="table-excel">
                                        <thead>
                                            <tr>
                                                <th className="sticky left-0 bg-slate-50 z-10 w-16 text-center">Nº</th>
                                                <th className="sticky left-16 bg-slate-50 z-10 min-w-[200px] text-left">Aluno</th>
                                                <th className="min-w-[120px] text-left">Nº Processo</th>
                                                <th className="text-center min-w-[120px]">Nota</th>
                                                <th className="text-center min-w-[100px]">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredAndSortedAlunos.map((aluno, index) => {
                                                const hasError = errors[aluno.id]
                                                const nota = notas[aluno.id]
                                                const hasNota = nota !== undefined

                                                return (
                                                    <tr key={aluno.id} className={hasNota ? getGradeBgColor(nota) : ''}>
                                                        <td className="sticky left-0 bg-inherit font-medium text-center">{index + 1}</td>
                                                        <td className="sticky left-16 bg-inherit text-left">{aluno.nome_completo}</td>
                                                        <td className="text-slate-600 text-left">{aluno.numero_processo}</td>
                                                        <td className="text-center">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    step="0.5"
                                                                    min={selectedComponenteData?.escala_minima}
                                                                    max={selectedComponenteData?.escala_maxima}
                                                                    value={nota ?? ''}
                                                                    onChange={(e) => handleNotaChange(aluno.id, e.target.value)}
                                                                    className={`table-excel-input ${hasError ? 'border-red-500 bg-red-50' : ''
                                                                        } ${hasNota ? getGradeColor(nota) : ''}`}
                                                                    placeholder="0.0"
                                                                />
                                                                {hasError && (
                                                                    <span className="text-xs text-red-600">{hasError}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="text-center">
                                                            {hasNota ? (
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                    ✓ Lançada
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                                    Pendente
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-sm text-slate-600">
                                    Mostrando {filteredAndSortedAlunos.length} de {alunos.length} alunos
                                </div>
                            </>
                        )}
                    </CardBody>
                </Card>
            )}

            {/* Actions */}
            {selectedComponente && alunos.length > 0 && (
                <Card>
                    <CardBody className="p-3 md:p-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                variant="primary"
                                onClick={() => handleSaveNotas(false)}
                                loading={saving}
                                disabled={Object.keys(errors).length > 0 || !hasChanges}
                                className="flex-1 sm:flex-none"
                            >
                                {saving ? 'Salvando...' : 'Salvar Notas'}
                            </Button>

                            {!isProfessor && (
                                <>
                                    <Button
                                        variant="secondary"
                                        onClick={handleExportCSV}
                                        disabled={Object.keys(notas).length === 0}
                                        className="flex-1 sm:flex-none"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Exportar CSV
                                    </Button>

                                    <Button
                                        variant="secondary"
                                        onClick={handleDownloadTemplate}
                                        className="flex-1 sm:flex-none"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Template
                                    </Button>

                                    <Button
                                        variant="secondary"
                                        onClick={() => setShowImportModal(true)}
                                        className="flex-1 sm:flex-none"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        Importar CSV
                                    </Button>
                                </>
                            )}

                            <Button
                                variant="ghost"
                                onClick={handleClearAll}
                                disabled={Object.keys(notas).length === 0}
                                className="flex-1 sm:flex-none ml-auto"
                            >
                                Limpar Tudo
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Import Modal */}
            {showImportModal && selectedComponenteData && (
                <GradeImportModal
                    alunos={alunos}
                    minScale={selectedComponenteData.escala_minima}
                    maxScale={selectedComponenteData.escala_maxima}
                    componenteNome={selectedComponenteData.nome}
                    onImport={handleImport}
                    onClose={() => setShowImportModal(false)}
                />
            )}
        </div>
    )
}
