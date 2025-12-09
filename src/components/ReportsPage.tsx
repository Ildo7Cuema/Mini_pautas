/*
component-meta:
  name: ReportsPage
  description: Page for generating reports and exporting data
  tokens: [--color-primary, --fs-md, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Card, CardHeader, CardBody } from './ui/Card'
import { Button } from './ui/Button'
import { translateError } from '../utils/translations'
import { MiniPautaPreview } from './MiniPautaPreview'
import { OrdenarDisciplinasModal } from './OrdenarDisciplinasModal'
import { TurmaStatistics } from './TurmaStatistics'
import { generateMiniPautaPDF } from '../utils/pdfGenerator'
import { generateMiniPautaExcel, generateCSV } from '../utils/excelGenerator'
import { calculateNotaFinal, calculateStatistics } from '../utils/gradeCalculations'
import { evaluateFormula } from '../utils/formulaUtils'
import { FormulaConfig, loadFormulaConfig } from '../utils/formulaConfigUtils'
import { ConfiguracaoFormulasModal } from './ConfiguracaoFormulasModal'
import { HeaderConfig, loadHeaderConfig } from '../utils/headerConfigUtils'
import { ConfiguracaoCabecalhoModal } from './ConfiguracaoCabecalhoModal'
import { GradeColorConfig, loadGradeColorConfig } from '../utils/gradeColorConfigUtils'
import { ConfiguracaoCoresModal } from './ConfiguracaoCoresModal'
import { PautaGeralPage } from './PautaGeralPage'

interface Turma {
    id: string
    nome: string
    ano_lectivo: number
    codigo_turma: string
    nivel_ensino: string
}

interface Disciplina {
    id: string
    nome: string
    codigo_disciplina: string
    ordem?: number
}

interface ComponenteAvaliacao {
    id: string
    codigo_componente: string
    nome: string
    peso_percentual: number
    is_calculated?: boolean
    formula_expression?: string
    depends_on_components?: string[]
    disciplina_nome?: string  // For grouping in Primary Education format
    disciplina_ordem?: number  // For ordering disciplines in Primary Education format
}

interface TrimestreData {
    notas: Record<string, number>
    nota_final: number
    classificacao: string
    aprovado: boolean
}

interface MiniPautaData {
    turma: Turma
    disciplina: Disciplina
    trimestre: number | 'all'
    nivel_ensino?: string  // Educational level for color grading
    classe?: string  // Class level for color grading
    alunos: Array<{
        numero_processo: string
        nome_completo: string
        notas: Record<string, number>
        nota_final?: number  // Optional - only present if MF component is configured
        media_trimestral?: number | null
        classificacao: string
        aprovado: boolean
        // For all-trimester mode
        trimestres?: {
            1?: TrimestreData
            2?: TrimestreData
            3?: TrimestreData
        }
    }>
    componentes: ComponenteAvaliacao[]
    estatisticas: {
        total_alunos: number
        aprovados: number
        reprovados: number
        taxa_aprovacao: number
        media_turma: number
        nota_minima: number
        nota_maxima: number
        distribuicao: Record<string, number>
    }
    showMT?: boolean
    escola?: {
        nome: string
        provincia: string
        municipio: string
    }
}

export const ReportsPage: React.FC = () => {
    const [turmas, setTurmas] = useState<Turma[]>([])
    const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
    const [selectedTurma, setSelectedTurma] = useState<string>('')
    const [selectedTurmaData, setSelectedTurmaData] = useState<Turma | null>(null)
    const [selectedDisciplina, setSelectedDisciplina] = useState<string>('')
    const [trimestre, setTrimestre] = useState<1 | 2 | 3 | 'all'>(1)
    const [loadingData, setLoadingData] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [miniPautaData, setMiniPautaData] = useState<MiniPautaData | null>(null)
    const [mtConfig, setMtConfig] = useState<FormulaConfig | null>(null)
    const [showConfigModal, setShowConfigModal] = useState(false)
    const [headerConfig, setHeaderConfig] = useState<HeaderConfig | null>(null)
    const [showHeaderConfigModal, setShowHeaderConfigModal] = useState(false)
    const [showOrdenarDisciplinasModal, setShowOrdenarDisciplinasModal] = useState(false)
    const [colorConfig, setColorConfig] = useState<GradeColorConfig | null>(null)
    const [showColorConfigModal, setShowColorConfigModal] = useState(false)

    // Tab state
    const [activeTab, setActiveTab] = useState<'mini-pauta' | 'pauta-geral'>('mini-pauta')

    // Detect if selected turma is Primary Education
    const isPrimaryEducation = selectedTurmaData?.nivel_ensino?.toLowerCase().includes('primário') ||
        selectedTurmaData?.nivel_ensino?.toLowerCase().includes('primario') ||
        false

    useEffect(() => {
        loadTurmas()
    }, [])

    useEffect(() => {
        if (selectedTurma) {
            loadTurmaDetails()
            loadDisciplinas()
        } else {
            setSelectedTurmaData(null)
            setDisciplinas([])
            setSelectedDisciplina('')
        }
    }, [selectedTurma])

    // Reset selections when switching between Primary/Secondary education
    useEffect(() => {
        if (isPrimaryEducation) {
            // For Primary Education, default to trimestre 1 (no 'all' option)
            if (trimestre === 'all') {
                setTrimestre(1)
            }
        } else {
            // For Secondary Education, reset discipline if 'all' was selected (not valid for Secondary)
            if (selectedDisciplina === 'all') {
                setSelectedDisciplina('')
            }
        }
    }, [isPrimaryEducation])

    useEffect(() => {
        if (selectedTurma && selectedDisciplina) {
            loadMiniPautaData()
        } else {
            setMiniPautaData(null)
        }
    }, [selectedTurma, selectedDisciplina, trimestre])

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

    const loadTurmaDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('turmas')
                .select('id, nome, ano_lectivo, codigo_turma, nivel_ensino')
                .eq('id', selectedTurma)
                .single()

            if (error) throw error
            setSelectedTurmaData(data)
        } catch (err) {
            console.error('Error loading turma details:', err)
        }
    }

    const loadDisciplinas = async () => {
        try {
            const { data, error } = await supabase
                .from('disciplinas')
                .select('id, nome, codigo_disciplina, ordem')
                .eq('turma_id', selectedTurma)
                .order('ordem')

            if (error) throw error
            setDisciplinas(data || [])

            // Auto-select first discipline
            if (data && data.length > 0 && !selectedDisciplina) {
                setSelectedDisciplina(data[0].id)
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar disciplinas'
            setError(translateError(errorMessage))
        }
    }

    const loadMiniPautaData = async () => {
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

            // Extract classe from turma name (e.g., "10ª Classe A" -> "10ª Classe")
            const extractClasse = (turmaName: string): string | undefined => {
                const match = turmaName.match(/(\d+[ªº]\s*Classe)/i)
                return match ? match[1] : undefined
            }
            const classe = extractClasse(turmaData.nome)

            // Check if this is "All Disciplines" mode for Primary Education
            const isAllDisciplines = selectedDisciplina === 'all'
            const isPrimary = turmaData.nivel_ensino?.toLowerCase().includes('primário') ||
                turmaData.nivel_ensino?.toLowerCase().includes('primario')

            // Load disciplina details (skip if all disciplines mode)
            let disciplinaData: any = null
            if (!isAllDisciplines) {
                const { data, error: disciplinaError } = await supabase
                    .from('disciplinas')
                    .select('id, nome, codigo_disciplina')
                    .eq('id', selectedDisciplina)
                    .single()

                if (disciplinaError) throw disciplinaError
                disciplinaData = data
            } else {
                // For "all disciplines" mode, create a placeholder
                disciplinaData = {
                    id: 'all',
                    nome: 'Todas as Disciplinas',
                    codigo_disciplina: 'ALL'
                }
            }

            // Load componentes based on mode
            let componentesData: any[]

            if (isAllDisciplines && isPrimary) {
                // PRIMARY EDUCATION - ALL DISCIPLINES MODE
                // Load components from ALL disciplines for the selected trimestre
                const { data, error: componentesError } = await supabase
                    .from('componentes_avaliacao')
                    .select(`
                        id, 
                        codigo_componente, 
                        nome, 
                        peso_percentual, 
                        trimestre, 
                        is_calculated, 
                        formula_expression, 
                        depends_on_components,
                        disciplinas!inner(nome, ordem)
                    `)
                    .eq('turma_id', selectedTurma)
                    .eq('trimestre', trimestre)
                    .order('disciplinas(ordem)')
                    .order('ordem')

                if (componentesError) throw componentesError
                // Map the nested disciplina name and ordem to flat properties
                componentesData = (data || []).map((comp: any) => ({
                    ...comp,
                    disciplina_nome: comp.disciplinas?.nome,
                    disciplina_ordem: comp.disciplinas?.ordem
                }))
            } else if (trimestre === 'all') {
                // Load ALL components from all trimesters (including calculated components for display in reports)
                const { data, error: componentesError } = await supabase
                    .from('componentes_avaliacao')
                    .select(`
                        id, 
                        codigo_componente, 
                        nome, 
                        peso_percentual, 
                        trimestre, 
                        is_calculated, 
                        formula_expression, 
                        depends_on_components,
                        disciplinas!inner(nome)
                    `)
                    .eq('disciplina_id', selectedDisciplina)
                    .eq('turma_id', selectedTurma)
                    .order('trimestre')
                    .order('ordem')

                if (componentesError) throw componentesError
                // Map the nested disciplina name to a flat property
                componentesData = (data || []).map((comp: any) => ({
                    ...comp,
                    disciplina_nome: comp.disciplinas?.nome
                }))
            } else {
                // Load components for specific trimestre (including calculated components for display in reports)
                const { data, error: componentesError } = await supabase
                    .from('componentes_avaliacao')
                    .select(`
                        id, 
                        codigo_componente, 
                        nome, 
                        peso_percentual, 
                        trimestre, 
                        is_calculated, 
                        formula_expression, 
                        depends_on_components,
                        disciplinas!inner(nome)
                    `)
                    .eq('disciplina_id', selectedDisciplina)
                    .eq('turma_id', selectedTurma)
                    .eq('trimestre', trimestre)
                    .order('ordem')

                if (componentesError) throw componentesError
                // Map the nested disciplina name to a flat property
                componentesData = (data || []).map((comp: any) => ({
                    ...comp,
                    disciplina_nome: comp.disciplinas?.nome
                }))
            }

            if (!componentesData || componentesData.length === 0) {
                setError('Nenhum componente de avaliação configurado para esta disciplina')
                setMiniPautaData(null)
                return
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
                setMiniPautaData(null)
                return
            }

            // Load MT configuration (skip if "all disciplines" mode)
            if (selectedDisciplina !== 'all') {
                const config = await loadFormulaConfig(selectedDisciplina, selectedTurma, 'MT')
                setMtConfig(config)
            } else {
                setMtConfig(null)
            }


            // Handle ALL DISCIPLINES mode (Primary Education)
            if (isAllDisciplines && isPrimary) {
                // Load notas for all components in the selected trimestre
                const { data: notasData, error: notasError } = await supabase
                    .from('notas')
                    .select('aluno_id, componente_id, valor')
                    .eq('turma_id', selectedTurma)
                    .eq('trimestre', trimestre)
                    .in('componente_id', componentesData.map(c => c.id))

                if (notasError) throw notasError

                // Process data: organize by student with all disciplines
                const alunosComNotas = alunosData.map(aluno => {
                    const notasAluno = notasData?.filter(n => n.aluno_id === aluno.id) || []

                    // Build notas map by component ID (not code, since codes can repeat across disciplines)
                    const notasMap: Record<string, number> = {}
                    notasAluno.forEach(nota => {
                        const componente = componentesData.find(c => c.id === nota.componente_id)
                        if (componente) {
                            // Use component ID as key to avoid conflicts
                            notasMap[componente.id] = nota.valor
                        }
                    })

                    // Calculate values for calculated components
                    componentesData.forEach(componente => {
                        if (componente.is_calculated && componente.formula_expression && componente.depends_on_components) {
                            const dependencyValues: Record<string, number> = {}

                            componente.depends_on_components.forEach((depId: string) => {
                                const depComponent = componentesData.find(c => c.id === depId)
                                if (depComponent) {
                                    // Look up by ID
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
                                    // Store by ID
                                    notasMap[componente.id] = Math.round(calculatedValue * 100) / 100
                                } catch (error) {
                                    console.error(`Error calculating component ${componente.codigo_componente}:`, error)
                                }
                            }
                        }
                    })

                    return {
                        numero_processo: aluno.numero_processo,
                        nome_completo: aluno.nome_completo,
                        notas: notasMap,
                        nota_final: undefined,
                        classificacao: 'N/A',
                        aprovado: false
                    }
                })

                // Calculate statistics (using average of all component grades)
                const notasFinais = alunosComNotas.map(a => {
                    const notas = Object.values(a.notas).filter(n => n > 0)
                    return notas.length > 0 ? notas.reduce((sum, n) => sum + n, 0) / notas.length : 0
                }).filter(n => n > 0)
                const estatisticas = calculateStatistics(notasFinais)

                // Load escola info (optional)
                const { data: escolaData } = await supabase
                    .from('escolas')
                    .select('nome, provincia, municipio')
                    .limit(1)
                    .single()

                setMiniPautaData({
                    turma: turmaData,
                    disciplina: disciplinaData,
                    trimestre,
                    nivel_ensino: turmaData.nivel_ensino,
                    classe,
                    alunos: alunosComNotas,
                    componentes: componentesData,
                    estatisticas,
                    escola: escolaData || undefined
                })

            } else if (trimestre === 'all') {
                // Load notas from all trimestres
                const { data: allNotasData, error: notasError } = await supabase
                    .from('notas')
                    .select('aluno_id, componente_id, valor, trimestre')
                    .eq('turma_id', selectedTurma)
                    .in('componente_id', componentesData.map(c => c.id))
                    .in('trimestre', [1, 2, 3])

                if (notasError) throw notasError

                // Process data: organize by trimestre with component grades
                const alunosComNotas = alunosData.map(aluno => {
                    const trimestres: any = {}
                    const nfPorTrimestre: Record<number, number> = {}

                    // Process each trimestre
                    for (let t = 1; t <= 3; t++) {
                        // Get components for this specific trimestre
                        const componentesTrimestre = componentesData.filter(c => c.trimestre === t)

                        const notasTrimestre = allNotasData?.filter(
                            n => n.aluno_id === aluno.id && n.trimestre === t
                        ) || []

                        // Build notas map by component code for this trimestre
                        const notasMap: Record<string, number> = {}
                        notasTrimestre.forEach(nota => {
                            const componente = componentesTrimestre.find(c => c.id === nota.componente_id)
                            if (componente) {
                                notasMap[componente.codigo_componente] = nota.valor
                            }
                        })

                        // Calculate values for calculated components in this trimestre
                        componentesTrimestre.forEach(componente => {
                            if (componente.is_calculated && componente.formula_expression && componente.depends_on_components) {
                                console.log(`[DEBUG T${t}] Processing calculated component: ${componente.codigo_componente}`, {
                                    formula: componente.formula_expression,
                                    dependencies: componente.depends_on_components
                                })
                                console.log(`[DEBUG T${t}] Available components in trimester:`, componentesTrimestre.map(c => `${c.codigo_componente} (${c.id})`))
                                console.log(`[DEBUG T${t}] Current notasMap:`, notasMap)

                                // Build dependency values, using 0 for missing values
                                const dependencyValues: Record<string, number> = {}
                                let hasAtLeastOneValue = false

                                componente.depends_on_components.forEach((depId: string) => {
                                    // Search in ALL components from this trimester, not just componentesTrimestre
                                    // This is important because componentesTrimestre might be filtered
                                    const depComponent = componentesData.find(c => c.id === depId && c.trimestre === t)
                                    console.log(`[DEBUG T${t}] Looking for dependency ${depId}:`, depComponent?.codigo_componente)
                                    if (depComponent) {
                                        // Use the value if present, otherwise use 0
                                        const value = notasMap[depComponent.codigo_componente]
                                        if (value !== undefined) {
                                            dependencyValues[depComponent.codigo_componente] = value
                                            hasAtLeastOneValue = true
                                            console.log(`[DEBUG T${t}] Found value for ${depComponent.codigo_componente}:`, value)
                                        } else {
                                            dependencyValues[depComponent.codigo_componente] = 0
                                            console.log(`[DEBUG T${t}] Using 0 for missing dependency ${depComponent.codigo_componente}`)
                                        }
                                    }
                                })

                                // Calculate if we have the dependency components defined (even if some values are 0)
                                if (Object.keys(dependencyValues).length > 0) {
                                    try {
                                        console.log(`[DEBUG T${t}] Calculating ${componente.codigo_componente} with values:`, dependencyValues)
                                        const calculatedValue = evaluateFormula(componente.formula_expression, dependencyValues)
                                        notasMap[componente.codigo_componente] = Math.round(calculatedValue * 100) / 100
                                        console.log(`[DEBUG T${t}] Calculated value for ${componente.codigo_componente}:`, notasMap[componente.codigo_componente])
                                    } catch (error) {
                                        console.error(`Error calculating component ${componente.codigo_componente} in trimestre ${t}:`, error)
                                    }
                                } else {
                                    console.log(`[DEBUG T${t}] Skipping calculation for ${componente.codigo_componente} - no dependency components found`)
                                }
                            }
                        })

                        // Calculate NF for this trimestre using only its components
                        let nf = 0
                        if (notasTrimestre.length > 0 && componentesTrimestre.length > 0) {
                            const resultado = calculateNotaFinal(notasTrimestre, componentesTrimestre)
                            nf = resultado.nota_final
                        }

                        console.log(`[DEBUG T${t}] Final notasMap before assignment:`, notasMap)
                        trimestres[t] = {
                            notas: notasMap,
                            nota_final: nf
                        }

                        nfPorTrimestre[t] = nf
                    }

                    // MF is no longer calculated automatically
                    // It should be configured as a calculated component if needed

                    return {
                        numero_processo: aluno.numero_processo,
                        nome_completo: aluno.nome_completo,
                        notas: {}, // Not used in all-trimester mode
                        nota_final: undefined, // Will be calculated if MF component exists
                        media_trimestral: null,
                        classificacao: 'N/A', // Will be determined by MF component if configured
                        aprovado: false, // Will be determined by MF component if configured
                        trimestres // Contains data for each trimestre
                    }
                })

                // Calculate statistics based on MF if available, otherwise use average of trimester NFs
                const notasFinais = alunosComNotas.map(a => {
                    if (a.nota_final !== undefined && a.nota_final !== null) {
                        return a.nota_final
                    }
                    // Fallback: calculate average of available trimester NFs
                    const nfs: number[] = []
                    if (a.trimestres) {
                        for (let t = 1; t <= 3; t++) {
                            const trimestre = a.trimestres[t as 1 | 2 | 3]
                            if (trimestre && trimestre.nota_final > 0) {
                                nfs.push(trimestre.nota_final)
                            }
                        }
                    }
                    return nfs.length > 0 ? nfs.reduce((sum, n) => sum + n, 0) / nfs.length : 0
                }).filter(n => n > 0)
                const estatisticas = calculateStatistics(notasFinais)

                // Load escola info (optional)
                const { data: escolaData } = await supabase
                    .from('escolas')
                    .select('nome, provincia, municipio')
                    .limit(1)
                    .single()

                setMiniPautaData({
                    turma: turmaData,
                    disciplina: disciplinaData,
                    trimestre: 'all',
                    nivel_ensino: turmaData.nivel_ensino,
                    classe,
                    alunos: alunosComNotas,
                    componentes: componentesData,
                    estatisticas,
                    showMT: false,
                    escola: escolaData || undefined
                })

            } else {
                // Handle SINGLE TRIMESTRE mode (existing logic)
                const { data: notasData, error: notasError } = await supabase
                    .from('notas')
                    .select('aluno_id, componente_id, valor')
                    .eq('turma_id', selectedTurma)
                    .eq('trimestre', trimestre)
                    .in('componente_id', componentesData.map(c => c.id))

                if (notasError) throw notasError

                // Process data
                const alunosComNotas = alunosData.map(aluno => {
                    const notasAluno = notasData?.filter(n => n.aluno_id === aluno.id) || []

                    // Build notas map by component code
                    const notasMap: Record<string, number> = {}
                    notasAluno.forEach(nota => {
                        const componente = componentesData.find(c => c.id === nota.componente_id)
                        if (componente) {
                            notasMap[componente.codigo_componente] = nota.valor
                        }
                    })

                    // Calculate values for calculated components
                    componentesData.forEach(componente => {
                        if (componente.is_calculated && componente.formula_expression && componente.depends_on_components) {
                            console.log(`[DEBUG] Processing calculated component: ${componente.codigo_componente}`, {
                                formula: componente.formula_expression,
                                dependencies: componente.depends_on_components
                            })
                            console.table(componentesData.map(c => ({
                                ID: c.id,
                                Código: c.codigo_componente,
                                Nome: c.nome,
                                Trimestre: c.trimestre,
                                Calculado: c.is_calculated ? 'Sim' : 'Não'
                            })))
                            console.log(`[DEBUG] Current notasMap:`, notasMap)

                            // Build dependency values, using 0 for missing values
                            const dependencyValues: Record<string, number> = {}
                            let hasAtLeastOneValue = false

                            componente.depends_on_components.forEach((depId: string) => {
                                const depComponent = componentesData.find(c => c.id === depId)
                                console.log(`[DEBUG] Looking for dependency ${depId}:`, depComponent ? {
                                    code: depComponent.codigo_componente,
                                    trimestre: depComponent.trimestre,
                                    is_calculated: depComponent.is_calculated
                                } : 'NOT FOUND')

                                if (depComponent) {
                                    // Use the value if present, otherwise use 0
                                    const value = notasMap[depComponent.codigo_componente]
                                    if (value !== undefined) {
                                        dependencyValues[depComponent.codigo_componente] = value
                                        hasAtLeastOneValue = true
                                        console.log(`[DEBUG] Found value for ${depComponent.codigo_componente}:`, value)
                                    } else {
                                        dependencyValues[depComponent.codigo_componente] = 0
                                        console.log(`[DEBUG] Using 0 for missing dependency ${depComponent.codigo_componente}`)
                                    }
                                }
                            })

                            // Calculate if we have the dependency components defined (even if some values are 0)
                            if (Object.keys(dependencyValues).length > 0) {
                                try {
                                    console.log(`[DEBUG] Calculating ${componente.codigo_componente} with values:`, dependencyValues)
                                    const calculatedValue = evaluateFormula(componente.formula_expression, dependencyValues)
                                    notasMap[componente.codigo_componente] = Math.round(calculatedValue * 100) / 100
                                    console.log(`[DEBUG] Calculated value for ${componente.codigo_componente}:`, notasMap[componente.codigo_componente])
                                } catch (error) {
                                    console.error(`Error calculating component ${componente.codigo_componente}:`, error)
                                }
                            } else {
                                console.log(`[DEBUG] Skipping calculation for ${componente.codigo_componente} - no dependency components found`)
                            }
                        }
                    })

                    // Calculate final grade
                    const resultado = calculateNotaFinal(notasAluno, componentesData)

                    return {
                        numero_processo: aluno.numero_processo,
                        nome_completo: aluno.nome_completo,
                        notas: notasMap,
                        nota_final: resultado.nota_final,
                        classificacao: resultado.classificacao,
                        aprovado: resultado.aprovado,
                        media_trimestral: null
                    }
                })

                // Calculate statistics
                const notasFinais = alunosComNotas.map(a => a.nota_final)
                const estatisticas = calculateStatistics(notasFinais)

                // MT is no longer calculated automatically
                // It should be configured as a calculated component if needed

                // Load escola info (optional)
                const { data: escolaData } = await supabase
                    .from('escolas')
                    .select('nome, provincia, municipio')
                    .limit(1)
                    .single()

                setMiniPautaData({
                    turma: turmaData,
                    disciplina: disciplinaData,
                    trimestre,
                    nivel_ensino: turmaData.nivel_ensino,
                    classe,
                    alunos: alunosComNotas,
                    componentes: componentesData,
                    estatisticas,
                    escola: escolaData || undefined
                })
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados'
            setError(translateError(errorMessage))
            setMiniPautaData(null)
        } finally {
            setLoadingData(false)
        }
    }

    const loadHeaderConfiguration = async () => {
        try {
            const config = await loadHeaderConfig()
            setHeaderConfig(config)
        } catch (err) {
            console.error('Error loading header config:', err)
        }
    }

    const loadColorConfiguration = async () => {
        try {
            console.log('Loading color configuration for turma:', selectedTurma)
            const config = await loadGradeColorConfig(selectedTurma || undefined)
            console.log('Loaded color config:', config)
            setColorConfig(config)
        } catch (err) {
            console.error('Error loading color config:', err)
        }
    }

    const handleGeneratePDF = async () => {
        if (!miniPautaData) {
            setError('Carregue os dados primeiro')
            return
        }

        try {
            await generateMiniPautaPDF(miniPautaData, headerConfig, colorConfig)
            setSuccess('PDF gerado com sucesso!')
            setTimeout(() => setSuccess(null), 3000)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar PDF'
            setError(translateError(errorMessage))
        }
    }

    const handleGenerateExcel = () => {
        if (!miniPautaData) {
            setError('Carregue os dados primeiro')
            return
        }

        try {
            generateMiniPautaExcel(miniPautaData)
            setSuccess('Excel gerado com sucesso!')
            setTimeout(() => setSuccess(null), 3000)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar Excel'
            setError(translateError(errorMessage))
        }
    }

    const handleExportCSV = () => {
        if (!miniPautaData) {
            setError('Carregue os dados primeiro')
            return
        }

        try {
            generateCSV(miniPautaData)
            setSuccess('CSV exportado com sucesso!')
            setTimeout(() => setSuccess(null), 3000)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao exportar CSV'
            setError(translateError(errorMessage))
        }
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header with Tabs */}
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">Relatórios e Mini-Pautas</h2>
                <p className="text-sm md:text-base text-slate-600 mt-1">Gere relatórios e exporte dados das turmas</p>

                {/* Tab Navigation */}
                <div className="mt-4 border-b border-slate-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('mini-pauta')}
                            className={`
                                py-2 px-1 border-b-2 font-medium text-sm transition
                                ${activeTab === 'mini-pauta'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }
                            `}
                        >
                            Mini-Pauta
                        </button>
                        <button
                            onClick={() => setActiveTab('pauta-geral')}
                            className={`
                                py-2 px-1 border-b-2 font-medium text-sm transition
                                ${activeTab === 'pauta-geral'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }
                            `}
                        >
                            Pauta-Geral
                        </button>
                    </nav>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'mini-pauta' ? (
                <div className="space-y-4 md:space-y-6">{/* Mini-Pauta Content */}

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
                            <div className="flex items-center justify-between">
                                <h3 className="text-base md:text-lg font-semibold text-slate-900">Filtros</h3>
                                <div className="flex items-center gap-2">
                                    {selectedTurma && (
                                        <button
                                            onClick={() => setShowOrdenarDisciplinasModal(true)}
                                            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                            </svg>
                                            Ordenar Disciplinas
                                        </button>
                                    )}
                                    {selectedTurma && (
                                        <button
                                            onClick={() => setShowColorConfigModal(true)}
                                            className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                            </svg>
                                            Configurar Cores
                                        </button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardBody>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Disciplina</label>
                                    <select
                                        value={selectedDisciplina}
                                        onChange={(e) => setSelectedDisciplina(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        disabled={!selectedTurma || disciplinas.length === 0}
                                    >
                                        <option value="">Selecione uma disciplina</option>
                                        {/* For Primary Education, show "All Disciplines" option */}
                                        {isPrimaryEducation && (
                                            <option value="all">Todas as Disciplinas</option>
                                        )}
                                        {disciplinas.map((disciplina) => (
                                            <option key={disciplina.id} value={disciplina.id}>
                                                {disciplina.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Trimestre</label>
                                    <select
                                        value={trimestre}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setTrimestre(value === 'all' ? 'all' : parseInt(value) as 1 | 2 | 3)
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value={1}>1º Trimestre</option>
                                        <option value={2}>2º Trimestre</option>
                                        <option value={3}>3º Trimestre</option>
                                        {/* For Secondary Education, show "All Trimesters" option */}
                                        {!isPrimaryEducation && (
                                            <option value="all">Todos os Trimestres</option>
                                        )}
                                    </select>
                                </div>

                                <div className="flex items-end">
                                    <button
                                        onClick={loadMiniPautaData}
                                        disabled={!selectedTurma || !selectedDisciplina || loadingData}
                                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loadingData ? 'Carregando...' : 'Carregar Dados'}
                                    </button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Statistics */}
                    {miniPautaData && (
                        <TurmaStatistics statistics={miniPautaData.estatisticas} />
                    )}

                    {/* Preview */}
                    {miniPautaData && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-slate-900">Preview da Mini-Pauta</h3>
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
                            <MiniPautaPreview data={miniPautaData} loading={loadingData} colorConfig={colorConfig} />
                        </div>
                    )}

                    {!miniPautaData && !loadingData && selectedTurma && selectedDisciplina && (
                        <div className="bg-slate-50 rounded-lg p-8 text-center">
                            <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-slate-600">Clique em "Carregar Dados" para visualizar a mini-pauta</p>
                        </div>
                    )}

                    {/* Configuration Modal */}
                    <ConfiguracaoFormulasModal
                        isOpen={showConfigModal}
                        onClose={() => setShowConfigModal(false)}
                        disciplinaId={selectedDisciplina}
                        turmaId={selectedTurma}
                        currentConfig={mtConfig}
                        onSave={() => {
                            setShowConfigModal(false)
                            loadMiniPautaData()
                        }}
                    />

                    {/* Header Configuration Modal */}
                    <ConfiguracaoCabecalhoModal
                        isOpen={showHeaderConfigModal}
                        onClose={() => setShowHeaderConfigModal(false)}
                        onSave={() => {
                            setShowHeaderConfigModal(false)
                            loadHeaderConfiguration()
                        }}
                    />

                    {/* Ordenar Disciplinas Modal */}
                    {showOrdenarDisciplinasModal && (
                        <OrdenarDisciplinasModal
                            turmaId={selectedTurma}
                            onClose={() => setShowOrdenarDisciplinasModal(false)}
                            onSave={() => {
                                setShowOrdenarDisciplinasModal(false)
                                loadDisciplinas()
                            }}
                        />
                    )}

                    {/* Color Configuration Modal */}
                    <ConfiguracaoCoresModal
                        isOpen={showColorConfigModal}
                        onClose={() => setShowColorConfigModal(false)}
                        onSave={async () => {
                            console.log('Color config saved, reloading...')
                            await loadColorConfiguration()
                            setShowColorConfigModal(false)
                        }}
                        currentConfig={colorConfig}
                        nivelEnsino={selectedTurmaData?.nivel_ensino}
                        turmaId={selectedTurma}
                    />
                </div>
            ) : (
                <PautaGeralPage />
            )}
        </div>
    )
}
