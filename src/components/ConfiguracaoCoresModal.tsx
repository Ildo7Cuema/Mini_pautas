import React, { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { GradeColorConfig, GradeColorRule, saveGradeColorConfig, createDefaultConfig } from '../utils/gradeColorConfigUtils'
import { translateError } from '../utils/translations'

interface ConfiguracaoCoresModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: () => void
    currentConfig: GradeColorConfig | null
    nivelEnsino?: string
    turmaId?: string
}

export const ConfiguracaoCoresModal: React.FC<ConfiguracaoCoresModalProps> = ({
    isOpen,
    onClose,
    onSave,
    currentConfig,
    nivelEnsino,
    turmaId
}) => {
    const [config, setConfig] = useState<GradeColorConfig | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [editingRule, setEditingRule] = useState<GradeColorRule | null>(null)
    const [showRuleForm, setShowRuleForm] = useState(false)

    useEffect(() => {
        if (isOpen) {
            if (currentConfig) {
                setConfig(currentConfig)
            } else if (nivelEnsino) {
                // Create default config
                setConfig(createDefaultConfig(nivelEnsino, turmaId))
            } else {
                // Create empty config
                setConfig({
                    turma_id: turmaId,
                    cor_negativa: '#dc2626',
                    cor_positiva: '#2563eb',
                    nome: 'Configuração Personalizada',
                    regras: []
                })
            }
            setError(null)
            setEditingRule(null)
            setShowRuleForm(false)
        }
    }, [isOpen, currentConfig, nivelEnsino, turmaId])

    if (!isOpen || !config) return null

    const handleSave = async () => {
        try {
            setSaving(true)
            setError(null)

            const result = await saveGradeColorConfig(config)

            if (!result.success) {
                setError(translateError(result.error || 'Erro ao salvar configuração'))
                return
            }

            onSave()
            onClose()
        } catch (err) {
            setError(translateError(err instanceof Error ? err.message : 'Erro ao salvar configuração'))
        } finally {
            setSaving(false)
        }
    }

    const handleAddRule = () => {
        setEditingRule({
            tipo_componente: 'todos',
            threshold: 10,
            operador: '<',
            aplicar_cor: true,
            modo_exibicao: 'texto',
            ordem: config.regras.length
        })
        setShowRuleForm(true)
    }

    const handleEditRule = (rule: GradeColorRule, index: number) => {
        setEditingRule({ ...rule, ordem: index })
        setShowRuleForm(true)
    }

    const handleSaveRule = () => {
        if (!editingRule) return

        const newRegras = [...config.regras]
        const existingIndex = newRegras.findIndex((r, i) => i === editingRule.ordem)

        if (existingIndex >= 0) {
            newRegras[existingIndex] = editingRule
        } else {
            newRegras.push(editingRule)
        }

        // Reorder
        newRegras.forEach((r, i) => r.ordem = i)

        setConfig({ ...config, regras: newRegras })
        setShowRuleForm(false)
        setEditingRule(null)
    }

    const handleDeleteRule = (index: number) => {
        const newRegras = config.regras.filter((_, i) => i !== index)
        newRegras.forEach((r, i) => r.ordem = i)
        setConfig({ ...config, regras: newRegras })
    }

    const moveRuleUp = (index: number) => {
        if (index === 0) return
        const newRegras = [...config.regras]
            ;[newRegras[index], newRegras[index - 1]] = [newRegras[index - 1], newRegras[index]]
        newRegras.forEach((r, i) => r.ordem = i)
        setConfig({ ...config, regras: newRegras })
    }

    const moveRuleDown = (index: number) => {
        if (index === config.regras.length - 1) return
        const newRegras = [...config.regras]
            ;[newRegras[index], newRegras[index + 1]] = [newRegras[index + 1], newRegras[index]]
        newRegras.forEach((r, i) => r.ordem = i)
        setConfig({ ...config, regras: newRegras })
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900">Configurar Cores das Notas</h2>
                    <p className="text-sm text-slate-600 mt-1">
                        Personalize as cores e regras de exibição das notas
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Nome da Configuração
                            </label>
                            <Input
                                value={config.nome}
                                onChange={(e) => setConfig({ ...config, nome: e.target.value })}
                                placeholder="Ex: Ensino Primário 5ª-6ª Classe"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Descrição (opcional)
                            </label>
                            <Input
                                value={config.descricao || ''}
                                onChange={(e) => setConfig({ ...config, descricao: e.target.value })}
                                placeholder="Descrição da configuração"
                            />
                        </div>

                        {/* Colors */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Cor Negativa
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={config.cor_negativa}
                                        onChange={(e) => setConfig({ ...config, cor_negativa: e.target.value })}
                                        className="h-10 w-20 rounded border border-slate-300 cursor-pointer"
                                    />
                                    <Input
                                        value={config.cor_negativa}
                                        onChange={(e) => setConfig({ ...config, cor_negativa: e.target.value })}
                                        placeholder="#dc2626"
                                        className="flex-1"
                                    />
                                </div>
                                <div className="mt-2 p-3 rounded" style={{ backgroundColor: config.cor_negativa }}>
                                    <span className="text-white font-medium">Exemplo: 8.5</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Cor Positiva
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={config.cor_positiva}
                                        onChange={(e) => setConfig({ ...config, cor_positiva: e.target.value })}
                                        className="h-10 w-20 rounded border border-slate-300 cursor-pointer"
                                    />
                                    <Input
                                        value={config.cor_positiva}
                                        onChange={(e) => setConfig({ ...config, cor_positiva: e.target.value })}
                                        placeholder="#2563eb"
                                        className="flex-1"
                                    />
                                </div>
                                <div className="mt-2 p-3 rounded" style={{ backgroundColor: config.cor_positiva }}>
                                    <span className="text-white font-medium">Exemplo: 15.0</span>
                                </div>
                            </div>
                        </div>

                        {/* Rules */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold text-slate-900">Regras de Aplicação</h3>
                                <Button
                                    variant="secondary"
                                    onClick={handleAddRule}
                                    icon={
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    }
                                >
                                    Adicionar Regra
                                </Button>
                            </div>

                            {config.regras.length === 0 ? (
                                <div className="text-center py-8 bg-slate-50 rounded-lg">
                                    <p className="text-slate-600">Nenhuma regra configurada</p>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Adicione regras para definir quando usar cada cor
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {config.regras.map((rule, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
                                        >
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    onClick={() => moveRuleUp(index)}
                                                    disabled={index === 0}
                                                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="Mover para cima"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => moveRuleDown(index)}
                                                    disabled={index === config.regras.length - 1}
                                                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="Mover para baixo"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                            </div>

                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-slate-900">
                                                    {rule.nivel_ensino || 'Todos os níveis'}
                                                    {rule.classe_min || rule.classe_max ? (
                                                        <span className="text-slate-600">
                                                            {' '}({rule.classe_min || ''}ª - {rule.classe_max || ''}ª Classe)
                                                        </span>
                                                    ) : ''}
                                                </div>
                                                <div className="text-xs text-slate-600 mt-1">
                                                    {rule.tipo_componente === 'todos' ? 'Todos os componentes' :
                                                        rule.tipo_componente === 'calculado' ? 'Componentes calculados' :
                                                            'Componentes regulares'}
                                                    {' · '}
                                                    Nota {rule.operador} {rule.threshold}
                                                    {' · '}
                                                    {rule.aplicar_cor ? 'Aplicar cor' : 'Sempre positiva'}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEditRule(rule, index)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                                                    title="Editar"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRule(index)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                                                    title="Excluir"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={saving || !config.nome}
                    >
                        {saving ? 'Salvando...' : 'Salvar Configuração'}
                    </Button>
                </div>
            </div>

            {/* Rule Form Modal */}
            {showRuleForm && editingRule && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
                        <div className="px-6 py-4 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-900">
                                {editingRule.ordem !== undefined && config.regras[editingRule.ordem] ? 'Editar' : 'Adicionar'} Regra
                            </h3>
                        </div>

                        <div className="px-6 py-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Nível de Ensino (opcional)
                                </label>
                                <select
                                    value={editingRule.nivel_ensino || ''}
                                    onChange={(e) => setEditingRule({ ...editingRule, nivel_ensino: e.target.value || null })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                >
                                    <option value="">Todos os níveis</option>
                                    <option value="Ensino Primário">Ensino Primário</option>
                                    <option value="Ensino Secundário">Ensino Secundário</option>
                                    <option value="Escolas Técnicas">Escolas Técnicas</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Classe Mínima (opcional)
                                    </label>
                                    <Input
                                        type="number"
                                        value={editingRule.classe_min || ''}
                                        onChange={(e) => setEditingRule({ ...editingRule, classe_min: e.target.value ? parseInt(e.target.value) : null })}
                                        placeholder="Ex: 1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Classe Máxima (opcional)
                                    </label>
                                    <Input
                                        type="number"
                                        value={editingRule.classe_max || ''}
                                        onChange={(e) => setEditingRule({ ...editingRule, classe_max: e.target.value ? parseInt(e.target.value) : null })}
                                        placeholder="Ex: 6"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Tipo de Componente
                                </label>
                                <select
                                    value={editingRule.tipo_componente}
                                    onChange={(e) => setEditingRule({ ...editingRule, tipo_componente: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                >
                                    <option value="todos">Todos os componentes</option>
                                    <option value="calculado">Apenas componentes calculados</option>
                                    <option value="regular">Apenas componentes regulares</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Operador
                                    </label>
                                    <select
                                        value={editingRule.operador}
                                        onChange={(e) => setEditingRule({ ...editingRule, operador: e.target.value as any })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                    >
                                        <option value="<">Menor que (&lt;)</option>
                                        <option value="<=">Menor ou igual (≤)</option>
                                        <option value=">">Maior que (&gt;)</option>
                                        <option value=">=">Maior ou igual (≥)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Valor Limite
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={editingRule.threshold}
                                        onChange={(e) => setEditingRule({ ...editingRule, threshold: parseFloat(e.target.value) || 0 })}
                                        placeholder="Ex: 10"
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Modo de Aplicação
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="modo_exibicao"
                                            checked={editingRule.modo_exibicao === 'texto' || !editingRule.modo_exibicao}
                                            onChange={() => setEditingRule({ ...editingRule, modo_exibicao: 'texto' })}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-700">Por Componente (Nota colorida)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="modo_exibicao"
                                            checked={editingRule.modo_exibicao === 'fundo'}
                                            onChange={() => setEditingRule({ ...editingRule, modo_exibicao: 'fundo' })}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-700">Por Coluna (Fundo colorido)</span>
                                    </label>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Define se a cor será aplicada ao texto da nota ou ao fundo da célula.
                                </p>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editingRule.aplicar_cor}
                                        onChange={(e) => setEditingRule({ ...editingRule, aplicar_cor: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <span className="text-sm font-medium text-slate-700">
                                        Aplicar cor negativa quando a condição for verdadeira
                                    </span>
                                </label>
                                <p className="text-xs text-slate-500 ml-6 mt-1">
                                    Se desmarcado, sempre usará a cor positiva
                                </p>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setShowRuleForm(false)
                                    setEditingRule(null)
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSaveRule}
                            >
                                Salvar Regra
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
