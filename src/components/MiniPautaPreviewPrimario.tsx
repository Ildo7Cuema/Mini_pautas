import React from 'react'
import { GradeColorConfig, getGradeColorFromConfig } from '../utils/gradeColorConfigUtils'

interface MiniPautaPreviewPrimarioProps {
    data: {
        turma: {
            nome: string
            codigo_turma: string
            ano_lectivo: number
        }
        disciplina: {
            nome: string
            codigo_disciplina: string
        }
        trimestre: number | 'all'
        nivel_ensino?: string
        classe?: string
        alunos: Array<{
            numero_processo: string
            nome_completo: string
            notas: Record<string, number>
            nota_final?: number
            media_trimestral?: number | null
            classificacao: string
            aprovado: boolean
        }>
        componentes: Array<{
            id: string  // Component ID for unique identification
            codigo_componente: string
            nome: string
            peso_percentual: number
            trimestre?: number
            is_calculated?: boolean
            disciplina_nome?: string
            disciplina_ordem?: number
        }>
        showMT?: boolean
    }
    loading?: boolean
    colorConfig?: GradeColorConfig | null
}

/**
 * Groups components by discipline name for Primary Education format
 */
interface DisciplineGroup {
    disciplina_nome: string
    ordem?: number
    componentes: Array<{ id: string; codigo_componente: string; is_calculated?: boolean }>
}

const groupComponentsByDiscipline = (componentes: MiniPautaPreviewPrimarioProps['data']['componentes']): DisciplineGroup[] => {
    const disciplineMap = new Map<string, DisciplineGroup>()

    componentes.forEach(comp => {
        const disciplineName = comp.disciplina_nome || 'Sem Disciplina'

        if (!disciplineMap.has(disciplineName)) {
            disciplineMap.set(disciplineName, {
                disciplina_nome: disciplineName,
                ordem: comp.disciplina_ordem,
                componentes: []
            })
        }

        const group = disciplineMap.get(disciplineName)!
        group.componentes.push({
            id: comp.id,
            codigo_componente: comp.codigo_componente,
            is_calculated: comp.is_calculated
        })
    })

    // Sort by ordem if available, otherwise fall back to alphabetical sorting
    return Array.from(disciplineMap.values()).sort((a, b) => {
        if (a.ordem !== undefined && b.ordem !== undefined) {
            return a.ordem - b.ordem
        }
        return a.disciplina_nome.localeCompare(b.disciplina_nome)
    })
}

/**
 * Get grade color class for styling
 */
const getGradeColorClass = (
    nota: number,
    nivelEnsino: string | undefined,
    classe: string | undefined,
    isCalculated: boolean,
    config: GradeColorConfig | null
): string => {
    const result = getGradeColorFromConfig(nota, nivelEnsino, classe, isCalculated, config)
    if (result.color === '#dc2626') return 'text-red-600'
    if (result.color === '#2563eb') return 'text-blue-600'
    return ''
}

/**
 * MiniPautaPreviewPrimario - Preview component for Primary Education
 * 
 * Supports two modes:
 * 1. Single discipline: Shows components as columns
 * 2. All disciplines: Groups disciplines as headers with their components below
 */
export const MiniPautaPreviewPrimario: React.FC<MiniPautaPreviewPrimarioProps> = ({
    data,
    loading,
    colorConfig
}) => {
    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                <p className="mt-4 text-slate-600">Carregando dados...</p>
            </div>
        )
    }

    if (!data.alunos || data.alunos.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-600">Nenhum dado disponível</p>
                <p className="text-sm text-slate-500 mt-2">Selecione uma turma e disciplina para visualizar a mini-pauta</p>
            </div>
        )
    }

    // Helper function to render grade with color
    const renderGradeWithColor = (nota: number | undefined, isCalculated: boolean) => {
        if (nota === undefined) {
            return <span className="text-slate-400">-</span>
        }

        const result = getGradeColorFromConfig(nota, data.nivel_ensino, data.classe, isCalculated, colorConfig || null)
        const colorClass = getGradeColorClass(nota, data.nivel_ensino, data.classe, isCalculated, colorConfig || null)

        if (colorClass) {
            return <span className={`font-medium ${colorClass}`}>{nota.toFixed(1)}</span>
        } else {
            return <span className="font-medium" style={{ color: result.color }}>{nota.toFixed(1)}</span>
        }
    }

    // Check if this is all disciplines mode
    const isAllDisciplines = data.componentes.length > 0 &&
        data.componentes.some(c => c.disciplina_nome) &&
        new Set(data.componentes.map(c => c.disciplina_nome)).size > 1

    if (isAllDisciplines) {
        // ALL DISCIPLINES MODE - Group by discipline
        const disciplineGroups = groupComponentsByDiscipline(data.componentes)

        return (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead className="bg-green-600 text-white">
                            <tr>
                                <th rowSpan={2} className="border border-slate-300 px-2 py-0.5 text-left text-sm font-semibold sticky left-0 bg-green-600 z-10">Nº</th>
                                <th rowSpan={2} className="border border-slate-300 px-3 py-0.5 text-left text-sm font-semibold sticky left-[45px] bg-green-600 z-10">Nome do Aluno</th>

                                {/* Discipline headers */}
                                {disciplineGroups.map((group) => (
                                    <th
                                        key={group.disciplina_nome}
                                        colSpan={group.componentes.length}
                                        className="border border-slate-300 px-2 py-0.5 text-center text-sm font-semibold bg-green-700"
                                    >
                                        {group.disciplina_nome}
                                    </th>
                                ))}
                            </tr>
                            <tr>
                                {/* Component headers for each discipline */}
                                {disciplineGroups.map((group) => (
                                    <React.Fragment key={`comps-${group.disciplina_nome}`}>
                                        {group.componentes.map((comp, compIdx) => (
                                            <th
                                                key={`${group.disciplina_nome}-${compIdx}`}
                                                className={`border border-slate-300 px-2 py-0.5 text-center text-xs font-semibold ${comp.is_calculated ? 'bg-blue-100' : ''}`}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    {comp.codigo_componente}
                                                    {comp.is_calculated && (
                                                        <span className="text-yellow-600" title="Componente Calculado">📊</span>
                                                    )}
                                                </div>
                                            </th>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.alunos.map((aluno, index) => (
                                <tr key={aluno.numero_processo} className="hover:bg-slate-50">
                                    <td className="border border-slate-300 px-2 py-0.5 text-sm text-slate-600 sticky left-0 bg-white z-10">{index + 1}</td>
                                    <td className="border border-slate-300 px-3 py-0.5 text-sm text-slate-900 sticky left-[45px] bg-white z-10">{aluno.nome_completo}</td>

                                    {/* Data for each discipline */}
                                    {disciplineGroups.map((group) => (
                                        <React.Fragment key={`data-${group.disciplina_nome}`}>
                                            {group.componentes.map((comp, compIdx) => {
                                                // Use component id for grade lookup to avoid conflicts
                                                const nota = aluno.notas[comp.id]
                                                return (
                                                    <td
                                                        key={`${group.disciplina_nome}-${compIdx}-data`}
                                                        className={`border border-slate-300 px-2 py-0.5 text-center text-sm ${comp.is_calculated ? 'bg-blue-50' : ''}`}
                                                    >
                                                        {renderGradeWithColor(nota, comp.is_calculated || false)}
                                                    </td>
                                                )
                                            })}
                                        </React.Fragment>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    // SINGLE DISCIPLINE MODE - Standard layout
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead className="bg-green-600 text-white">
                        <tr>
                            <th className="border border-slate-300 px-2 py-0.5 text-left text-sm font-semibold">Nº</th>
                            <th className="border border-slate-300 px-3 py-0.5 text-left text-sm font-semibold">Nome do Aluno</th>
                            {data.componentes.map((comp) => (
                                <th key={comp.codigo_componente} className={`border border-slate-300 px-2 py-0.5 text-center text-sm font-semibold ${comp.is_calculated ? 'bg-blue-100' : ''}`}>
                                    <div className="flex items-center justify-center gap-1">
                                        <span>{comp.codigo_componente}</span>
                                        {comp.is_calculated && (
                                            <span className="text-yellow-600" title="Componente Calculado">📊</span>
                                        )}
                                    </div>
                                    <div className="text-xs font-normal opacity-90">({comp.peso_percentual}%)</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.alunos.map((aluno, index) => (
                            <tr key={aluno.numero_processo} className="hover:bg-slate-50">
                                <td className="border border-slate-300 px-2 py-0.5 text-sm text-slate-600">{index + 1}</td>
                                <td className="border border-slate-300 px-3 py-0.5 text-sm text-slate-900">{aluno.nome_completo}</td>
                                {data.componentes.map((comp) => {
                                    const nota = aluno.notas[comp.codigo_componente]
                                    return (
                                        <td key={comp.codigo_componente} className={`border border-slate-300 px-2 py-0.5 text-center text-sm ${comp.is_calculated ? 'bg-blue-50' : ''}`}>
                                            {renderGradeWithColor(nota, comp.is_calculated || false)}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
