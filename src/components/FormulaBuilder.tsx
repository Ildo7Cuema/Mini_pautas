import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ComponenteAvaliacao, Formula } from '../types'
import { validateFormula, getExampleFormulas } from '../utils/formulaParser'

interface FormulaBuilderProps {
    turmaId: string
    disciplinaId: string
    onSave?: () => void
}

export const FormulaBuilder: React.FC<FormulaBuilderProps> = ({
    turmaId,
    disciplinaId,
    onSave,
}) => {
    const [componentes, setComponentes] = useState<ComponenteAvaliacao[]>([])
    const [expressao, setExpressao] = useState('')
    const [validacao, setValidacao] = useState<{ valida: boolean; mensagem: string } | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadComponentes()
        loadExistingFormula()
    }, [disciplinaId])

    const loadComponentes = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('componentes_avaliacao')
                .select('*')
                .eq('disciplina_id', disciplinaId)
                .order('ordem')

            if (error) throw error
            setComponentes(data || [])
        } catch (error) {
            console.error('Error loading components:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadExistingFormula = async () => {
        try {
            const { data, error } = await supabase
                .from('formulas')
                .select('*')
                .eq('turma_id', turmaId)
                .eq('disciplina_id', disciplinaId)
                .single()

            if (data) {
                setExpressao(data.expressao)
                handleValidate(data.expressao)
            }
        } catch (error) {
            // No existing formula, that's ok
        }
    }

    const handleValidate = (expr?: string) => {
        const formulaToValidate = expr || expressao
        if (!formulaToValidate.trim()) {
            setValidacao(null)
            return
        }

        const componentValues = componentes.map(c => ({
            codigo: c.codigo_componente,
            valor: 10, // Test value
            peso: c.peso_percentual,
        }))

        const result = validateFormula(formulaToValidate, componentValues)
        setValidacao({
            valida: result.valida,
            mensagem: result.mensagem,
        })
    }

    const handleSave = async () => {
        if (!validacao?.valida) {
            alert('Por favor, corrija os erros na fórmula antes de salvar.')
            return
        }

        setSaving(true)
        try {
            const componentValues = componentes.map(c => ({
                codigo: c.codigo_componente,
                valor: 10,
                peso: c.peso_percentual,
            }))

            const validation = validateFormula(expressao, componentValues)

            const { error } = await supabase
                .from('formulas')
                .upsert({
                    turma_id: turmaId,
                    disciplina_id: disciplinaId,
                    expressao,
                    componentes_usados: validation.componentes_usados,
                    validada: validation.valida,
                    mensagem_validacao: validation.mensagem,
                })

            if (error) throw error

            alert('Fórmula salva com sucesso!')
            onSave?.()
        } catch (error) {
            console.error('Error saving formula:', error)
            alert('Erro ao salvar fórmula')
        } finally {
            setSaving(false)
        }
    }

    const insertComponent = (codigo: string) => {
        setExpressao(prev => prev + codigo)
        setTimeout(() => handleValidate(expressao + codigo), 100)
    }

    const insertOperator = (op: string) => {
        setExpressao(prev => prev + op)
    }

    const exampleFormulas = getExampleFormulas()

    if (loading) {
        return <div className="p-4">Carregando componentes...</div>
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Construtor de Fórmulas</h2>

            {/* Component List */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Componentes Disponíveis</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {componentes.map((comp) => (
                        <button
                            key={comp.id}
                            onClick={() => insertComponent(comp.codigo_componente)}
                            className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-left transition"
                        >
                            <div className="font-semibold text-blue-900">{comp.codigo_componente}</div>
                            <div className="text-sm text-blue-600">{comp.nome}</div>
                            <div className="text-xs text-blue-500 mt-1">{comp.peso_percentual}%</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Operators */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Operadores</h3>
                <div className="flex gap-2 flex-wrap">
                    {['+', '-', '*', '/', '(', ')'].map((op) => (
                        <button
                            key={op}
                            onClick={() => insertOperator(op)}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg font-mono font-bold transition"
                        >
                            {op}
                        </button>
                    ))}
                    <button
                        onClick={() => insertOperator('0.')}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg font-mono transition"
                    >
                        0.
                    </button>
                </div>
            </div>

            {/* Formula Input */}
            <div className="mb-6">
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                    Fórmula
                </label>
                <textarea
                    value={expressao}
                    onChange={(e) => {
                        setExpressao(e.target.value)
                        handleValidate(e.target.value)
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Ex: 0.3*p1 + 0.3*p2 + 0.4*trabalho"
                />
            </div>

            {/* Validation Result */}
            {validacao && (
                <div
                    className={`mb-6 p-4 rounded-lg border ${validacao.valida
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                >
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            {validacao.valida ? (
                                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                        <div className="ml-3">
                            <p className={`text-sm font-medium ${validacao.valida ? 'text-green-800' : 'text-red-800'}`}>
                                {validacao.mensagem}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Example Formulas */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Exemplos</h3>
                <div className="space-y-2">
                    {Object.entries(exampleFormulas).map(([name, formula]) => (
                        <button
                            key={name}
                            onClick={() => {
                                setExpressao(formula)
                                handleValidate(formula)
                            }}
                            className="w-full p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-left transition"
                        >
                            <div className="font-medium text-gray-800">{name}</div>
                            <div className="text-sm text-gray-600 font-mono mt-1">{formula}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <button
                    onClick={handleSave}
                    disabled={!validacao?.valida || saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? 'Salvando...' : 'Salvar Fórmula'}
                </button>
                <button
                    onClick={() => {
                        setExpressao('')
                        setValidacao(null)
                    }}
                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition"
                >
                    Limpar
                </button>
            </div>
        </div>
    )
}
