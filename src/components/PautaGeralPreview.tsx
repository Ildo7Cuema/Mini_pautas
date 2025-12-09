/*
component-meta:
  name: PautaGeralPreview
  description: Preview component for Pauta-Geral data
  tokens: [--color-primary, --fs-sm]
  responsive: true
*/

import { Card, CardBody } from './ui/Card'
import { GradeColorConfig, getGradeColorFromConfig } from '../utils/gradeColorConfigUtils'

interface ComponenteAvaliacao {
    id: string
    codigo_componente: string
    nome: string
    peso_percentual: number
    trimestre: number
    is_calculated?: boolean
}

interface DisciplinaComComponentes {
    id: string
    nome: string
    codigo_disciplina: string
    ordem: number
    componentes: ComponenteAvaliacao[]
}

interface PautaGeralData {
    turma: {
        nome: string
        ano_lectivo: number
        codigo_turma: string
        nivel_ensino: string
    }
    trimestre: number
    nivel_ensino?: string
    classe?: string
    alunos: Array<{
        numero_processo: string
        nome_completo: string
        notas_por_disciplina: Record<string, Record<string, number>>
        media_geral: number
        observacao: 'Transita' | 'Não Transita'
    }>
    disciplinas: DisciplinaComComponentes[]
    estatisticas?: {
        por_disciplina: Record<string, any>
        geral: any
    }
}

interface FieldSelection {
    disciplinas: string[]
    includeAllDisciplinas: boolean
    componentes: string[]
    includeAllComponentes: boolean
    showStatistics: boolean
    showNumeroProcesso: boolean
    showNomeCompleto: boolean
    showMediaGeral: boolean
    showObservacao: boolean
    componenteParaMediaGeral: string
}

interface Props {
    data: PautaGeralData
    loading: boolean
    colorConfig: GradeColorConfig | null
    fieldSelection: FieldSelection
}

export const PautaGeralPreview: React.FC<Props> = ({ data, loading, colorConfig, fieldSelection }) => {
    if (loading) {
        return (
            <Card>
                <CardBody>
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                </CardBody>
            </Card>
        )
    }

    const getGradeColor = (nota: number, isCalculated: boolean = false): string => {
        const result = getGradeColorFromConfig(
            nota,
            data.nivel_ensino,
            data.classe,
            isCalculated,
            colorConfig
        )
        return result.color
    }

    // Filter to show only selected disciplines
    const visibleDisciplinas = data.disciplinas.filter(d =>
        fieldSelection.disciplinas.includes(d.id)
    )

    // Calculate média geral dynamically based on selected disciplines
    const calculateMediaGeralForSelectedDisciplinas = (aluno: any): { media: number; observacao: 'Transita' | 'Não Transita' } => {
        const notasFinaisDisciplinas: number[] = []

        // Only calculate for selected/visible disciplines
        visibleDisciplinas.forEach(disc => {
            const notasDisciplina = aluno.notas_por_disciplina[disc.id] || {}

            // Find the specific component to use for média geral (e.g., 'MF', 'MT', 'NF')
            const componenteParaMedia = disc.componentes.find(
                comp => comp.codigo_componente === fieldSelection.componenteParaMediaGeral
            )

            if (componenteParaMedia) {
                const nota = notasDisciplina[componenteParaMedia.id]

                if (nota !== undefined && nota > 0) {
                    // Use the nota directly from the selected component
                    let notaFinalDisciplina = nota

                    // CAP at 10: If discipline average > 10, set it to 10
                    if (notaFinalDisciplina > 10) {
                        notaFinalDisciplina = 10
                    }

                    notasFinaisDisciplinas.push(notaFinalDisciplina)
                }
            }
        })

        // Calculate average across selected disciplines
        let mediaGeral = 0
        if (notasFinaisDisciplinas.length > 0) {
            mediaGeral = notasFinaisDisciplinas.reduce((sum, n) => sum + n, 0) / notasFinaisDisciplinas.length
            mediaGeral = Math.round(mediaGeral * 100) / 100
        }

        // Determine if Primary or Secondary education
        const isPrimary = data.nivel_ensino?.toLowerCase().includes('primário') ||
            data.nivel_ensino?.toLowerCase().includes('primario')

        // Threshold for transition
        const transitaThreshold = isPrimary ? 4.45 : 9.45

        // Determine observação
        const observacao: 'Transita' | 'Não Transita' =
            (mediaGeral >= transitaThreshold && mediaGeral <= 10) ? 'Transita' : 'Não Transita'

        return { media: mediaGeral, observacao }
    }


    return (
        <Card>
            <CardBody>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                            {/* First row: Discipline headers */}
                            <tr>
                                {fieldSelection.showNumeroProcesso && (
                                    <th rowSpan={2} className="px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase tracking-wider border-r border-slate-200 sticky left-0 bg-slate-50 z-10">
                                        Nº
                                    </th>
                                )}
                                {fieldSelection.showNomeCompleto && (
                                    <th rowSpan={2} className="px-3 py-2 text-left text-xs font-medium text-slate-700 uppercase tracking-wider border-r border-slate-200 sticky left-0 bg-slate-50 z-10" style={{ left: fieldSelection.showNumeroProcesso ? '60px' : '0' }}>
                                        Nome do Aluno
                                    </th>
                                )}
                                {visibleDisciplinas.map((disciplina) => {
                                    const visibleComponentes = disciplina.componentes.filter(c =>
                                        fieldSelection.componentes.includes(c.id)
                                    )
                                    if (visibleComponentes.length === 0) return null

                                    return (
                                        <th
                                            key={disciplina.id}
                                            colSpan={visibleComponentes.length}
                                            className="px-3 py-2 text-center text-xs font-bold text-white uppercase tracking-wider bg-blue-600 border-r border-blue-700"
                                        >
                                            {disciplina.nome}
                                        </th>
                                    )
                                })}
                                {fieldSelection.showMediaGeral && (
                                    <th rowSpan={2} className="px-3 py-2 text-center text-xs font-medium text-slate-700 uppercase tracking-wider bg-amber-50 border-l-2 border-amber-300">
                                        Média Geral
                                    </th>
                                )}
                                {fieldSelection.showObservacao && (
                                    <th rowSpan={2} className="px-3 py-2 text-center text-xs font-medium text-slate-700 uppercase tracking-wider bg-slate-50 border-l-2 border-slate-300">
                                        Observação
                                    </th>
                                )}
                            </tr>
                            {/* Second row: Component codes */}
                            <tr>
                                {visibleDisciplinas.map((disciplina) => {
                                    const visibleComponentes = disciplina.componentes.filter(c =>
                                        fieldSelection.componentes.includes(c.id)
                                    )
                                    return visibleComponentes.map((componente) => (
                                        <th
                                            key={componente.id}
                                            className="px-2 py-2 text-center text-xs font-medium text-slate-700 bg-slate-100 border-r border-slate-200"
                                        >
                                            {componente.codigo_componente}
                                        </th>
                                    ))
                                })}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {data.alunos.map((aluno, index) => {
                                // Calculate média geral dynamically for selected disciplines
                                const { media: mediaGeralDinamica, observacao: observacaoDinamica } =
                                    calculateMediaGeralForSelectedDisciplinas(aluno)

                                return (
                                    <tr key={index} className="hover:bg-slate-50">
                                        {fieldSelection.showNumeroProcesso && (
                                            <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-900 border-r border-slate-200 sticky left-0 bg-white">
                                                {index + 1}
                                            </td>
                                        )}
                                        {fieldSelection.showNomeCompleto && (
                                            <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-900 border-r border-slate-200 sticky left-0 bg-white" style={{ left: fieldSelection.showNumeroProcesso ? '60px' : '0' }}>
                                                {aluno.nome_completo}
                                            </td>
                                        )}
                                        {visibleDisciplinas.map((disciplina) => {
                                            const notasDisciplina = aluno.notas_por_disciplina[disciplina.id] || {}
                                            const visibleComponentes = disciplina.componentes.filter(c =>
                                                fieldSelection.componentes.includes(c.id)
                                            )

                                            return visibleComponentes.map((componente) => {
                                                const nota = notasDisciplina[componente.id]
                                                const hasNota = nota !== undefined && nota !== null
                                                const color = hasNota ? getGradeColor(nota, componente.is_calculated || false) : '#000000'

                                                return (
                                                    <td
                                                        key={componente.id}
                                                        className="px-2 py-2 whitespace-nowrap text-center text-xs font-medium border-r border-slate-200"
                                                        style={{ color }}
                                                    >
                                                        {hasNota ? nota.toFixed(1) : '-'}
                                                    </td>
                                                )
                                            })
                                        })}
                                        {fieldSelection.showMediaGeral && (
                                            <td className="px-3 py-2 whitespace-nowrap text-center text-sm font-bold bg-amber-50 border-l-2 border-amber-300">
                                                {mediaGeralDinamica.toFixed(2)}
                                            </td>
                                        )}
                                        {fieldSelection.showObservacao && (
                                            <td className="px-3 py-2 whitespace-nowrap text-center text-xs font-semibold border-l-2 border-slate-300">
                                                <span className={observacaoDinamica === 'Transita' ? 'text-blue-600' : 'text-red-600'}>
                                                    {observacaoDinamica}
                                                </span>
                                            </td>
                                        )}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Statistics */}
                {fieldSelection.showStatistics && data.estatisticas && (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">Estatísticas Gerais</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                            <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-600">Total de Alunos</p>
                                <p className="text-lg font-bold text-slate-900">{data.estatisticas.geral.total_alunos}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3">
                                <p className="text-xs text-green-700">Aprovados</p>
                                <p className="text-lg font-bold text-green-900">{data.estatisticas.geral.aprovados}</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3">
                                <p className="text-xs text-red-700">Reprovados</p>
                                <p className="text-lg font-bold text-red-900">{data.estatisticas.geral.reprovados}</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3">
                                <p className="text-xs text-blue-700">Média Geral</p>
                                <p className="text-lg font-bold text-blue-900">{data.estatisticas.geral.media_turma?.toFixed(2) || 'N/A'}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-3">
                                <p className="text-xs text-purple-700">Nota Mínima</p>
                                <p className="text-lg font-bold text-purple-900">{data.estatisticas.geral.nota_minima?.toFixed(2) || 'N/A'}</p>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-3">
                                <p className="text-xs text-orange-700">Nota Máxima</p>
                                <p className="text-lg font-bold text-orange-900">{data.estatisticas.geral.nota_maxima?.toFixed(2) || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                )}
            </CardBody>
        </Card >
    )
}
