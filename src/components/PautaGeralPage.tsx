/*
component-meta:
  name: PautaGeralPage
  description: Page for generating Pauta-Geral (general report) by class with all disciplines
  tokens: [--color-primary, --fs-md, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Card, CardHeader, CardBody } from './ui/Card'
import { Button } from './ui/Button'
import { translateError } from '../utils/translations'
import { PautaGeralFieldSelector } from './PautaGeralFieldSelector'
import { PautaGeralPreview } from './PautaGeralPreview'
import { generatePautaGeralPDF } from '../utils/pdfGenerator'
import { generatePautaGeralExcel, generatePautaGeralCSV } from '../utils/excelGenerator'
import { evaluateFormula } from '../utils/formulaUtils'
import { HeaderConfig, loadHeaderConfig } from '../utils/headerConfigUtils'
import { GradeColorConfig, loadGradeColorConfig } from '../utils/gradeColorConfigUtils'
import { ConfiguracaoCabecalhoModal } from './ConfiguracaoCabecalhoModal'
import { classifyStudent, DisciplinaGrade } from '../utils/studentClassification'
import { useAuth } from '../contexts/AuthContext'

interface Turma {
    id: string
    nome: string
    ano_lectivo: number
    codigo_turma: string
    nivel_ensino: string
}

interface ComponenteAvaliacao {
    id: string
    codigo_componente: string
    nome: string
    peso_percentual: number
    trimestre: number
    is_calculated?: boolean
    formula_expression?: string
    depends_on_components?: string[]
}

interface DisciplinaComComponentes {
    id: string
    nome: string
    codigo_disciplina: string
    ordem: number
    componentes: ComponenteAvaliacao[]
}

interface PautaGeralData {
    turma: Turma
    trimestre: number
    nivel_ensino?: string
    classe?: string
    alunos: Array<{
        numero_processo: string
        nome_completo: string
        notas_por_disciplina: Record<string, Record<string, number>> // disciplinaId -> componenteId -> nota
        media_geral: number // Average across all disciplines
        observacao: 'Transita' | 'Não Transita' | 'Condicional' | 'AguardandoNotas'
        motivos: string[]
        disciplinas_em_risco: string[]
        acoes_recomendadas: string[]
    }>
    disciplinas: DisciplinaComComponentes[]
    estatisticas?: {
        por_disciplina: Record<string, any>
        geral: any
    }
    escola?: {
        nome: string
        provincia: string
        municipio: string
    }
}

interface FieldSelection {
    disciplinas: string[] // IDs of selected disciplines
    includeAllDisciplinas: boolean
    componentes: string[] // IDs of selected components
    includeAllComponentes: boolean
    showStatistics: boolean
    showNumeroProcesso: boolean
    showNomeCompleto: boolean
    showMediaGeral: boolean // Show Média Geral column
    showObservacao: boolean // Show Transita/Não Transita column
    componenteParaMediaGeral: string // Component code to use for média geral (e.g., 'MF', 'MT', 'NF')
}

export const PautaGeralPage: React.FC = () => {
    const { escolaProfile, professorProfile } = useAuth()
    const [turmas, setTurmas] = useState<Turma[]>([])
    const [selectedTurma, setSelectedTurma] = useState<string>('')
    const trimestre = 3 // Fixed to 3rd trimester for Pauta-Geral
    const [loadingData, setLoadingData] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [pautaGeralData, setPautaGeralData] = useState<PautaGeralData | null>(null)
    const [headerConfig, setHeaderConfig] = useState<HeaderConfig | null>(null)
    const [colorConfig, setColorConfig] = useState<GradeColorConfig | null>(null)
    const [showHeaderConfigModal, setShowHeaderConfigModal] = useState(false)

    const [fieldSelection, setFieldSelection] = useState<FieldSelection>({
        disciplinas: [],
        includeAllDisciplinas: true,
        componentes: [],
        includeAllComponentes: true,
        showStatistics: true,
        showNumeroProcesso: true,
        showNomeCompleto: true,
        showMediaGeral: true,
        showObservacao: true,
        componenteParaMediaGeral: 'MF' // Default to MF (Média Final)
    })

    // Disciplinas obrigatórias state
    const [disciplinasObrigatorias, setDisciplinasObrigatorias] = useState<string[]>([])

    useEffect(() => {
        loadTurmas()
    }, [])

    useEffect(() => {
        if (selectedTurma) {
            loadPautaGeralData()
            loadDisciplinasObrigatorias()
        } else {
            setPautaGeralData(null)
            setDisciplinasObrigatorias([])
        }
    }, [selectedTurma]) // trimestre is now fixed at 3

    useEffect(() => {
        loadHeaderConfiguration()
        loadColorConfiguration()
    }, [selectedTurma])

    const loadTurmas = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not authenticated')

            const { data: professor } = await supabase
                .from('professores')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!professor) throw new Error('Professor not found')

            const { data, error } = await supabase
                .from('turmas')
                .select('id, nome, ano_lectivo, codigo_turma, nivel_ensino')
                .eq('professor_id', professor.id)
                .order('nome')

            if (error) throw error
            setTurmas(data || [])
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar turmas'
            setError(translateError(errorMessage))
        }
    }

    const loadDisciplinasObrigatorias = async () => {
        try {
            const { data, error } = await supabase
                .from('disciplinas_obrigatorias')
                .select('disciplina_id')
                .eq('turma_id', selectedTurma)
                .eq('is_obrigatoria', true)

            if (error) throw error

            // Extract just the IDs
            const ids = (data || []).map(d => d.disciplina_id)
            setDisciplinasObrigatorias(ids)
        } catch (err) {
            console.error('Erro ao carregar disciplinas obrigatórias:', err)
            // Don't show error to user, just use empty array (fallback to Português/Matemática)
            setDisciplinasObrigatorias([])
        }
    }

    const loadPautaGeralData = async () => {
        try {
            setLoadingData(true)
            setError(null)

            // Load turma details
            const { data: turmaData, error: turmaError } = await supabase
                .from('turmas')
                .select('id, nome, ano_lectivo, codigo_turma, nivel_ensino')
                .eq('id', selectedTurma)
                .single()

            if (turmaError) throw turmaError

            // Extract classe from turma name
            const extractClasse = (turmaName: string): string | undefined => {
                const match = turmaName.match(/(\d+[ªº]\s*Classe)/i)
                return match ? match[1] : undefined
            }
            const classe = extractClasse(turmaData.nome)

            // Load all disciplinas for this turma
            const { data: disciplinasData, error: disciplinasError } = await supabase
                .from('disciplinas')
                .select('id, nome, codigo_disciplina, ordem')
                .eq('turma_id', selectedTurma)
                .order('ordem')

            if (disciplinasError) throw disciplinasError

            if (!disciplinasData || disciplinasData.length === 0) {
                setError('Nenhuma disciplina encontrada para esta turma')
                setPautaGeralData(null)
                return
            }

            // Load all componentes for all disciplinas from all trimesters
            // (Pauta Geral can include calculated components from T1, T2, T3)
            const { data: componentesData, error: componentesError } = await supabase
                .from('componentes_avaliacao')
                .select('id, codigo_componente, nome, peso_percentual, trimestre, disciplina_id, is_calculated, formula_expression, depends_on_components')
                .eq('turma_id', selectedTurma)
                .order('trimestre')
                .order('ordem')

            if (componentesError) throw componentesError

            // Group componentes by disciplina
            const disciplinasComComponentes: DisciplinaComComponentes[] = disciplinasData.map(disc => ({
                ...disc,
                componentes: componentesData?.filter(comp => comp.disciplina_id === disc.id) || []
            }))

            // Initialize field selection with all disciplines and components
            if (fieldSelection.includeAllDisciplinas && fieldSelection.disciplinas.length === 0) {
                setFieldSelection(prev => ({
                    ...prev,
                    disciplinas: disciplinasComComponentes.map(d => d.id)
                }))
            }

            // Load alunos
            const { data: alunosData, error: alunosError } = await supabase
                .from('alunos')
                .select('id, numero_processo, nome_completo')
                .eq('turma_id', selectedTurma)
                .eq('ativo', true)
                .order('nome_completo')

            if (alunosError) throw alunosError

            if (!alunosData || alunosData.length === 0) {
                setError('Nenhum aluno encontrado nesta turma')
                setPautaGeralData(null)
                return
            }

            // Get all component IDs for loading notas
            const allComponentIds = componentesData?.map(c => c.id) || []

            // Load notas for all components from all trimesters
            const { data: notasData, error: notasError } = await supabase
                .from('notas')
                .select('aluno_id, componente_id, valor, trimestre')
                .eq('turma_id', selectedTurma)
                .in('componente_id', allComponentIds)

            if (notasError) throw notasError

            // Process data: organize by student with all disciplines
            const alunosComNotas = alunosData.map(aluno => {
                const notasAluno = notasData?.filter(n => n.aluno_id === aluno.id) || []
                const notasPorDisciplina: Record<string, Record<string, number>> = {}

                disciplinasComComponentes.forEach(disc => {
                    const notasMap: Record<string, number> = {}

                    // Build notas map by component ID
                    notasAluno.forEach(nota => {
                        const componente = disc.componentes.find(c => c.id === nota.componente_id)
                        if (componente) {
                            notasMap[componente.id] = nota.valor
                        }
                    })

                    // Calculate values for calculated components
                    disc.componentes.forEach(componente => {
                        if (componente.is_calculated && componente.formula_expression && componente.depends_on_components) {
                            const dependencyValues: Record<string, number> = {}

                            componente.depends_on_components.forEach((depId: string) => {
                                const depComponent = disc.componentes.find(c => c.id === depId)
                                if (depComponent) {
                                    const value = notasMap[depComponent.id]
                                    if (value !== undefined) {
                                        dependencyValues[depComponent.codigo_componente] = value
                                    } else {
                                        dependencyValues[depComponent.codigo_componente] = 0
                                    }
                                }
                            })

                            if (Object.keys(dependencyValues).length > 0) {
                                try {
                                    const calculatedValue = evaluateFormula(componente.formula_expression, dependencyValues)
                                    notasMap[componente.id] = Math.round(calculatedValue * 100) / 100
                                } catch (error) {
                                    console.error(`Error calculating component ${componente.codigo_componente}:`, error)
                                }
                            }
                        }
                    })

                    notasPorDisciplina[disc.id] = notasMap
                })

                return {
                    numero_processo: aluno.numero_processo,
                    nome_completo: aluno.nome_completo,
                    notas_por_disciplina: notasPorDisciplina,
                    media_geral: 0,
                    observacao: 'AguardandoNotas' as any,
                    motivos: [] as string[],
                    disciplinas_em_risco: [] as string[],
                    acoes_recomendadas: [] as string[]
                }
            })

            // Calculate statistics per discipline and general statistics
            const notasFinaisPorAluno: number[] = [] // Store average final grade per student across all disciplines

            // For each student, calculate their classification based on new rules
            alunosComNotas.forEach((aluno, index) => {
                const notasFinaisDisciplinas: number[] = []
                const disciplinaGrades: DisciplinaGrade[] = []

                // Collect grades from MF or MFD component for each discipline
                disciplinasComComponentes.forEach(disc => {
                    const notasDisciplina = aluno.notas_por_disciplina[disc.id] || {}

                    // Find MF or MFD component
                    const componenteMF = disc.componentes.find(
                        comp => comp.codigo_componente === 'MF' || comp.codigo_componente === 'MFD'
                    )

                    if (componenteMF) {
                        const nota = notasDisciplina[componenteMF.id]
                        if (nota !== undefined && nota > 0) {
                            disciplinaGrades.push({
                                id: disc.id,
                                nome: disc.nome,
                                nota: nota
                            })
                            notasFinaisDisciplinas.push(nota)
                        }
                    }
                })

                // Calculate average across all disciplines for this student (for statistics)
                let mediaAluno = 0
                if (notasFinaisDisciplinas.length > 0) {
                    mediaAluno = notasFinaisDisciplinas.reduce((sum, n) => sum + n, 0) / notasFinaisDisciplinas.length
                    // Round to 2 decimal places
                    mediaAluno = Math.round(mediaAluno * 100) / 100
                    notasFinaisPorAluno.push(mediaAluno)
                }

                // Use new classification logic
                const classification = classifyStudent(
                    disciplinaGrades,
                    turmaData.nivel_ensino,
                    classe,
                    disciplinasObrigatorias
                )

                // Update aluno with média_geral and classification results
                alunosComNotas[index] = {
                    ...aluno,
                    media_geral: mediaAluno,
                    observacao: classification.status,
                    motivos: classification.motivos,
                    disciplinas_em_risco: classification.disciplinas_em_risco,
                    acoes_recomendadas: classification.acoes_recomendadas
                }
            })

            // Calculate General Statistics
            const totalAlunos = alunosComNotas.length
            const aprovados = alunosComNotas.filter(a => a.observacao === 'Transita').length
            const reprovados = totalAlunos - aprovados

            const mediaTurma = notasFinaisPorAluno.length > 0
                ? notasFinaisPorAluno.reduce((a, b) => a + b, 0) / notasFinaisPorAluno.length
                : 0

            const notaMinima = notasFinaisPorAluno.length > 0 ? Math.min(...notasFinaisPorAluno) : 0
            const notaMaxima = notasFinaisPorAluno.length > 0 ? Math.max(...notasFinaisPorAluno) : 0

            setPautaGeralData({
                turma: turmaData,
                trimestre: 3,
                nivel_ensino: turmaData.nivel_ensino,
                classe: classe,
                alunos: alunosComNotas,
                disciplinas: disciplinasComComponentes,
                estatisticas: {
                    por_disciplina: {},
                    geral: {
                        total_alunos: totalAlunos,
                        aprovados,
                        reprovados,
                        media_turma: mediaTurma,
                        nota_minima: notaMinima,
                        nota_maxima: notaMaxima
                    }
                }
            })
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados'
            setError(translateError(errorMessage))
            setPautaGeralData(null)
        } finally {
            setLoadingData(false)
        }
    }

    const loadHeaderConfiguration = async () => {
        try {
            // Get escola_id from auth context
            let escola_id: string | undefined

            if (escolaProfile) {
                // For school admins, use their escola_id
                escola_id = escolaProfile.id
            } else if (professorProfile) {
                // For professors, use their escola_id
                escola_id = professorProfile.escola_id
            }

            if (!escola_id) {
                console.error('No escola_id found in auth context')
                return
            }

            const config = await loadHeaderConfig(escola_id)
            setHeaderConfig(config)
        } catch (err) {
            console.error('Error loading header config:', err)
        }
    }

    const loadColorConfiguration = async () => {
        try {
            const config = await loadGradeColorConfig(selectedTurma || undefined)
            setColorConfig(config)
        } catch (err) {
            console.error('Error loading color config:', err)
        }
    }

    const getFilteredData = (): PautaGeralData | null => {
        if (!pautaGeralData) return null

        // Filter disciplines based on selection
        const selectedDisciplinaIds = fieldSelection.includeAllDisciplinas
            ? pautaGeralData.disciplinas.map(d => d.id)
            : fieldSelection.disciplinas

        const filteredDisciplinas = pautaGeralData.disciplinas
            .filter(d => selectedDisciplinaIds.includes(d.id))
            .map(disc => {
                // Filter components if needed
                const filteredComponentes = fieldSelection.includeAllComponentes
                    ? disc.componentes
                    : disc.componentes.filter(c => fieldSelection.componentes.includes(c.id))

                return {
                    ...disc,
                    componentes: filteredComponentes
                }
            })

        return {
            ...pautaGeralData,
            disciplinas: filteredDisciplinas
        }
    }

    const handleGeneratePDF = async () => {
        const filteredData = getFilteredData()
        if (!filteredData) {
            setError('Carregue os dados primeiro')
            return
        }

        try {
            await generatePautaGeralPDF(filteredData, headerConfig, colorConfig)
            setSuccess('PDF gerado com sucesso!')
            setTimeout(() => setSuccess(null), 3000)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar PDF'
            setError(translateError(errorMessage))
        }
    }

    const handleGenerateExcel = () => {
        const filteredData = getFilteredData()
        if (!filteredData) {
            setError('Carregue os dados primeiro')
            return
        }

        try {
            generatePautaGeralExcel(filteredData)
            setSuccess('Excel gerado com sucesso!')
            setTimeout(() => setSuccess(null), 3000)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar Excel'
            setError(translateError(errorMessage))
        }
    }

    const handleExportCSV = () => {
        const filteredData = getFilteredData()
        if (!filteredData) {
            setError('Carregue os dados primeiro')
            return
        }

        try {
            generatePautaGeralCSV(filteredData)
            setSuccess('CSV exportado com sucesso!')
            setTimeout(() => setSuccess(null), 3000)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao exportar CSV'
            setError(translateError(errorMessage))
        }
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">Pauta-Geral</h2>
                <p className="text-sm md:text-base text-slate-600 mt-1">Gere pauta geral por turma com todas as disciplinas</p>
            </div>

            {/* Messages */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                    <span className="text-sm">{error}</span>
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                    <span className="text-sm">{success}</span>
                </div>
            )}

            {/* Filters */}
            <Card>
                <CardHeader>
                    <h3 className="text-base md:text-lg font-semibold text-slate-900">Filtros</h3>
                </CardHeader>
                <CardBody>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Turma</label>
                            <select
                                value={selectedTurma}
                                onChange={(e) => setSelectedTurma(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Selecione uma turma</option>
                                {turmas.map((turma) => (
                                    <option key={turma.id} value={turma.id}>
                                        {turma.nome} - {turma.ano_lectivo}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={loadPautaGeralData}
                                disabled={!selectedTurma || loadingData}
                                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loadingData ? 'Carregando...' : 'Carregar Dados'}
                            </button>
                        </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
                        <strong>Nota:</strong> A Pauta-Geral é gerada automaticamente com os dados do <strong>3º Trimestre</strong>.
                    </div>
                </CardBody>
            </Card>

            {/* Field Selector */}
            {pautaGeralData && (
                <PautaGeralFieldSelector
                    data={pautaGeralData}
                    selection={fieldSelection}
                    onChange={setFieldSelection}
                />
            )}

            {/* Preview and Export */}
            {pautaGeralData && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900">Preview da Pauta-Geral</h3>
                        <div className="flex gap-2">
                            <Button
                                variant="primary"
                                onClick={handleGeneratePDF}
                                icon={
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                }
                            >
                                PDF
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handleGenerateExcel}
                                icon={
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                }
                            >
                                Excel
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handleExportCSV}
                                icon={
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                }
                            >
                                CSV
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setShowHeaderConfigModal(true)}
                                icon={
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                }
                            >
                                Cabeçalho
                            </Button>
                        </div>
                    </div>
                    <PautaGeralPreview
                        data={getFilteredData()!}
                        loading={loadingData}
                        colorConfig={colorConfig}
                        fieldSelection={fieldSelection}
                        disciplinasObrigatorias={disciplinasObrigatorias}
                    />
                </div>
            )}

            {!pautaGeralData && !loadingData && selectedTurma && (
                <div className="bg-slate-50 rounded-lg p-8 text-center">
                    <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-slate-600">Clique em "Carregar Dados" para visualizar a pauta-geral</p>
                </div>
            )}

            {/* Header Configuration Modal */}
            <ConfiguracaoCabecalhoModal
                isOpen={showHeaderConfigModal}
                onClose={() => setShowHeaderConfigModal(false)}
                onSave={() => {
                    setShowHeaderConfigModal(false)
                    loadHeaderConfiguration()
                }}
                escolaId={escolaProfile?.id || professorProfile?.escola_id || ''}
                documentType="Pauta-Geral"
            />
        </div>
    )
}
