import React from 'react'

interface TrimestreData {
    notas: Record<string, number>
    nota_final: number
}

interface MiniPautaPreviewProps {
    data: {
        trimestre?: number | 'all'
        nivel_ensino?: string  // Educational level (Ensino Secundário, Ensino Primário, etc.)
        classe?: string  // Class level (5ª Classe, 6ª Classe, etc.)
        alunos: Array<{
            numero_processo: string
            nome_completo: string
            notas: Record<string, number>
            nota_final?: number  // Optional - only present if MF component is configured
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
            codigo_componente: string
            nome: string
            peso_percentual: number
            trimestre?: number // Which trimestre this component belongs to
            is_calculated?: boolean // Whether this component is auto-calculated
        }>
        showMT?: boolean
    }
    loading?: boolean
}

/**
 * Determines the color class for a grade based on educational level, class, and component type
 */
const getGradeColor = (
    nota: number,
    nivelEnsino: string | undefined,
    classe: string | undefined,
    isCalculated: boolean
): string => {
    // Extract class number from classe string (e.g., "5ª Classe" -> 5)
    const classeNumber = classe ? parseInt(classe.match(/\d+/)?.[0] || '0') : 0

    // Ensino Primário (Primary Education)
    if (nivelEnsino?.toLowerCase().includes('primário') || nivelEnsino?.toLowerCase().includes('primario')) {
        // For 5ª and 6ª Classe
        if (classeNumber >= 5 && classeNumber <= 6) {
            // Calculated components (MFD, MF): negative 0-4.44, positive 4.45-10
            if (isCalculated) {
                return nota <= 4.44 ? 'text-red-600' : 'text-blue-600'
            }
            // Regular components: negative 0-4.44, positive 4.45-10
            return nota <= 4.44 ? 'text-red-600' : 'text-blue-600'
        }
        // For classes below 5ª Classe
        else if (classeNumber > 0 && classeNumber < 5) {
            // Only calculated components get negative color (0-4.44)
            if (isCalculated) {
                return nota <= 4.44 ? 'text-red-600' : 'text-blue-600'
            }
            // Other fields remain blue
            return 'text-blue-600'
        }
    }

    // Ensino Secundário and Escolas Tecnicas (Secondary and Technical Schools)
    // Default behavior for other educational levels
    // Calculated components (MFD, MF): negative 0-9.44, positive 9.45-20
    if (isCalculated) {
        return nota <= 9.44 ? 'text-red-600' : 'text-blue-600'
    }
    // Regular components: negative 0-9.99, positive 10-20
    return nota < 10 ? 'text-red-600' : 'text-blue-600'
}

export const MiniPautaPreview: React.FC<MiniPautaPreviewProps> = ({ data, loading }) => {
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

    // Check if this is all-trimester mode
    const isAllTrimesters = data.trimestre === 'all' && data.alunos[0]?.trimestres

    if (isAllTrimesters) {
        // Filter components by trimestre
        const componentes1T = data.componentes.filter(c => c.trimestre === 1)
        const componentes2T = data.componentes.filter(c => c.trimestre === 2)
        const componentes3T = data.componentes.filter(c => c.trimestre === 3)

        // Render horizontal trimester layout
        return (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-blue-600 text-white">
                            <tr>
                                <th rowSpan={2} className="px-4 py-3 text-left text-sm font-semibold border-r border-blue-500">Nº</th>
                                <th rowSpan={2} className="px-4 py-3 text-left text-sm font-semibold border-r border-blue-500">Nome do Aluno</th>

                                {/* 1º Trimestre */}
                                <th colSpan={componentes1T.length} className="px-4 py-2 text-center text-sm font-semibold border-r-2 border-blue-700">
                                    1º Trimestre
                                </th>

                                {/* 2º Trimestre */}
                                <th colSpan={componentes2T.length} className="px-4 py-2 text-center text-sm font-semibold border-r-2 border-blue-700">
                                    2º Trimestre
                                </th>

                                {/* 3º Trimestre */}
                                <th colSpan={componentes3T.length} className="px-4 py-2 text-center text-sm font-semibold border-r-2 border-blue-700">
                                    3º Trimestre
                                </th>
                            </tr>
                            <tr>
                                {/* 1º Trimestre components */}
                                {componentes1T.map(comp => (
                                    <th key={`1-${comp.codigo_componente}`} className="px-2 py-2 text-center text-xs font-semibold">
                                        <div className="flex items-center justify-center gap-1">
                                            {comp.codigo_componente}
                                            {comp.is_calculated && (
                                                <span className="text-yellow-300" title="Componente Calculado">
                                                    📊
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}


                                {/* 2º Trimestre components */}
                                {componentes2T.map(comp => (
                                    <th key={`2-${comp.codigo_componente}`} className="px-2 py-2 text-center text-xs font-semibold">
                                        <div className="flex items-center justify-center gap-1">
                                            {comp.codigo_componente}
                                            {comp.is_calculated && (
                                                <span className="text-yellow-300" title="Componente Calculado">
                                                    📊
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}


                                {/* 3º Trimestre components */}
                                {componentes3T.map(comp => (
                                    <th key={`3-${comp.codigo_componente}`} className="px-2 py-2 text-center text-xs font-semibold">
                                        <div className="flex items-center justify-center gap-1">
                                            {comp.codigo_componente}
                                            {comp.is_calculated && (
                                                <span className="text-yellow-300" title="Componente Calculado">
                                                    📊
                                                </span>
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
                                    {componentes1T.map(comp => {
                                        const nota = aluno.trimestres?.[1]?.notas[comp.codigo_componente]
                                        return (
                                            <td key={`1-${comp.codigo_componente}`} className="px-2 py-3 text-center text-sm">
                                                {nota !== undefined ? (
                                                    <span className={`font-medium ${getGradeColor(nota, data.nivel_ensino, data.classe, comp.is_calculated || false)}`}>
                                                        {nota.toFixed(1)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                        )
                                    })}


                                    {/* 2º Trimestre data */}
                                    {componentes2T.map(comp => {
                                        const nota = aluno.trimestres?.[2]?.notas[comp.codigo_componente]
                                        return (
                                            <td key={`2-${comp.codigo_componente}`} className="px-2 py-3 text-center text-sm">
                                                {nota !== undefined ? (
                                                    <span className={`font-medium ${getGradeColor(nota, data.nivel_ensino, data.classe, comp.is_calculated || false)}`}>
                                                        {nota.toFixed(1)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                        )
                                    })}


                                    {/* 3º Trimestre data */}
                                    {componentes3T.map(comp => {
                                        const nota = aluno.trimestres?.[3]?.notas[comp.codigo_componente]
                                        return (
                                            <td key={`3-${comp.codigo_componente}`} className="px-2 py-3 text-center text-sm">
                                                {nota !== undefined ? (
                                                    <span className={`font-medium ${getGradeColor(nota, data.nivel_ensino, data.classe, comp.is_calculated || false)}`}>
                                                        {nota.toFixed(1)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
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

    // Render component-based view (works for single trimester mode)
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
                                            <span className="text-yellow-300" title="Componente Calculado">
                                                📊
                                            </span>
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
                                            {nota !== undefined ? (
                                                <span className={`font-medium ${getGradeColor(nota, data.nivel_ensino, data.classe, comp.is_calculated || false)}`}>
                                                    {nota.toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
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
