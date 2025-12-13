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
import { GradeColorConfig, getGradeColorFromConfig } from '../utils/gradeColorConfigUtils'

interface ComponenteNota {
    codigo: string
    nome: string
    nota: number | null
    is_calculated?: boolean
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
        nacionalidade?: string
        naturalidade?: string
        tipo_documento?: string
        numero_documento?: string
        nome_pai?: string
        nome_mae?: string
        nome_encarregado?: string
        parentesco_encarregado?: string
        telefone_encarregado?: string
        email_encarregado?: string
        profissao_encarregado?: string
        provincia?: string
        municipio?: string
        bairro?: string
        rua?: string
        endereco?: string
        ano_ingresso?: number
        escola_anterior?: string
        classe_anterior?: string
        observacoes_academicas?: string
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
    colorConfig?: GradeColorConfig | null
    componentAlignment?: 'left' | 'center' | 'right'
}


export const TermoFrequenciaPreview: React.FC<TermoFrequenciaPreviewProps> = ({ data, colorConfig, componentAlignment = 'center' }) => {
    // Extract classe from turma name (e.g., "4ª Classe A" -> "4ª Classe")
    const extractClasse = (turmaName: string): string | undefined => {
        const match = turmaName.match(/(\d+[ªº]\s*Classe)/i)
        return match ? match[1] : undefined
    }

    const classe = extractClasse(data.turma.nome)

    // Helper function to get grade color
    const getGradeColor = (nota: number, isCalculated: boolean = false): string => {
        const result = getGradeColorFromConfig(
            nota,
            data.turma.nivel_ensino,
            classe,
            isCalculated,
            colorConfig || null
        )
        return result.color
    }

    // Get alignment class based on prop
    const getAlignmentClass = () => {
        switch (componentAlignment) {
            case 'left': return 'text-left'
            case 'right': return 'text-right'
            default: return 'text-center'
        }
    }
    return (
        <div className="space-y-6">
            {/* Student Information Card */}
            <Card>
                <CardHeader>
                    <h3 className="text-lg font-semibold text-slate-900">Informações do Aluno</h3>
                </CardHeader>
                <CardBody>
                    {/* Dados Básicos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
                                <p className="text-sm text-slate-500">Género</p>
                                <p className="font-medium text-slate-900">{data.aluno.genero === 'M' ? 'Masculino' : 'Feminino'}</p>
                            </div>
                        )}
                        {data.aluno.nacionalidade && (
                            <div>
                                <p className="text-sm text-slate-500">Nacionalidade</p>
                                <p className="font-medium text-slate-900">{data.aluno.nacionalidade}</p>
                            </div>
                        )}
                        {data.aluno.naturalidade && (
                            <div>
                                <p className="text-sm text-slate-500">Naturalidade</p>
                                <p className="font-medium text-slate-900">{data.aluno.naturalidade}</p>
                            </div>
                        )}
                        {data.aluno.tipo_documento && data.aluno.numero_documento && (
                            <div>
                                <p className="text-sm text-slate-500">{data.aluno.tipo_documento}</p>
                                <p className="font-medium text-slate-900">{data.aluno.numero_documento}</p>
                            </div>
                        )}
                    </div>

                    {/* Filiação */}
                    {(data.aluno.nome_pai || data.aluno.nome_mae) && (
                        <div className="border-t border-slate-200 pt-4 mb-4">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Filiação</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        </div>
                    )}

                    {/* Encarregado */}
                    {data.aluno.nome_encarregado && (
                        <div className="border-t border-slate-200 pt-4 mb-4">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Encarregado de Educação</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm text-slate-500">Nome</p>
                                    <p className="font-medium text-slate-900">{data.aluno.nome_encarregado}</p>
                                </div>
                                {data.aluno.parentesco_encarregado && (
                                    <div>
                                        <p className="text-sm text-slate-500">Parentesco</p>
                                        <p className="font-medium text-slate-900">{data.aluno.parentesco_encarregado}</p>
                                    </div>
                                )}
                                {data.aluno.telefone_encarregado && (
                                    <div>
                                        <p className="text-sm text-slate-500">Telefone</p>
                                        <p className="font-medium text-slate-900">{data.aluno.telefone_encarregado}</p>
                                    </div>
                                )}
                                {data.aluno.profissao_encarregado && (
                                    <div>
                                        <p className="text-sm text-slate-500">Profissão</p>
                                        <p className="font-medium text-slate-900">{data.aluno.profissao_encarregado}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Endereço */}
                    {(data.aluno.provincia || data.aluno.municipio || data.aluno.bairro) && (
                        <div className="border-t border-slate-200 pt-4">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Endereço</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {data.aluno.provincia && (
                                    <div>
                                        <p className="text-sm text-slate-500">Província</p>
                                        <p className="font-medium text-slate-900">{data.aluno.provincia}</p>
                                    </div>
                                )}
                                {data.aluno.municipio && (
                                    <div>
                                        <p className="text-sm text-slate-500">Município</p>
                                        <p className="font-medium text-slate-900">{data.aluno.municipio}</p>
                                    </div>
                                )}
                                {data.aluno.bairro && (
                                    <div>
                                        <p className="text-sm text-slate-500">Bairro</p>
                                        <p className="font-medium text-slate-900">{data.aluno.bairro}</p>
                                    </div>
                                )}
                                {data.aluno.rua && (
                                    <div>
                                        <p className="text-sm text-slate-500">Rua</p>
                                        <p className="font-medium text-slate-900">{data.aluno.rua}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Academic Performance Card */}
            <Card>
                <CardHeader>
                    <h3 className="text-lg font-semibold text-slate-900">Desempenho Académico</h3>
                </CardHeader>
                <CardBody>
                    <div className="overflow-x-auto">
                        {(() => {
                            // Calculate unified header structure based on ALL disciplines
                            // Find max components per trimester across all disciplines
                            const maxComponentsPerTrimester: { 1: ComponenteNota[]; 2: ComponenteNota[]; 3: ComponenteNota[] } = {
                                1: [],
                                2: [],
                                3: []
                            }

                            // Collect unique component codes for each trimester
                            const componentCodesByTrimester: { 1: Map<string, ComponenteNota>; 2: Map<string, ComponenteNota>; 3: Map<string, ComponenteNota> } = {
                                1: new Map(),
                                2: new Map(),
                                3: new Map()
                            }

                            data.disciplinas.forEach(disciplina => {
                                if (disciplina.componentesPorTrimestre) {
                                    ([1, 2, 3] as const).forEach(t => {
                                        disciplina.componentesPorTrimestre[t].forEach(comp => {
                                            if (!componentCodesByTrimester[t].has(comp.codigo)) {
                                                componentCodesByTrimester[t].set(comp.codigo, comp)
                                            }
                                        })
                                    })
                                }
                            })

                            // Convert maps to arrays preserving order
                            maxComponentsPerTrimester[1] = Array.from(componentCodesByTrimester[1].values())
                            maxComponentsPerTrimester[2] = Array.from(componentCodesByTrimester[2].values())
                            maxComponentsPerTrimester[3] = Array.from(componentCodesByTrimester[3].values())

                            const hasAnyComponents =
                                maxComponentsPerTrimester[1].length > 0 ||
                                maxComponentsPerTrimester[2].length > 0 ||
                                maxComponentsPerTrimester[3].length > 0

                            return (
                                <table className="w-full border-collapse">
                                    <thead>
                                        {/* Check if we have components to show in any trimester */}
                                        {data.disciplinas.length > 0 && hasAnyComponents ? (
                                            <>
                                                {/* First header row - Main columns with colSpan */}
                                                <tr className="bg-blue-600 text-white">
                                                    <th rowSpan={2} className="border border-slate-300 px-2 py-0.5 text-center text-sm font-semibold">Nº</th>
                                                    <th rowSpan={2} className="border border-slate-300 px-3 py-0.5 text-left text-sm font-semibold">DISCIPLINAS</th>
                                                    {maxComponentsPerTrimester[1].length > 0 && (
                                                        <th colSpan={maxComponentsPerTrimester[1].length} className="border border-slate-300 px-2 py-0.5 text-center text-sm font-semibold">1º TRIMESTRE</th>
                                                    )}
                                                    {maxComponentsPerTrimester[2].length > 0 && (
                                                        <th colSpan={maxComponentsPerTrimester[2].length} className="border border-slate-300 px-2 py-0.5 text-center text-sm font-semibold">2º TRIMESTRE</th>
                                                    )}
                                                    {maxComponentsPerTrimester[3].length > 0 && (
                                                        <th colSpan={maxComponentsPerTrimester[3].length} className="border border-slate-300 px-2 py-0.5 text-center text-sm font-semibold">3º TRIMESTRE</th>
                                                    )}
                                                    <th rowSpan={2} className="border border-slate-300 px-2 py-0.5 text-center text-sm font-semibold">MÉDIA FINAL</th>
                                                    <th rowSpan={2} className="border border-slate-300 px-2 py-0.5 text-center text-sm font-semibold">OBSERVAÇÃO</th>
                                                </tr>

                                                {/* Second header row - Component columns for each trimester */}
                                                <tr className="bg-blue-700 text-white">
                                                    {/* Components for 1st trimester */}
                                                    {maxComponentsPerTrimester[1].map((comp: ComponenteNota, idx: number) => (
                                                        <th key={`t1-${idx}`} className="border border-slate-300 px-2 py-0.5 text-center text-xs font-semibold">
                                                            {comp.codigo}
                                                        </th>
                                                    ))}
                                                    {/* Components for 2nd trimester */}
                                                    {maxComponentsPerTrimester[2].map((comp: ComponenteNota, idx: number) => (
                                                        <th key={`t2-${idx}`} className="border border-slate-300 px-2 py-0.5 text-center text-xs font-semibold">
                                                            {comp.codigo}
                                                        </th>
                                                    ))}
                                                    {/* Components for 3rd trimester */}
                                                    {maxComponentsPerTrimester[3].map((comp: ComponenteNota, idx: number) => (
                                                        <th key={`t3-${idx}`} className="border border-slate-300 px-2 py-0.5 text-center text-xs font-semibold">
                                                            {comp.codigo}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </>
                                        ) : (
                                            /* Fallback header when no components */
                                            <tr className="bg-blue-600 text-white">
                                                <th className="border border-slate-300 px-2 py-0.5 text-center text-sm font-semibold">Nº</th>
                                                <th className="border border-slate-300 px-3 py-0.5 text-left text-sm font-semibold">DISCIPLINAS</th>
                                                <th className="border border-slate-300 px-2 py-0.5 text-center text-sm font-semibold">1º TRIM</th>
                                                <th className="border border-slate-300 px-2 py-0.5 text-center text-sm font-semibold">2º TRIM</th>
                                                <th className="border border-slate-300 px-2 py-0.5 text-center text-sm font-semibold">3º TRIM</th>
                                                <th className="border border-slate-300 px-2 py-0.5 text-center text-sm font-semibold">MÉDIA FINAL</th>
                                                <th className="border border-slate-300 px-2 py-0.5 text-center text-sm font-semibold">OBSERVAÇÃO</th>
                                            </tr>
                                        )}
                                    </thead>
                                    <tbody>
                                        {data.disciplinas.map((disciplina, index) => {
                                            // For each discipline, map components to the unified header structure
                                            const getNotaForComponent = (trimestre: 1 | 2 | 3, codigo: string): number | null => {
                                                if (!disciplina.componentesPorTrimestre) return null
                                                const comp = disciplina.componentesPorTrimestre[trimestre].find(c => c.codigo === codigo)
                                                return comp?.nota ?? null
                                            }

                                            return (
                                                <tr key={disciplina.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                    <td className="border border-slate-300 px-2 py-0.5 text-center text-sm">
                                                        {index + 1}
                                                    </td>
                                                    <td className="border border-slate-300 px-3 py-0.5 font-medium text-sm">
                                                        {disciplina.nome}
                                                    </td>

                                                    {/* Show components matching header structure, or trimester totals if no components */}
                                                    {hasAnyComponents ? (
                                                        <>
                                                            {/* 1st Trimester components - match header structure */}
                                                            {maxComponentsPerTrimester[1].map((headerComp: ComponenteNota, idx: number) => {
                                                                const nota = getNotaForComponent(1, headerComp.codigo)
                                                                const isCalculated = headerComp.is_calculated || false
                                                                const color = nota !== null ? getGradeColor(nota, isCalculated) : '#000000'
                                                                return (
                                                                    <td key={`${disciplina.id}-t1-${idx}`} className={`border border-slate-300 px-2 py-0.5 ${getAlignmentClass()} text-sm`} style={{ color }}>
                                                                        {nota !== null ? nota.toFixed(1) : '-'}
                                                                    </td>
                                                                )
                                                            })}
                                                            {/* 2nd Trimestre components - match header structure */}
                                                            {maxComponentsPerTrimester[2].map((headerComp: ComponenteNota, idx: number) => {
                                                                const nota = getNotaForComponent(2, headerComp.codigo)
                                                                const isCalculated = headerComp.is_calculated || false
                                                                return (
                                                                    <td key={`${disciplina.id}-t2-${idx}`} className={`border border-slate-300 px-2 py-0.5 ${getAlignmentClass()} text-sm`} style={{ color: nota !== null ? getGradeColor(nota, isCalculated) : '#000000' }}>
                                                                        {nota !== null ? nota.toFixed(1) : '-'}
                                                                    </td>
                                                                )
                                                            })}
                                                            {/* 3rd Trimestre components - match header structure */}
                                                            {maxComponentsPerTrimester[3].map((headerComp: ComponenteNota, idx: number) => {
                                                                const nota = getNotaForComponent(3, headerComp.codigo)
                                                                const isCalculated = headerComp.is_calculated || false
                                                                return (
                                                                    <td key={`${disciplina.id}-t3-${idx}`} className={`border border-slate-300 px-2 py-0.5 ${getAlignmentClass()} text-sm`} style={{ color: nota !== null ? getGradeColor(nota, isCalculated) : '#000000' }}>
                                                                        {nota !== null ? nota.toFixed(1) : '-'}
                                                                    </td>
                                                                )
                                                            })}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="border border-slate-300 px-2 py-0.5 text-center font-semibold text-sm" style={{ color: disciplina.notas_trimestrais[1] !== null ? getGradeColor(disciplina.notas_trimestrais[1], false) : '#000000' }}>
                                                                {disciplina.notas_trimestrais[1] !== null ? disciplina.notas_trimestrais[1].toFixed(1) : '-'}
                                                            </td>
                                                            <td className="border border-slate-300 px-2 py-0.5 text-center font-semibold text-sm" style={{ color: disciplina.notas_trimestrais[2] !== null ? getGradeColor(disciplina.notas_trimestrais[2], false) : '#000000' }}>
                                                                {disciplina.notas_trimestrais[2] !== null ? disciplina.notas_trimestrais[2].toFixed(1) : '-'}
                                                            </td>
                                                            <td className="border border-slate-300 px-2 py-0.5 text-center font-semibold text-sm" style={{ color: disciplina.notas_trimestrais[3] !== null ? getGradeColor(disciplina.notas_trimestrais[3], false) : '#000000' }}>
                                                                {disciplina.notas_trimestrais[3] !== null ? disciplina.notas_trimestrais[3].toFixed(1) : '-'}
                                                            </td>
                                                        </>
                                                    )}

                                                    <td className="border border-slate-300 px-2 py-0.5 text-center font-bold text-sm" style={{ color: disciplina.nota_final !== null ? getGradeColor(disciplina.nota_final, true) : '#000000' }}>
                                                        {disciplina.nota_final !== null ? disciplina.nota_final.toFixed(1) : '-'}
                                                    </td>
                                                    <td className={`border border-slate-300 px-2 py-0.5 text-center font-bold text-sm ${disciplina.transita ? 'text-green-600' : 'text-red-600'}`}>
                                                        {disciplina.transita ? 'Transita' : 'Não Transita'}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            )
                        })()}
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
