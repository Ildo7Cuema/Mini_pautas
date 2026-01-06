/*
component-meta:
  name: ExameExtraordinarioModal
  description: Modal for registering extraordinary exam results for conditional students
  tokens: [--color-primary]
  responsive: true
*/

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { registrarResultadoExame, MatriculaComAluno } from '../utils/matriculaUtils'
import { translateError } from '../utils/translations'

interface ExameExtraordinarioModalProps {
    matricula: MatriculaComAluno
    onClose: () => void
    onSuccess: () => void
}

export const ExameExtraordinarioModal: React.FC<ExameExtraordinarioModalProps> = ({
    matricula,
    onClose,
    onSuccess
}) => {
    const [resultado, setResultado] = useState<'aprovado' | 'reprovado' | ''>('')
    const [nota, setNota] = useState<string>('')
    const [dataExame, setDataExame] = useState<string>(new Date().toISOString().split('T')[0])
    const [observacao, setObservacao] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async () => {
        try {
            setLoading(true)
            setError(null)

            if (!resultado) {
                setError('Selecione o resultado do exame')
                return
            }

            const notaNum = parseFloat(nota)
            if (isNaN(notaNum) || notaNum < 0 || notaNum > 20) {
                setError('Nota deve ser um valor entre 0 e 20')
                return
            }

            await registrarResultadoExame(
                matricula.id,
                resultado,
                notaNum,
                dataExame ? new Date(dataExame) : undefined,
                observacao || undefined
            )

            onSuccess()
        } catch (err) {
            setError(translateError(err instanceof Error ? err.message : 'Erro ao registrar exame'))
        } finally {
            setLoading(false)
        }
    }

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">Registrar Exame Extraordinário</h3>
                            <p className="text-sm text-slate-500">Registre o resultado do exame do aluno</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    {/* Student Info */}
                    <div className="bg-purple-50 rounded-xl p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-purple-600">Aluno:</span>
                                <p className="font-medium text-slate-800">{matricula.aluno?.nome_completo}</p>
                            </div>
                            <div>
                                <span className="text-purple-600">Nº Processo:</span>
                                <p className="font-medium text-slate-800">{matricula.aluno?.numero_processo}</p>
                            </div>
                        </div>

                        {matricula.disciplinas_em_risco && matricula.disciplinas_em_risco.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-purple-200">
                                <span className="text-xs text-purple-600">Disciplinas para exame:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {matricula.disciplinas_em_risco.map((disc, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                            {disc}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Data do Exame
                            </label>
                            <input
                                type="date"
                                value={dataExame}
                                onChange={(e) => setDataExame(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Nota Obtida
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="20"
                                step="0.1"
                                value={nota}
                                onChange={(e) => setNota(e.target.value)}
                                placeholder="0 - 20"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Result Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Resultado
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setResultado('aprovado')}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${resultado === 'aprovado'
                                        ? 'border-green-500 bg-green-50 text-green-700'
                                        : 'border-slate-200 hover:border-green-300 text-slate-600'
                                    }`}
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium">Aprovado</span>
                                <span className="text-xs">Transita para próxima classe</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setResultado('reprovado')}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${resultado === 'reprovado'
                                        ? 'border-red-500 bg-red-50 text-red-700'
                                        : 'border-slate-200 hover:border-red-300 text-slate-600'
                                    }`}
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium">Reprovado</span>
                                <span className="text-xs">Permanece na mesma classe</span>
                            </button>
                        </div>
                    </div>

                    {/* Observação */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Observações (opcional)
                        </label>
                        <textarea
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value)}
                            rows={2}
                            placeholder="Adicione observações sobre o exame..."
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !resultado || !nota}
                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Registrando...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Registrar Resultado</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}
