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
    onReorder?: (newDisciplinas: DisciplinaComComponentes[]) => void
}

export const PautaGeralFieldSelector: React.FC<Props> = ({ data, selection, onChange, onReorder }) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
    const [showAdvanced, setShowAdvanced] = useState(false)

    const toggleDisciplina = (disciplinaId: string) => {
        setExpanded(prev => ({
            ...prev,
            [disciplinaId]: !prev[disciplinaId]
        }))
    }

    const handleMoveUp = (index: number, e: React.MouseEvent) => {
        e.stopPropagation()
        if (index > 0 && onReorder) {
            const newDisciplinas = [...data.disciplinas]
            const temp = newDisciplinas[index]
            newDisciplinas[index] = newDisciplinas[index - 1]
            newDisciplinas[index - 1] = temp
            onReorder(newDisciplinas)
        }
    }

    const handleMoveDown = (index: number, e: React.MouseEvent) => {
        e.stopPropagation()
        if (index < data.disciplinas.length - 1 && onReorder) {
            const newDisciplinas = [...data.disciplinas]
            const temp = newDisciplinas[index]
            newDisciplinas[index] = newDisciplinas[index + 1]
            newDisciplinas[index + 1] = temp
            onReorder(newDisciplinas)
        }
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

    // Custom Toggle Switch Component
    const ToggleSwitch = ({ checked, onChange, label, description }: { checked: boolean; onChange: (checked: boolean) => void; label: string; description?: string }) => (
        <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    <div
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                </div>
            </div>
            <div className="flex-1">
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{label}</span>
                {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
            </div>
        </label>
    )

    return (
        <Card className="overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-base md:text-lg font-semibold text-slate-800">Personalizar Campos</h3>
                            <p className="text-xs text-slate-500 hidden sm:block">Selecione quais informações exibir na pauta</p>
                        </div>
                    </div>
                    <button
                        onClick={handleToggleAllDisciplinas}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selection.includeAllDisciplinas
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        {selection.includeAllDisciplinas ? '✓ Todas Selecionadas' : 'Selecionar Todas'}
                    </button>
                </div>
            </CardHeader>
            <CardBody className="p-4 md:p-5">
                <div className="space-y-5">
                    {/* Disciplinas Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                <span className="text-sm font-semibold text-slate-700">Disciplinas</span>
                                <span className="text-xs text-slate-500">({selection.disciplinas.length}/{data.disciplinas.length})</span>
                            </div>
                            <button
                                onClick={handleToggleAllComponentes}
                                className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                {selection.includeAllComponentes ? 'Desmarcar Componentes' : 'Todos Componentes'}
                            </button>
                        </div>

                        <div className="space-y-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                            {data.disciplinas.map((disciplina, index) => (
                                <div
                                    key={disciplina.id}
                                    className={`rounded-xl border transition-all overflow-hidden ${isDisciplinaSelected(disciplina.id)
                                        ? 'border-blue-200 bg-white shadow-sm'
                                        : 'border-transparent bg-white/60 hover:bg-white hover:border-slate-200'
                                        }`}
                                    style={{ animationDelay: `${index * 30}ms` }}
                                >
                                    <div className="flex items-center gap-3 p-3">
                                        {/* Custom Checkbox */}
                                        <label className="relative flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isDisciplinaSelected(disciplina.id)}
                                                onChange={() => handleToggleDisciplina(disciplina.id)}
                                                className="sr-only"
                                            />
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isDisciplinaSelected(disciplina.id)
                                                ? 'bg-blue-600 border-blue-600'
                                                : 'border-slate-300 bg-white hover:border-blue-400'
                                                }`}>
                                                {isDisciplinaSelected(disciplina.id) && (
                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </label>

                                        <span className={`flex-1 text-sm font-medium ${isDisciplinaSelected(disciplina.id) ? 'text-slate-900' : 'text-slate-600'
                                            }`}>
                                            {disciplina.nome}
                                        </span>

                                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                            {disciplina.componentes.filter(c => c.is_calculated).length} comp.
                                        </span>

                                        {/* Reorder Buttons */}
                                        <div className="flex flex-col gap-0.5">
                                            <button
                                                onClick={(e) => handleMoveUp(index, e)}
                                                disabled={index === 0}
                                                className={`p-0.5 rounded hover:bg-slate-100 ${index === 0 ? 'text-slate-300' : 'text-slate-500 hover:text-slate-800'}`}
                                                title="Mover para cima"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={(e) => handleMoveDown(index, e)}
                                                disabled={index === data.disciplinas.length - 1}
                                                className={`p-0.5 rounded hover:bg-slate-100 ${index === data.disciplinas.length - 1 ? 'text-slate-300' : 'text-slate-500 hover:text-slate-800'}`}
                                                title="Mover para baixo"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => toggleDisciplina(disciplina.id)}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                        >
                                            <svg
                                                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded[disciplina.id] ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Expanded Components */}
                                    {expanded[disciplina.id] && (
                                        <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-slate-50/50">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8">
                                                {disciplina.componentes
                                                    .filter(c => c.is_calculated)
                                                    .map((componente) => (
                                                        <label
                                                            key={componente.id}
                                                            className="flex items-center gap-2 group cursor-pointer"
                                                        >
                                                            <div className="relative">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isComponenteSelected(componente.id)}
                                                                    onChange={() => handleToggleComponente(componente.id)}
                                                                    className="sr-only"
                                                                />
                                                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isComponenteSelected(componente.id)
                                                                    ? 'bg-purple-600 border-purple-600'
                                                                    : 'border-slate-300 bg-white group-hover:border-purple-400'
                                                                    }`}>
                                                                    {isComponenteSelected(componente.id) && (
                                                                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span className="text-xs text-slate-600 group-hover:text-slate-900">
                                                                <span className="font-medium">{componente.codigo_componente}</span>
                                                                <span className="text-slate-400"> - {componente.nome}</span>
                                                            </span>
                                                            {componente.is_calculated && (
                                                                <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                                                                    Calc.
                                                                </span>
                                                            )}
                                                        </label>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Advanced Options Toggle */}
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        {showAdvanced ? 'Ocultar opções avançadas' : 'Mostrar opções avançadas'}
                    </button>

                    {/* Advanced Options */}
                    {showAdvanced && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 animate-slide-up">
                            {/* Student Info Options */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="text-sm font-semibold text-slate-700">Informações do Aluno</span>
                                </div>
                                <div className="space-y-3 pl-6">
                                    <ToggleSwitch
                                        checked={selection.showNumeroProcesso}
                                        onChange={(checked) => onChange({ ...selection, showNumeroProcesso: checked })}
                                        label="Número de Processo"
                                    />
                                    <ToggleSwitch
                                        checked={selection.showNomeCompleto}
                                        onChange={(checked) => onChange({ ...selection, showNomeCompleto: checked })}
                                        label="Nome Completo"
                                    />
                                </div>
                            </div>

                            {/* Display Options */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <span className="text-sm font-semibold text-slate-700">Opções de Visualização</span>
                                </div>
                                <div className="space-y-3 pl-6">
                                    <ToggleSwitch
                                        checked={selection.showStatistics}
                                        onChange={(checked) => onChange({ ...selection, showStatistics: checked })}
                                        label="Mostrar Estatísticas"
                                        description="Exibe resumo estatístico no fim"
                                    />
                                    <ToggleSwitch
                                        checked={selection.showMediaGeral}
                                        onChange={(checked) => onChange({ ...selection, showMediaGeral: checked })}
                                        label="Mostrar Média Geral"
                                        description="Coluna com média geral do aluno"
                                    />
                                    <ToggleSwitch
                                        checked={selection.showObservacao}
                                        onChange={(checked) => onChange({ ...selection, showObservacao: checked })}
                                        label="Mostrar Observação"
                                        description="Status: Transita / Não Transita"
                                    />
                                </div>
                            </div>

                            {/* Component for Average */}
                            <div className="md:col-span-2">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-sm font-semibold text-slate-700">Componente para Média Geral</span>
                                </div>
                                <div className="relative pl-6">
                                    <select
                                        value={selection.componenteParaMediaGeral}
                                        onChange={(e) => onChange({ ...selection, componenteParaMediaGeral: e.target.value })}
                                        className="w-full md:w-64 px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm appearance-none cursor-pointer"
                                    >
                                        <option value="MF">MF - Média Final</option>
                                        <option value="MFD">MFD - Média Final da Disciplina</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 md:right-auto md:left-[17rem] flex items-center pr-3 pointer-events-none">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-2 pl-6">
                                    Selecione qual componente de cada disciplina será usado para calcular a Média Geral do aluno
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Summary Badge */}
                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-200">
                        <span className="text-xs text-slate-500">Selecionado:</span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            {selection.disciplinas.length} disciplina(s)
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            {selection.componentes.length} componente(s)
                        </span>
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}
