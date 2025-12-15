import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

interface Disciplina {
    id: string
    nome: string
    codigo_disciplina: string
    ordem: number
}

interface OrdenarDisciplinasModalProps {
    turmaId: string
    onClose: () => void
    onSave: () => void
}

export const OrdenarDisciplinasModal: React.FC<OrdenarDisciplinasModalProps> = ({
    turmaId,
    onClose,
    onSave
}) => {
    const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadDisciplinas()
    }, [turmaId])

    const loadDisciplinas = async () => {
        try {
            setLoading(true)
            setError(null)

            const { data, error: loadError } = await supabase
                .from('disciplinas')
                .select('id, nome, codigo_disciplina, ordem')
                .eq('turma_id', turmaId)
                .order('ordem')

            if (loadError) throw loadError

            setDisciplinas(data || [])
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar disciplinas'
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    const moveUp = (index: number) => {
        console.log('⬆️ moveUp clicked, index:', index)
        if (index === 0) {
            console.log('⬆️ Already at top, cannot move up')
            return
        }

        const newDisciplinas = [...disciplinas]
        const temp = newDisciplinas[index]
        newDisciplinas[index] = newDisciplinas[index - 1]
        newDisciplinas[index - 1] = temp

        console.log('⬆️ New order:', newDisciplinas.map(d => d.nome))
        setDisciplinas(newDisciplinas)
    }

    const moveDown = (index: number) => {
        console.log('⬇️ moveDown clicked, index:', index)
        if (index === disciplinas.length - 1) {
            console.log('⬇️ Already at bottom, cannot move down')
            return
        }

        const newDisciplinas = [...disciplinas]
        const temp = newDisciplinas[index]
        newDisciplinas[index] = newDisciplinas[index + 1]
        newDisciplinas[index + 1] = temp

        console.log('⬇️ New order:', newDisciplinas.map(d => d.nome))
        setDisciplinas(newDisciplinas)
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            setError(null)

            console.log('🔄 OrdenarDisciplinasModal: Salvando ordenação...')
            console.log('📋 Disciplinas a salvar:', disciplinas.map((d, i) => ({ id: d.id, nome: d.nome, ordem_nova: i + 1, ordem_antiga: d.ordem })))

            // Update each discipline using RPC function that bypasses RLS
            const results = []
            for (let i = 0; i < disciplinas.length; i++) {
                const disciplina = disciplinas[i]
                const newOrdem = i + 1

                console.log(`📝 Updating ${disciplina.nome} (${disciplina.id}) to ordem ${newOrdem}`)

                const result = await supabase
                    .rpc('update_disciplina_ordem', {
                        p_disciplina_id: disciplina.id,
                        p_nova_ordem: newOrdem
                    })

                console.log(`   Result for ${disciplina.nome}:`, {
                    data: result.data,
                    error: result.error
                })

                if (result.error) {
                    throw new Error(`Falha ao atualizar ${disciplina.nome}: ${result.error.message}`)
                }

                results.push(result)
            }

            console.log('✅ OrdenarDisciplinasModal: Ordenação salva com sucesso!')

            // Call onSave callback to refresh parent data
            await onSave()

            // Close modal
            onClose()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar ordenação'
            console.error('❌ OrdenarDisciplinasModal: Erro ao salvar:', err)
            setError(errorMessage)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900">Ordenar Disciplinas</h2>
                    <p className="text-sm text-slate-600 mt-1">
                        Use os botões para reordenar as disciplinas como aparecem na mini-pauta
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    ) : disciplinas.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            Nenhuma disciplina encontrada
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {disciplinas.map((disc, index) => (
                                <div
                                    key={disc.id}
                                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
                                >
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => moveUp(index)}
                                            disabled={index === 0}
                                            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                            title="Mover para cima"
                                        >
                                            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => moveDown(index)}
                                            disabled={index === disciplinas.length - 1}
                                            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                            title="Mover para baixo"
                                        >
                                            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="flex-1">
                                        <div className="font-medium text-slate-900">{disc.nome}</div>
                                        <div className="text-sm text-slate-500">{disc.codigo_disciplina}</div>
                                    </div>

                                    <div className="text-sm font-medium text-slate-400">
                                        #{index + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        )}
                        {saving ? 'Salvando...' : 'Salvar Ordenação'}
                    </button>
                </div>
            </div>
        </div>
    )
}
