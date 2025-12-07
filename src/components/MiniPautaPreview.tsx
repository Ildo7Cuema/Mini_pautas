import React from 'react'

interface TrimestreData {
    notas: Record<string, number>
    nota_final: number
}

interface MiniPautaPreviewProps {
    data: {
        trimestre?: number | 'all'
        alunos: Array<{
            numero_processo: string
            nome_completo: string
            notas: Record<string, number>
            nota_final: number
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
        }>
        showMT?: boolean
    }
    loading?: boolean
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
                                <th rowSpan={2} className="px-4 py-3 text-left text-sm font-semibold border-r border-blue-500">Nº Processo</th>
                                <th rowSpan={2} className="px-4 py-3 text-left text-sm font-semibold border-r border-blue-500">Nome do Aluno</th>

                                {/* 1º Trimestre */}
                                <th colSpan={componentes1T.length + 1} className="px-4 py-2 text-center text-sm font-semibold border-r-2 border-blue-700">
                                    1º Trimestre
                                </th>

                                {/* 2º Trimestre */}
                                <th colSpan={componentes2T.length + 1} className="px-4 py-2 text-center text-sm font-semibold border-r-2 border-blue-700">
                                    2º Trimestre
                                </th>

                                {/* 3º Trimestre */}
                                <th colSpan={componentes3T.length + 1} className="px-4 py-2 text-center text-sm font-semibold border-r-2 border-blue-700">
                                    3º Trimestre
                                </th>

                                {/* MF */}
                                <th rowSpan={2} className="px-4 py-3 text-center text-sm font-semibold bg-purple-700">
                                    <div>MF</div>
                                    <div className="text-xs font-normal opacity-90">Média Final</div>
                                </th>
                            </tr>
                            <tr>
                                {/* 1º Trimestre components */}
                                {componentes1T.map(comp => (
                                    <th key={`1-${comp.codigo_componente}`} className="px-2 py-2 text-center text-xs font-semibold">
                                        {comp.codigo_componente}
                                    </th>
                                ))}
                                <th className="px-2 py-2 text-center text-xs font-semibold bg-blue-700 border-r-2 border-blue-700">
                                    MT1
                                </th>

                                {/* 2º Trimestre components */}
                                {componentes2T.map(comp => (
                                    <th key={`2-${comp.codigo_componente}`} className="px-2 py-2 text-center text-xs font-semibold">
                                        {comp.codigo_componente}
                                    </th>
                                ))}
                                <th className="px-2 py-2 text-center text-xs font-semibold bg-blue-700 border-r-2 border-blue-700">
                                    MT2
                                </th>

                                {/* 3º Trimestre components */}
                                {componentes3T.map(comp => (
                                    <th key={`3-${comp.codigo_componente}`} className="px-2 py-2 text-center text-xs font-semibold">
                                        {comp.codigo_componente}
                                    </th>
                                ))}
                                <th className="px-2 py-2 text-center text-xs font-semibold bg-blue-700">
                                    MT3
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {data.alunos.map((aluno, index) => (
                                <tr key={aluno.numero_processo} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-sm text-slate-600 border-r border-slate-200">{index + 1}</td>
                                    <td className="px-4 py-3 text-sm text-slate-900 font-medium border-r border-slate-200">{aluno.numero_processo}</td>
                                    <td className="px-4 py-3 text-sm text-slate-900 border-r border-slate-200">{aluno.nome_completo}</td>

                                    {/* 1º Trimestre data */}
                                    {componentes1T.map(comp => {
                                        const nota = aluno.trimestres?.[1]?.notas[comp.codigo_componente]
                                        return (
                                            <td key={`1-${comp.codigo_componente}`} className="px-2 py-3 text-center text-sm">
                                                {nota !== undefined ? (
                                                    <span className={`font-medium ${nota < 10 ? 'text-red-600' : 'text-slate-900'}`}>
                                                        {nota.toFixed(1)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                        )
                                    })}
                                    <td className="px-2 py-3 text-center border-r-2 border-slate-300">
                                        {aluno.trimestres?.[1]?.nota_final ? (
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${aluno.trimestres[1]!.nota_final >= 10
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}>
                                                {aluno.trimestres[1]!.nota_final.toFixed(1)}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </td>

                                    {/* 2º Trimestre data */}
                                    {componentes2T.map(comp => {
                                        const nota = aluno.trimestres?.[2]?.notas[comp.codigo_componente]
                                        return (
                                            <td key={`2-${comp.codigo_componente}`} className="px-2 py-3 text-center text-sm">
                                                {nota !== undefined ? (
                                                    <span className={`font-medium ${nota < 10 ? 'text-red-600' : 'text-slate-900'}`}>
                                                        {nota.toFixed(1)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                        )
                                    })}
                                    <td className="px-2 py-3 text-center border-r-2 border-slate-300">
                                        {aluno.trimestres?.[2]?.nota_final ? (
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${aluno.trimestres[2]!.nota_final >= 10
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}>
                                                {aluno.trimestres[2]!.nota_final.toFixed(1)}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </td>

                                    {/* 3º Trimestre data */}
                                    {componentes3T.map(comp => {
                                        const nota = aluno.trimestres?.[3]?.notas[comp.codigo_componente]
                                        return (
                                            <td key={`3-${comp.codigo_componente}`} className="px-2 py-3 text-center text-sm">
                                                {nota !== undefined ? (
                                                    <span className={`font-medium ${nota < 10 ? 'text-red-600' : 'text-slate-900'}`}>
                                                        {nota.toFixed(1)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                        )
                                    })}
                                    <td className="px-2 py-3 text-center">
                                        {aluno.trimestres?.[3]?.nota_final ? (
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${aluno.trimestres[3]!.nota_final >= 10
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}>
                                                {aluno.trimestres[3]!.nota_final.toFixed(1)}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </td>

                                    {/* MF */}
                                    <td className="px-4 py-3 text-center bg-purple-50">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold ${aluno.aprovado ? 'bg-purple-100 text-purple-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {aluno.nota_final.toFixed(2)}
                                        </span>
                                    </td>
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
                            <th className="px-4 py-3 text-left text-sm font-semibold">Nº Processo</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Nome do Aluno</th>
                            {data.componentes.map((comp) => (
                                <th key={comp.codigo_componente} className="px-4 py-3 text-center text-sm font-semibold">
                                    <div>{comp.codigo_componente}</div>
                                    <div className="text-xs font-normal opacity-90">({comp.peso_percentual}%)</div>
                                </th>
                            ))}
                            <th className="px-4 py-3 text-center text-sm font-semibold bg-blue-700">
                                <div>NF</div>
                                <div className="text-xs font-normal opacity-90">Nota Final</div>
                            </th>
                            {data.showMT && (
                                <th className="px-4 py-3 text-center text-sm font-semibold bg-purple-700">
                                    <div>MT</div>
                                    <div className="text-xs font-normal opacity-90">Média Trimestral</div>
                                </th>
                            )}
                            <th className="px-4 py-3 text-center text-sm font-semibold bg-blue-700">Classificação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {data.alunos.map((aluno, index) => (
                            <tr key={aluno.numero_processo} className={`hover:bg-slate-50 ${!aluno.aprovado ? 'bg-red-50' : ''}`}>
                                <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                                <td className="px-4 py-3 text-sm text-slate-900 font-medium">{aluno.numero_processo}</td>
                                <td className="px-4 py-3 text-sm text-slate-900">{aluno.nome_completo}</td>
                                {data.componentes.map((comp) => {
                                    const nota = aluno.notas[comp.codigo_componente]
                                    return (
                                        <td key={comp.codigo_componente} className="px-4 py-3 text-center text-sm">
                                            {nota !== undefined ? (
                                                <span className={`font-medium ${nota < 10 ? 'text-red-600' : 'text-slate-900'}`}>
                                                    {nota.toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                    )
                                })}
                                <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold ${aluno.aprovado
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}>
                                        {aluno.nota_final.toFixed(2)}
                                    </span>
                                </td>
                                {data.showMT && (
                                    <td className="px-4 py-3 text-center">
                                        {aluno.media_trimestral !== undefined && aluno.media_trimestral !== null ? (
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold ${aluno.media_trimestral >= 10
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}>
                                                {aluno.media_trimestral.toFixed(2)}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-sm">-</span>
                                        )}
                                    </td>
                                )}
                                <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${aluno.classificacao === 'Excelente' ? 'bg-purple-100 text-purple-800' :
                                        aluno.classificacao === 'Bom' ? 'bg-blue-100 text-blue-800' :
                                            aluno.classificacao === 'Suficiente' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                        }`}>
                                        {aluno.classificacao}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
