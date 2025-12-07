import React, { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { FormulaConfig, MTCalculationType, getDefaultMTConfig, saveFormulaConfig, validateMTFormula } from '../utils/formulaConfigUtils'

interface ConfiguracaoFormulasModalProps {
    isOpen: boolean
    onClose: () => void
    disciplinaId: string
    turmaId: string
    currentConfig: FormulaConfig | null
    onSave: () => void
}

export const ConfiguracaoFormulasModal: React.FC<ConfiguracaoFormulasModalProps> = ({
    isOpen,
    onClose,
    disciplinaId,
    turmaId,
    currentConfig,
    onSave
}) => {
    const [tipo, setTipo] = useState<MTCalculationType>('simples')
    const [customFormula, setCustomFormula] = useState('')
    const [peso1, setPeso1] = useState(33.33)
    const [peso2, setPeso2] = useState(33.33)
    const [peso3, setPeso3] = useState(33.34)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (currentConfig) {
            // Load existing config
            const formula = currentConfig.formula_expression.toLowerCase()
            if (formula.includes('(t1 + t2 + t3) / 3')) {
                setTipo('simples')
            } else if (currentConfig.pesos_trimestres) {
                setTipo('ponderada')
                setPeso1(currentConfig.pesos_trimestres[1] || 33.33)
                setPeso2(currentConfig.pesos_trimestres[2] || 33.33)
                setPeso3(currentConfig.pesos_trimestres[3] || 33.34)
            } else {
                setTipo('custom')
                setCustomFormula(currentConfig.formula_expression)
            }
        }
    }, [currentConfig])

    const handleSave = async () => {
        try {
            setSaving(true)
            setError(null)

            let config: Partial<FormulaConfig>

            if (tipo === 'simples') {
                config = getDefaultMTConfig('simples')
            } else if (tipo === 'ponderada') {
                // Validate weights sum to 100
                const total = peso1 + peso2 + peso3
                if (Math.abs(total - 100) > 0.1) {
                    setError('Os pesos devem somar 100%')
                    return
                }
                config = {
                    tipo: 'MT',
                    formula_expression: `T1 * ${peso1 / 100} + T2 * ${peso2 / 100} + T3 * ${peso3 / 100}`,
                    pesos_trimestres: { 1: peso1, 2: peso2, 3: peso3 },
                    descricao: `Média Ponderada (${peso1}%, ${peso2}%, ${peso3}%)`
                }
            } else {
                // Custom formula
                const validation = validateMTFormula(customFormula)
                if (!validation.valid) {
                    setError(validation.error || 'Fórmula inválida')
                    return
                }
                config = {
                    tipo: 'MT',
                    formula_expression: customFormula,
                    descricao: 'Fórmula Personalizada'
                }
            }

            const result = await saveFormulaConfig({
                disciplina_id: disciplinaId,
                turma_id: turmaId,
                ...config
            } as FormulaConfig)

            if (!result.success) {
                setError(result.error || 'Erro ao salvar configuração')
                return
            }

            onSave()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao salvar')
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    // Calculate preview
    const T1 = 15, T2 = 16, T3 = 17
    let preview = 0
    if (tipo === 'simples') {
        preview = (T1 + T2 + T3) / 3
    } else if (tipo === 'ponderada') {
        preview = (T1 * peso1 / 100) + (T2 * peso2 / 100) + (T3 * peso3 / 100)
    } else if (customFormula) {
        try {
            const expr = customFormula.replace(/T1/gi, T1.toString()).replace(/T2/gi, T2.toString()).replace(/T3/gi, T3.toString())
            // eslint-disable-next-line no-eval
            preview = eval(expr)
        } catch {
            preview = 0
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Configuração de Fórmulas</h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-3">Média Trimestral (MT)</h3>

                            {/* Simple Average */}
                            <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-slate-50 mb-3">
                                <input
                                    type="radio"
                                    name="tipo"
                                    value="simples"
                                    checked={tipo === 'simples'}
                                    onChange={() => setTipo('simples')}
                                    className="mt-1 mr-3"
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-slate-900">Média Simples</div>
                                    <div className="text-sm text-slate-600 mt-1">
                                        <code className="bg-slate-100 px-2 py-1 rounded">(T1 + T2 + T3) / 3</code>
                                    </div>
                                </div>
                            </label>

                            {/* Weighted Average */}
                            <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-slate-50 mb-3">
                                <input
                                    type="radio"
                                    name="tipo"
                                    value="ponderada"
                                    checked={tipo === 'ponderada'}
                                    onChange={() => setTipo('ponderada')}
                                    className="mt-1 mr-3"
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-slate-900">Média Ponderada</div>
                                    {tipo === 'ponderada' && (
                                        <div className="mt-3 space-y-2">
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-sm text-slate-600 mb-1">1º Trimestre (%)</label>
                                                    <input
                                                        type="number"
                                                        value={peso1}
                                                        onChange={(e) => setPeso1(parseFloat(e.target.value) || 0)}
                                                        className="w-full px-3 py-2 border rounded-lg"
                                                        step="0.01"
                                                        min="0"
                                                        max="100"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-slate-600 mb-1">2º Trimestre (%)</label>
                                                    <input
                                                        type="number"
                                                        value={peso2}
                                                        onChange={(e) => setPeso2(parseFloat(e.target.value) || 0)}
                                                        className="w-full px-3 py-2 border rounded-lg"
                                                        step="0.01"
                                                        min="0"
                                                        max="100"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-slate-600 mb-1">3º Trimestre (%)</label>
                                                    <input
                                                        type="number"
                                                        value={peso3}
                                                        onChange={(e) => setPeso3(parseFloat(e.target.value) || 0)}
                                                        className="w-full px-3 py-2 border rounded-lg"
                                                        step="0.01"
                                                        min="0"
                                                        max="100"
                                                    />
                                                </div>
                                            </div>
                                            <div className="text-sm text-slate-600">
                                                Total: <span className={`font-medium ${Math.abs(peso1 + peso2 + peso3 - 100) < 0.1 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {(peso1 + peso2 + peso3).toFixed(2)}%
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </label>

                            {/* Custom Formula */}
                            <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-slate-50">
                                <input
                                    type="radio"
                                    name="tipo"
                                    value="custom"
                                    checked={tipo === 'custom'}
                                    onChange={() => setTipo('custom')}
                                    className="mt-1 mr-3"
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-slate-900">Fórmula Personalizada</div>
                                    {tipo === 'custom' && (
                                        <div className="mt-3">
                                            <input
                                                type="text"
                                                value={customFormula}
                                                onChange={(e) => setCustomFormula(e.target.value)}
                                                placeholder="Ex: T1 * 0.3 + T2 * 0.3 + T3 * 0.4"
                                                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                                            />
                                            <div className="text-xs text-slate-500 mt-2">
                                                Use T1, T2, T3 para representar as notas finais de cada trimestre.
                                                Operadores permitidos: + - * / ( )
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </label>
                        </div>

                        {/* Preview */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="text-sm font-medium text-blue-900 mb-2">Preview do Cálculo</div>
                            <div className="text-sm text-blue-800">
                                T1 = 15, T2 = 16, T3 = 17 → <span className="font-bold">MT = {preview.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" onClick={onClose} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button variant="primary" onClick={handleSave} loading={saving}>
                            Salvar Configuração
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
