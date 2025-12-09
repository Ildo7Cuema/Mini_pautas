import React from 'react'
import { GradeColorConfig, getGradeColorFromConfig } from '../utils/gradeColorConfigUtils'

interface TrimestreData {
    notas: Record<string, number>
    nota_final: number
}

interface MiniPautaPreviewSecundarioProps {
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
            trimestres?: {
                1?: TrimestreData
                2?: TrimestreData
                3?: TrimestreData
            }
        }>
        componentes: Array<{
            id: string  // Component ID for unique identification
            codigo_componente: string
            nome: string
            peso_percentual: number
            trimestre?: number
            is_calculated?: boolean
        }>
        showMT?: boolean
    }
    loading?: boolean
    colorConfig?: GradeColorConfig | null
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
 * MiniPautaPreviewSecundario - Preview component for Secondary Education
 * 
 * Supports two modes:
 * 1. Single trimester: Shows components as columns
 * 2. All trimesters: Groups trimesters as headers with their components below
 */
export const MiniPautaPreviewSecundario: React.FC<MiniPautaPreviewSecundarioProps> = ({
    data,
    loading,
    colorConfig
}) => {
    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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

    // Check if this is all-trimester mode
    const isAllTrimesters = data.trimestre === 'all' && data.alunos[0]?.trimestres

    if (isAllTrimesters) {
        // ALL TRIMESTERS MODE - Group by trimester
        const componentes1T = data.componentes.filter(c => c.trimestre === 1)
        const componentes2T = data.componentes.filter(c => c.trimestre === 2)
        const componentes3T = data.componentes.filter(c => c.trimestre === 3)

        return (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-blue-600 text-white">
                            <tr>
                                <th rowSpan={2} className="px-4 py-3 text-left text-sm font-semibold border-r border-blue-500">Nº</th>
                                <th rowSpan={2} className="px-4 py-3 text-left text-sm font-semibold border-r border-blue-500">Nome do Aluno</th>

                                {/* 1º Trimestre header */}
                                {componentes1T.length > 0 && (
                                    <th colSpan={componentes1T.length} className="px-4 py-2 text-center text-sm font-semibold border-r-2 border-blue-700 bg-blue-700">
                                        1º Trimestre
                                    </th>
                                )}

                                {/* 2º Trimestre header */}
                                {componentes2T.length > 0 && (
                                    <th colSpan={componentes2T.length} className="px-4 py-2 text-center text-sm font-semibold border-r-2 border-blue-700 bg-blue-700">
                                        2º Trimestre
                                    </th>
                                )}

                                {/* 3º Trimestre header */}
                                {componentes3T.length > 0 && (
                                    <th colSpan={componentes3T.length} className="px-4 py-2 text-center text-sm font-semibold bg-blue-700">
                                        3º Trimestre
                                    </th>
                                )}
                            </tr>
                            <tr>
                                {/* 1º Trimestre components */}
                                {componentes1T.map((comp, idx) => (
                                    <th
                                        key={`1-${comp.codigo_componente}`}
                                        className={`px-2 py-2 text-center text-xs font-semibold ${idx === componentes1T.length - 1 ? 'border-r-2 border-blue-700' : 'border-r border-blue-500'}`}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            {comp.codigo_componente}
                                            {comp.is_calculated && (
                                                <span className="text-yellow-300" title="Componente Calculado">📊</span>
                                            )}
                                        </div>
                                    </th>
                                ))}

                                {/* 2º Trimestre components */}
                                {componentes2T.map((comp, idx) => (
                                    <th
                                        key={`2-${comp.codigo_componente}`}
                                        className={`px-2 py-2 text-center text-xs font-semibold ${idx === componentes2T.length - 1 ? 'border-r-2 border-blue-700' : 'border-r border-blue-500'}`}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            {comp.codigo_componente}
                                            {comp.is_calculated && (
                                                <span className="text-yellow-300" title="Componente Calculado">📊</span>
                                            )}
                                        </div>
                                    </th>
                                ))}

                                {/* 3º Trimestre components */}
                                {componentes3T.map((comp, idx) => (
                                    <th
                                        key={`3-${comp.codigo_componente}`}
                                        className={`px-2 py-2 text-center text-xs font-semibold ${idx < componentes3T.length - 1 ? 'border-r border-blue-500' : ''}`}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            {comp.codigo_componente}
                                            {comp.is_calculated && (
                                                <span className="text-yellow-300" title="Componente Calculado">📊</span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {data.alunos.map((aluno, index) => (
                                <tr key={aluno.numero_processo} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-sm text-slate-600 border-r border-slate-200">{index + 1}</td>
                                    <td className="px-4 py-3 text-sm text-slate-900 border-r border-slate-200">{aluno.nome_completo}</td>

                                    {/* 1º Trimestre data */}
                                    {componentes1T.map((comp, idx) => {
                                        const nota = aluno.trimestres?.[1]?.notas[comp.codigo_componente]
                                        return (
                                            <td
                                                key={`1-${comp.codigo_componente}`}
                                                className={`px-2 py-3 text-center text-sm ${idx === componentes1T.length - 1 ? 'border-r-2 border-slate-300' : 'border-r border-slate-200'}`}
                                            >
                                                {renderGradeWithColor(nota, comp.is_calculated || false)}
                                            </td>
                                        )
                                    })}

                                    {/* 2º Trimestre data */}
                                    {componentes2T.map((comp, idx) => {
                                        const nota = aluno.trimestres?.[2]?.notas[comp.codigo_componente]
                                        return (
                                            <td
                                                key={`2-${comp.codigo_componente}`}
                                                className={`px-2 py-3 text-center text-sm ${idx === componentes2T.length - 1 ? 'border-r-2 border-slate-300' : 'border-r border-slate-200'}`}
                                            >
                                                {renderGradeWithColor(nota, comp.is_calculated || false)}
                                            </td>
                                        )
                                    })}

                                    {/* 3º Trimestre data */}
                                    {componentes3T.map((comp, idx) => {
                                        const nota = aluno.trimestres?.[3]?.notas[comp.codigo_componente]
                                        return (
                                            <td
                                                key={`3-${comp.codigo_componente}`}
                                                className={`px-2 py-3 text-center text-sm ${idx < componentes3T.length - 1 ? 'border-r border-slate-200' : ''}`}
                                            >
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

    // SINGLE TRIMESTER MODE - Standard layout
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-blue-600 text-white">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Nº</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Nome do Aluno</th>
                            {data.componentes.map((comp) => (
                                <th key={comp.codigo_componente} className="px-4 py-3 text-center text-sm font-semibold">
                                    <div className="flex items-center justify-center gap-1">
                                        <span>{comp.codigo_componente}</span>
                                        {comp.is_calculated && (
                                            <span className="text-yellow-300" title="Componente Calculado">📊</span>
                                        )}
                                    </div>
                                    <div className="text-xs font-normal opacity-90">({comp.peso_percentual}%)</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {data.alunos.map((aluno, index) => (
                            <tr key={aluno.numero_processo} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                                <td className="px-4 py-3 text-sm text-slate-900">{aluno.nome_completo}</td>
                                {data.componentes.map((comp) => {
                                    const nota = aluno.notas[comp.codigo_componente]
                                    return (
                                        <td key={comp.codigo_componente} className="px-4 py-3 text-center text-sm">
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
