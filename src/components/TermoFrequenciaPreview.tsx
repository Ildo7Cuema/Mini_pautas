/*
component-meta:
  name: TermoFrequenciaPreview
  description: Preview component for Termo de Frequência do Aluno
  tokens: [--color-primary, --fs-md, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import React from 'react'
import { Card, CardHeader, CardBody } from './ui/Card'

interface ComponenteNota {
    codigo: string
    nome: string
    nota: number | null
}

interface DisciplinaTermoFrequencia {
    id: string
    nome: string
    codigo_disciplina: string
    notas_trimestrais: {
        1: number | null
        2: number | null
        3: number | null
    }
    componentesPorTrimestre: {
        1: ComponenteNota[]
        2: ComponenteNota[]
        3: ComponenteNota[]
    }
    nota_final: number | null
    classificacao: string
    transita: boolean
}

interface TermoFrequenciaData {
    aluno: {
        numero_processo: string
        nome_completo: string
        data_nascimento?: string
        genero?: string
        nome_pai?: string
        nome_mae?: string
    }
    turma: {
        nome: string
        ano_lectivo: number
        codigo_turma: string
        nivel_ensino: string
    }
    disciplinas: DisciplinaTermoFrequencia[]
    estatisticas: {
        media_geral: number
        total_disciplinas: number
        disciplinas_aprovadas: number
        disciplinas_reprovadas: number
        transita: boolean
    }
    escola?: {
        nome: string
        provincia: string
        municipio: string
    }
}

interface TermoFrequenciaPreviewProps {
    data: TermoFrequenciaData
}

export const TermoFrequenciaPreview: React.FC<TermoFrequenciaPreviewProps> = ({ data }) => {
    return (
        <div className="space-y-6">
            {/* Student Information Card */}
            <Card>
                <CardHeader>
                    <h3 className="text-lg font-semibold text-slate-900">Informações do Aluno</h3>
                </CardHeader>
                <CardBody>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-slate-500">Nome Completo</p>
                            <p className="font-medium text-slate-900">{data.aluno.nome_completo}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Número de Processo</p>
                            <p className="font-medium text-slate-900">{data.aluno.numero_processo}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Turma</p>
                            <p className="font-medium text-slate-900">{data.turma.nome}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Ano Lectivo</p>
                            <p className="font-medium text-slate-900">{data.turma.ano_lectivo}</p>
                        </div>
                        {data.aluno.data_nascimento && (
                            <div>
                                <p className="text-sm text-slate-500">Data de Nascimento</p>
                                <p className="font-medium text-slate-900">{data.aluno.data_nascimento}</p>
                            </div>
                        )}
                        {data.aluno.genero && (
                            <div>
                                <p className="text-sm text-slate-500">Gênero</p>
                                <p className="font-medium text-slate-900">{data.aluno.genero}</p>
                            </div>
                        )}
                        {data.aluno.nome_pai && (
                            <div>
                                <p className="text-sm text-slate-500">Nome do Pai</p>
                                <p className="font-medium text-slate-900">{data.aluno.nome_pai}</p>
                            </div>
                        )}
                        {data.aluno.nome_mae && (
                            <div>
                                <p className="text-sm text-slate-500">Nome da Mãe</p>
                                <p className="font-medium text-slate-900">{data.aluno.nome_mae}</p>
                            </div>
                        )}
                    </div>
                </CardBody>
            </Card>

            {/* Academic Performance Card */}
            <Card>
                <CardHeader>
                    <h3 className="text-lg font-semibold text-slate-900">Desempenho Académico</h3>
                </CardHeader>
                <CardBody>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                {/* Check if we have components to show in any trimester */}
                                {data.disciplinas.length > 0 && data.disciplinas[0]?.componentesPorTrimestre && (
                                    data.disciplinas[0].componentesPorTrimestre[1].length > 0 ||
                                    data.disciplinas[0].componentesPorTrimestre[2].length > 0 ||
                                    data.disciplinas[0].componentesPorTrimestre[3].length > 0
                                ) ? (
                                    <>
                                        {/* First header row - Main columns with colSpan */}
                                        <tr className="bg-blue-600 text-white">
                                            <th rowSpan={2} className="border border-slate-300 px-3 py-2 text-center text-sm font-semibold">Nº</th>
                                            <th rowSpan={2} className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold">DISCIPLINAS</th>
                                            {data.disciplinas[0].componentesPorTrimestre[1].length > 0 && (
                                                <th colSpan={data.disciplinas[0].componentesPorTrimestre[1].length} className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold">1º TRIMESTRE</th>
                                            )}
                                            {data.disciplinas[0].componentesPorTrimestre[2].length > 0 && (
                                                <th colSpan={data.disciplinas[0].componentesPorTrimestre[2].length} className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold">2º TRIMESTRE</th>
                                            )}
                                            {data.disciplinas[0].componentesPorTrimestre[3].length > 0 && (
                                                <th colSpan={data.disciplinas[0].componentesPorTrimestre[3].length} className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold">3º TRIMESTRE</th>
                                            )}
                                            <th rowSpan={2} className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold">MÉDIA FINAL</th>
                                            <th rowSpan={2} className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold">OBSERVAÇÃO</th>
                                        </tr>

                                        {/* Second header row - Component columns for each trimester */}
                                        <tr className="bg-blue-700 text-white">
                                            {/* Components for 1st trimester */}
                                            {data.disciplinas[0].componentesPorTrimestre[1].map((comp: ComponenteNota, idx: number) => (
                                                <th key={`t1-${idx}`} className="border border-slate-300 px-2 py-1 text-center text-xs font-semibold">
                                                    {comp.codigo}
                                                </th>
                                            ))}
                                            {/* Components for 2nd trimester */}
                                            {data.disciplinas[0].componentesPorTrimestre[2].map((comp: ComponenteNota, idx: number) => (
                                                <th key={`t2-${idx}`} className="border border-slate-300 px-2 py-1 text-center text-xs font-semibold">
                                                    {comp.codigo}
                                                </th>
                                            ))}
                                            {/* Components for 3rd trimester */}
                                            {data.disciplinas[0].componentesPorTrimestre[3].map((comp: ComponenteNota, idx: number) => (
                                                <th key={`t3-${idx}`} className="border border-slate-300 px-2 py-1 text-center text-xs font-semibold">
                                                    {comp.codigo}
                                                </th>
                                            ))}
                                        </tr>
                                    </>
                                ) : (
                                    /* Fallback header when no components */
                                    <tr className="bg-blue-600 text-white">
                                        <th className="border border-slate-300 px-3 py-2 text-center text-sm font-semibold">Nº</th>
                                        <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold">DISCIPLINAS</th>
                                        <th className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold">1º TRIM</th>
                                        <th className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold">2º TRIM</th>
                                        <th className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold">3º TRIM</th>
                                        <th className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold">MÉDIA FINAL</th>
                                        <th className="border border-slate-300 px-4 py-2 text-center text-sm font-semibold">OBSERVAÇÃO</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {data.disciplinas.map((disciplina, index) => {
                                    const hasComponents = disciplina.componentesPorTrimestre && (
                                        disciplina.componentesPorTrimestre[1].length > 0 ||
                                        disciplina.componentesPorTrimestre[2].length > 0 ||
                                        disciplina.componentesPorTrimestre[3].length > 0
                                    )

                                    return (
                                        <tr key={disciplina.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            <td className="border border-slate-300 px-3 py-2 text-center text-sm">
                                                {index + 1}
                                            </td>
                                            <td className="border border-slate-300 px-4 py-2 font-medium text-sm">
                                                {disciplina.nome}
                                            </td>

                                            {/* Show components if they exist, otherwise show trimester totals */}
                                            {hasComponents ? (
                                                <>
                                                    {/* 1st Trimester components */}
                                                    {disciplina.componentesPorTrimestre[1].map((comp: ComponenteNota, idx: number) => (
                                                        <td key={`${disciplina.id}-t1-${idx}`} className="border border-slate-300 px-2 py-2 text-center text-sm">
                                                            {comp.nota !== null ? comp.nota.toFixed(1) : '-'}
                                                        </td>
                                                    ))}
                                                    {/* 2nd Trimester components */}
                                                    {disciplina.componentesPorTrimestre[2].map((comp: ComponenteNota, idx: number) => (
                                                        <td key={`${disciplina.id}-t2-${idx}`} className="border border-slate-300 px-2 py-2 text-center text-sm">
                                                            {comp.nota !== null ? comp.nota.toFixed(1) : '-'}
                                                        </td>
                                                    ))}
                                                    {/* 3rd Trimester components */}
                                                    {disciplina.componentesPorTrimestre[3].map((comp: ComponenteNota, idx: number) => (
                                                        <td key={`${disciplina.id}-t3-${idx}`} className="border border-slate-300 px-2 py-2 text-center text-sm">
                                                            {comp.nota !== null ? comp.nota.toFixed(1) : '-'}
                                                        </td>
                                                    ))}
                                                </>
                                            ) : (
                                                <>
                                                    <td className="border border-slate-300 px-4 py-2 text-center font-semibold text-sm">
                                                        {disciplina.notas_trimestrais[1] !== null ? disciplina.notas_trimestrais[1].toFixed(1) : '-'}
                                                    </td>
                                                    <td className="border border-slate-300 px-4 py-2 text-center font-semibold text-sm">
                                                        {disciplina.notas_trimestrais[2] !== null ? disciplina.notas_trimestrais[2].toFixed(1) : '-'}
                                                    </td>
                                                    <td className="border border-slate-300 px-4 py-2 text-center font-semibold text-sm">
                                                        {disciplina.notas_trimestrais[3] !== null ? disciplina.notas_trimestrais[3].toFixed(1) : '-'}
                                                    </td>
                                                </>
                                            )}

                                            <td className="border border-slate-300 px-4 py-2 text-center font-bold text-sm">
                                                {disciplina.nota_final !== null ? disciplina.nota_final.toFixed(1) : '-'}
                                            </td>
                                            <td className={`border border-slate-300 px-4 py-2 text-center font-bold text-sm ${disciplina.transita ? 'text-green-600' : 'text-red-600'}`}>
                                                {disciplina.transita ? 'Transita' : 'Não Transita'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardBody>
            </Card>

            {/* Overall Statistics Card */}
            <Card>
                <CardHeader>
                    <h3 className="text-lg font-semibold text-slate-900">Estatísticas Gerais</h3>
                </CardHeader>
                <CardBody>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-slate-900">{data.estatisticas.total_disciplinas}</p>
                            <p className="text-sm text-slate-500">Total de Disciplinas</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{data.estatisticas.disciplinas_aprovadas}</p>
                            <p className="text-sm text-slate-500">Aprovadas</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-red-600">{data.estatisticas.disciplinas_reprovadas}</p>
                            <p className="text-sm text-slate-500">Reprovadas</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">{data.estatisticas.media_geral.toFixed(2)}</p>
                            <p className="text-sm text-slate-500">Média Geral</p>
                        </div>
                    </div>

                    {/* Final Observation */}
                    <div className={`p-4 rounded-lg text-center ${data.estatisticas.transita
                        ? 'bg-green-50 border-2 border-green-500'
                        : 'bg-red-50 border-2 border-red-500'
                        }`}>
                        <p className={`text-xl font-bold ${data.estatisticas.transita ? 'text-green-700' : 'text-red-700'
                            }`}>
                            OBSERVAÇÃO FINAL: {data.estatisticas.transita ? 'TRANSITA' : 'NÃO TRANSITA'}
                        </p>
                    </div>
                </CardBody>
            </Card>
        </div>
    )
}
