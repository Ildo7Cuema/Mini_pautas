/*
component-meta:
  name: PautaGeralFieldSelector
  description: Field selector for customizing Pauta-Geral output
  tokens: [--color-primary, --fs-sm]
  responsive: true
*/

import { useState } from 'react'
import { Card, CardHeader, CardBody } from './ui/Card'

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
    disciplinas: DisciplinaComComponentes[]
    [key: string]: any
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
    selection: FieldSelection
    onChange: (selection: FieldSelection) => void
}

export const PautaGeralFieldSelector: React.FC<Props> = ({ data, selection, onChange }) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})

    const toggleDisciplina = (disciplinaId: string) => {
        setExpanded(prev => ({
            ...prev,
            [disciplinaId]: !prev[disciplinaId]
        }))
    }

    const handleToggleAllDisciplinas = () => {
        if (selection.includeAllDisciplinas) {
            onChange({
                ...selection,
                includeAllDisciplinas: false,
                disciplinas: []
            })
        } else {
            onChange({
                ...selection,
                includeAllDisciplinas: true,
                disciplinas: data.disciplinas.map(d => d.id)
            })
        }
    }

    const handleToggleDisciplina = (disciplinaId: string) => {
        const isSelected = selection.disciplinas.includes(disciplinaId)

        if (isSelected) {
            const newDisciplinas = selection.disciplinas.filter(id => id !== disciplinaId)
            onChange({
                ...selection,
                disciplinas: newDisciplinas,
                includeAllDisciplinas: newDisciplinas.length === data.disciplinas.length
            })
        } else {
            const newDisciplinas = [...selection.disciplinas, disciplinaId]
            onChange({
                ...selection,
                disciplinas: newDisciplinas,
                includeAllDisciplinas: newDisciplinas.length === data.disciplinas.length
            })
        }
    }

    const handleToggleAllComponentes = () => {
        if (selection.includeAllComponentes) {
            onChange({
                ...selection,
                includeAllComponentes: false,
                componentes: []
            })
        } else {
            const allComponentes = data.disciplinas.flatMap(d => d.componentes.map(c => c.id))
            onChange({
                ...selection,
                includeAllComponentes: true,
                componentes: allComponentes
            })
        }
    }

    const handleToggleComponente = (componenteId: string) => {
        const allComponentes = data.disciplinas.flatMap(d => d.componentes.map(c => c.id))
        const isSelected = selection.componentes.includes(componenteId)

        if (isSelected) {
            const newComponentes = selection.componentes.filter(id => id !== componenteId)
            onChange({
                ...selection,
                componentes: newComponentes,
                includeAllComponentes: newComponentes.length === allComponentes.length
            })
        } else {
            const newComponentes = [...selection.componentes, componenteId]
            onChange({
                ...selection,
                componentes: newComponentes,
                includeAllComponentes: newComponentes.length === allComponentes.length
            })
        }
    }

    const isDisciplinaSelected = (disciplinaId: string) => {
        return selection.disciplinas.includes(disciplinaId)
    }

    const isComponenteSelected = (componenteId: string) => {
        return selection.componentes.includes(componenteId)
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <h3 className="text-base md:text-lg font-semibold text-slate-900">Seleção de Campos</h3>
                    <button
                        onClick={handleToggleAllDisciplinas}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        {selection.includeAllDisciplinas ? 'Desmarcar Todas' : 'Selecionar Todas'}
                    </button>
                </div>
            </CardHeader>
            <CardBody>
                <div className="space-y-4">
                    {/* Disciplinas and Components */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-slate-700">Disciplinas e Componentes</label>
                            <button
                                onClick={handleToggleAllComponentes}
                                className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                            >
                                {selection.includeAllComponentes ? 'Desmarcar Todos Componentes' : 'Selecionar Todos Componentes'}
                            </button>
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto border border-slate-200 rounded-lg p-3">
                            {data.disciplinas.map((disciplina) => (
                                <div key={disciplina.id} className="border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id={`disc-${disciplina.id}`}
                                            checked={isDisciplinaSelected(disciplina.id)}
                                            onChange={() => handleToggleDisciplina(disciplina.id)}
                                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <label
                                            htmlFor={`disc-${disciplina.id}`}
                                            className="flex-1 text-sm font-medium text-slate-900 cursor-pointer"
                                        >
                                            {disciplina.nome}
                                        </label>
                                        <button
                                            onClick={() => toggleDisciplina(disciplina.id)}
                                            className="text-slate-400 hover:text-slate-600 p-1"
                                        >
                                            <svg
                                                className={`w-4 h-4 transition-transform ${expanded[disciplina.id] ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>

                                    {expanded[disciplina.id] && (
                                        <div className="ml-6 mt-2 space-y-1">
                                            {disciplina.componentes
                                                .filter(c => c.is_calculated)
                                                .map((componente) => (
                                                    <div key={componente.id} className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            id={`comp-${componente.id}`}
                                                            checked={isComponenteSelected(componente.id)}
                                                            onChange={() => handleToggleComponente(componente.id)}
                                                            className="w-3.5 h-3.5 text-purple-600 border-slate-300 rounded focus:ring-2 focus:ring-purple-500"
                                                        />
                                                        <label
                                                            htmlFor={`comp-${componente.id}`}
                                                            className="text-xs text-slate-700 cursor-pointer"
                                                        >
                                                            {componente.codigo_componente} - {componente.nome}
                                                            {componente.is_calculated && (
                                                                <span className="ml-1 text-xs text-blue-600">(Calculado)</span>
                                                            )}
                                                        </label>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Other Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">Informações do Aluno</label>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="show-numero"
                                        checked={selection.showNumeroProcesso}
                                        onChange={(e) => onChange({ ...selection, showNumeroProcesso: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <label htmlFor="show-numero" className="text-sm text-slate-700 cursor-pointer">
                                        Mostrar Número de Processo
                                    </label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="show-nome"
                                        checked={selection.showNomeCompleto}
                                        onChange={(e) => onChange({ ...selection, showNomeCompleto: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <label htmlFor="show-nome" className="text-sm text-slate-700 cursor-pointer">
                                        Mostrar Nome Completo
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">Outras Opções</label>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="show-stats"
                                        checked={selection.showStatistics}
                                        onChange={(e) => onChange({ ...selection, showStatistics: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <label htmlFor="show-stats" className="text-sm text-slate-700 cursor-pointer">
                                        Mostrar Estatísticas
                                    </label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="show-media-geral"
                                        checked={selection.showMediaGeral}
                                        onChange={(e) => onChange({ ...selection, showMediaGeral: e.target.checked })}
                                        className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-2 focus:ring-amber-500"
                                    />
                                    <label htmlFor="show-media-geral" className="text-sm text-slate-700 cursor-pointer">
                                        Mostrar Média Geral
                                    </label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="show-observacao"
                                        checked={selection.showObservacao}
                                        onChange={(e) => onChange({ ...selection, showObservacao: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <label htmlFor="show-observacao" className="text-sm text-slate-700 cursor-pointer">
                                        Mostrar Observação (Transita/Não Transita)
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">
                                Componente para Média Geral
                            </label>
                            <select
                                value={selection.componenteParaMediaGeral}
                                onChange={(e) => onChange({ ...selection, componenteParaMediaGeral: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="MF">MF - Média Final</option>
                                <option value="MFD">MFD - Média Final da Disciplina</option>
                            </select>
                            <p className="text-xs text-slate-500 mt-1">
                                Selecione qual componente de cada disciplina será usado para calcular a Média Geral
                            </p>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800">
                            <strong>Selecionado:</strong> {selection.disciplinas.length} disciplina(s), {selection.componentes.length} componente(s)
                        </p>
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}
