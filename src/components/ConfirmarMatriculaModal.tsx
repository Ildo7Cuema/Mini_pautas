/*
component-meta:
  name: ConfirmarMatriculaModal
  description: Modal for confirming student enrollment to next year
  tokens: [--color-primary]
  responsive: true
*/

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Turma } from '../types'
import { confirmarMatricula, confirmarRepetencia, MatriculaComAluno } from '../utils/matriculaUtils'
import { translateError } from '../utils/translations'

interface ConfirmarMatriculaModalProps {
    matricula: MatriculaComAluno
    turmasDestino: Turma[]
    onClose: () => void
    onSuccess: () => void
}

export const ConfirmarMatriculaModal: React.FC<ConfirmarMatriculaModalProps> = ({
    matricula,
    turmasDestino,
    onClose,
    onSuccess
}) => {
    const [selectedTurmaDestino, setSelectedTurmaDestino] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isTransita = matricula.status_transicao === 'Transita'
    const isCondicional = matricula.status_transicao === 'Condicional'
    const isNaoTransita = matricula.status_transicao === 'Não Transita'

    // Filter destination turmas based on expected class
    const filteredTurmas = turmasDestino.filter(t => {
        if (isTransita || isCondicional) {
            // For promoted students, show next class turmas
            return t.nome.includes(matricula.classe_destino || '')
        } else {
            // For non-promoted, show same class turmas
            return t.nome.includes(matricula.classe_origem || '')
        }
    })

    const handleConfirm = async () => {
        try {
            setLoading(true)
            setError(null)

            if (!selectedTurmaDestino) {
                setError('Selecione a turma de destino')
                return
            }

            if (isNaoTransita) {
                await confirmarRepetencia(matricula.id, selectedTurmaDestino)
            } else {
                await confirmarMatricula(matricula.id, selectedTurmaDestino, matricula.classe_destino)
            }

            onSuccess()
        } catch (err) {
            setError(translateError(err instanceof Error ? err.message : 'Erro ao confirmar matrícula'))
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
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isTransita ? 'bg-green-100' : isCondicional ? 'bg-yellow-100' : 'bg-red-100'
                            }`}>
                            <svg className={`w-5 h-5 ${isTransita ? 'text-green-600' : isCondicional ? 'text-yellow-600' : 'text-red-600'
                                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">
                                {isNaoTransita ? 'Confirmar Repetência' : 'Confirmar Matrícula'}
                            </h3>
                            <p className="text-sm text-slate-500">
                                {isNaoTransita ? 'O aluno permanecerá na mesma classe' : 'O aluno será promovido para a próxima classe'}
                            </p>
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
                    <div className="bg-slate-50 rounded-xl p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-500">Aluno:</span>
                                <p className="font-medium text-slate-800">{matricula.aluno?.nome_completo}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Nº Processo:</span>
                                <p className="font-medium text-slate-800">{matricula.aluno?.numero_processo}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Média Geral:</span>
                                <p className="font-medium text-slate-800">{matricula.media_geral?.toFixed(1) || '-'}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Status:</span>
                                <p className={`font-medium ${isTransita ? 'text-green-600' : isCondicional ? 'text-yellow-600' : 'text-red-600'
                                    }`}>{matricula.status_transicao}</p>
                            </div>
                        </div>

                        {matricula.disciplinas_em_risco && matricula.disciplinas_em_risco.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                                <span className="text-xs text-slate-500">Disciplinas em risco:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {matricula.disciplinas_em_risco.map((disc, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                                            {disc}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Transition Info */}
                    <div className="flex items-center justify-center gap-4">
                        <div className="text-center">
                            <div className="text-xs text-slate-500 mb-1">Classe Atual</div>
                            <div className="px-4 py-2 bg-slate-100 rounded-lg font-medium text-slate-800">
                                {matricula.classe_origem || 'N/A'}
                            </div>
                        </div>
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        <div className="text-center">
                            <div className="text-xs text-slate-500 mb-1">Classe Destino</div>
                            <div className={`px-4 py-2 rounded-lg font-medium ${isNaoTransita ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                }`}>
                                {isNaoTransita ? matricula.classe_origem : matricula.classe_destino || 'N/A'}
                            </div>
                        </div>
                    </div>

                    {/* Turma Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Turma de Destino para {matricula.ano_lectivo_destino}
                        </label>
                        <select
                            value={selectedTurmaDestino}
                            onChange={(e) => setSelectedTurmaDestino(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        >
                            <option value="">Selecione a turma</option>
                            {filteredTurmas.length > 0 ? (
                                filteredTurmas.map((turma) => (
                                    <option key={turma.id} value={turma.id}>
                                        {turma.nome}
                                    </option>
                                ))
                            ) : (
                                turmasDestino.map((turma) => (
                                    <option key={turma.id} value={turma.id}>
                                        {turma.nome}
                                    </option>
                                ))
                            )}
                        </select>
                        {filteredTurmas.length === 0 && turmasDestino.length > 0 && (
                            <p className="mt-2 text-xs text-amber-600">
                                ⚠️ Nenhuma turma encontrada para a classe "{isNaoTransita ? matricula.classe_origem : matricula.classe_destino}". Mostrando todas as turmas disponíveis.
                            </p>
                        )}
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
                        onClick={handleConfirm}
                        disabled={loading || !selectedTurmaDestino}
                        className={`px-5 py-2.5 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${isNaoTransita
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-green-600 hover:bg-green-700'
                            }`}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Confirmando...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{isNaoTransita ? 'Confirmar Repetência' : 'Confirmar Matrícula'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}
