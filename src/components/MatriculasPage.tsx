/*
component-meta:
  name: MatriculasPage
  description: Page for managing student enrollments at end of academic year
  tokens: [--color-primary, --fs-md, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardBody } from './ui/Card'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { translateError } from '../utils/translations'
import {
    carregarMatriculasPendentes,
    gerarMatriculasPendentes,
    atualizarClassificacaoMatricula,
    confirmarMatricula,
    confirmarRepetencia,
    carregarTurmasDestino,
    carregarResumoMatriculas,
    calcularClassificacaoTurma,
    calcularProximoAnoLectivo,
    extrairClasse,
    MatriculaComAluno
} from '../utils/matriculaUtils'
import { Turma, Matricula } from '../types'
import { ConfirmarMatriculaModal } from './ConfirmarMatriculaModal'
import { ExameExtraordinarioModal } from './ExameExtraordinarioModal'

interface TurmaOption {
    id: string
    nome: string
    ano_lectivo: string
    nivel_ensino: string
}

type FilterStatus = 'todos' | 'Transita' | 'Não Transita' | 'Condicional' | 'pendente' | 'confirmada'

export const MatriculasPage: React.FC = () => {
    const { escolaProfile, professorProfile, secretarioProfile } = useAuth()

    // State
    const [turmas, setTurmas] = useState<TurmaOption[]>([])
    const [selectedTurma, setSelectedTurma] = useState<string>('')
    const [anoLectivoDestino, setAnoLectivoDestino] = useState<string>('')
    const [matriculas, setMatriculas] = useState<MatriculaComAluno[]>([])
    const [turmasDestino, setTurmasDestino] = useState<Turma[]>([])
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('todos')

    // Loading states
    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)

    // Messages
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Modals
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [showExameModal, setShowExameModal] = useState(false)
    const [selectedMatricula, setSelectedMatricula] = useState<MatriculaComAluno | null>(null)

    // Statistics
    const [resumo, setResumo] = useState({
        total: 0,
        transitados: 0,
        naoTransitados: 0,
        condicionais: 0,
        pendentes: 0,
        confirmadas: 0,
        aguardandoExame: 0
    })

    // Selected for batch operations
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Get escola_id
    const escolaId = escolaProfile?.id || professorProfile?.escola_id || secretarioProfile?.escola_id

    // Load turmas on mount
    useEffect(() => {
        loadTurmas()
    }, [])

    // Load matriculas when turma changes
    useEffect(() => {
        if (selectedTurma && anoLectivoDestino) {
            loadMatriculas()
        }
    }, [selectedTurma, anoLectivoDestino])

    const loadTurmas = async () => {
        try {
            if (!escolaId) return

            const { data, error } = await supabase
                .from('turmas')
                .select('id, nome, ano_lectivo, nivel_ensino')
                .eq('escola_id', escolaId)
                .order('ano_lectivo', { ascending: false })
                .order('nome')

            if (error) throw error

            setTurmas(data?.map(t => ({
                id: t.id,
                nome: t.nome,
                ano_lectivo: String(t.ano_lectivo),
                nivel_ensino: t.nivel_ensino
            })) || [])

        } catch (err) {
            setError(translateError(err instanceof Error ? err.message : 'Erro ao carregar turmas'))
        }
    }

    const loadMatriculas = async () => {
        try {
            setLoading(true)
            setError(null)

            if (!escolaId) return

            // Get selected turma info
            const turmaInfo = turmas.find(t => t.id === selectedTurma)
            if (!turmaInfo) return

            // Load existing matriculas
            const data = await carregarMatriculasPendentes(escolaId, turmaInfo.ano_lectivo)

            // Filter by selected turma
            const filteredData = data.filter(m => m.turma_origem_id === selectedTurma)
            setMatriculas(filteredData)

            // Load destination turmas for the next year
            const destTurmas = await carregarTurmasDestino(escolaId, anoLectivoDestino)
            setTurmasDestino(destTurmas)

            // Load summary
            const resumoData = await carregarResumoMatriculas(escolaId, turmaInfo.ano_lectivo)
            setResumo(resumoData)

        } catch (err) {
            setError(translateError(err instanceof Error ? err.message : 'Erro ao carregar matrículas'))
        } finally {
            setLoading(false)
        }
    }

    const handleGenerarMatriculas = async () => {
        try {
            setGenerating(true)
            setError(null)

            if (!selectedTurma || !anoLectivoDestino) {
                setError('Selecione a turma e o ano letivo de destino')
                return
            }

            // Generate pending enrollments
            const count = await gerarMatriculasPendentes(selectedTurma, anoLectivoDestino)

            // Get turma info for classification
            const turmaInfo = turmas.find(t => t.id === selectedTurma)
            if (!turmaInfo) return

            const classe = extrairClasse(turmaInfo.nome)

            // Load disciplinas obrigatorias
            const { data: discObrig } = await supabase
                .from('disciplinas_obrigatorias')
                .select('disciplina_id')
                .eq('turma_id', selectedTurma)
                .eq('is_obrigatoria', true)

            const discObrigIds = (discObrig || []).map(d => d.disciplina_id)

            // Calculate classifications
            const classificacoes = await calcularClassificacaoTurma(
                selectedTurma,
                turmaInfo.nivel_ensino,
                classe || '',
                discObrigIds
            )

            // Update each matricula with classification
            const matriculasData = await carregarMatriculasPendentes(escolaId!, turmaInfo.ano_lectivo)
            const turmaMatriculas = matriculasData.filter(m => m.turma_origem_id === selectedTurma)

            for (const matricula of turmaMatriculas) {
                const classificacao = classificacoes.find(c => c.aluno.id === matricula.aluno_id)
                if (classificacao) {
                    await atualizarClassificacaoMatricula(
                        matricula.id,
                        classificacao.classification,
                        classificacao.mediaGeral,
                        classe
                    )
                }
            }

            setSuccess(`${count} matrículas geradas e classificadas com sucesso!`)
            setTimeout(() => setSuccess(null), 5000)

            // Reload data
            await loadMatriculas()

        } catch (err) {
            setError(translateError(err instanceof Error ? err.message : 'Erro ao gerar matrículas'))
        } finally {
            setGenerating(false)
        }
    }

    const handleConfirmarClick = (matricula: MatriculaComAluno) => {
        setSelectedMatricula(matricula)
        setShowConfirmModal(true)
    }

    const handleExameClick = (matricula: MatriculaComAluno) => {
        setSelectedMatricula(matricula)
        setShowExameModal(true)
    }

    const handleConfirmSuccess = async () => {
        setShowConfirmModal(false)
        setSelectedMatricula(null)
        setSuccess('Matrícula confirmada com sucesso!')
        setTimeout(() => setSuccess(null), 3000)
        await loadMatriculas()
    }

    const handleExameSuccess = async () => {
        setShowExameModal(false)
        setSelectedMatricula(null)
        setSuccess('Resultado do exame registrado com sucesso!')
        setTimeout(() => setSuccess(null), 3000)
        await loadMatriculas()
    }

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredMatriculas.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredMatriculas.map(m => m.id)))
        }
    }

    // Filter matriculas
    const filteredMatriculas = matriculas.filter(m => {
        if (filterStatus === 'todos') return true
        if (filterStatus === 'pendente' || filterStatus === 'confirmada') {
            return m.estado_matricula === filterStatus
        }
        return m.status_transicao === filterStatus
    })

    // Get status badge color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Transita': return 'bg-green-100 text-green-800 border-green-200'
            case 'Não Transita': return 'bg-red-100 text-red-800 border-red-200'
            case 'Condicional': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            default: return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    const getEstadoColor = (estado: string) => {
        switch (estado) {
            case 'confirmada': return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'pendente': return 'bg-amber-100 text-amber-800 border-amber-200'
            case 'aguardando_exame': return 'bg-purple-100 text-purple-800 border-purple-200'
            default: return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    return (
        <div className="space-y-5 md:space-y-6 animate-fade-in pb-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-5 md:p-6 shadow-lg">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyek0zNiAyNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
                <div className="relative flex items-start gap-4">
                    <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                        <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Confirmação de Matrículas</h2>
                        <p className="text-sm md:text-base text-indigo-100/90">
                            Gerencie a transição de alunos para o próximo ano letivo
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center gap-3 animate-slide-up shadow-sm">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-red-100">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <span className="text-sm flex-1">{error}</span>
                    <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl flex items-center gap-3 animate-slide-up shadow-sm">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-green-100">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <span className="text-sm flex-1">{success}</span>
                </div>
            )}

            {/* Filters */}
            <Card className="overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200/50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                        </div>
                        <h3 className="text-base md:text-lg font-semibold text-slate-800">Selecionar Turma</h3>
                    </div>
                </CardHeader>
                <CardBody className="p-4 md:p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Turma de Origem</label>
                            <select
                                value={selectedTurma}
                                onChange={(e) => {
                                    setSelectedTurma(e.target.value)
                                    const turma = turmas.find(t => t.id === e.target.value)
                                    if (turma) {
                                        setAnoLectivoDestino(calcularProximoAnoLectivo(turma.ano_lectivo))
                                    }
                                }}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm"
                            >
                                <option value="">Selecione uma turma</option>
                                {turmas.map((turma) => (
                                    <option key={turma.id} value={turma.id}>
                                        {turma.nome} - {turma.ano_lectivo}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Ano Letivo Destino</label>
                            <input
                                type="text"
                                value={anoLectivoDestino}
                                onChange={(e) => setAnoLectivoDestino(e.target.value)}
                                placeholder="Ex: 2026"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={handleGenerarMatriculas}
                                disabled={!selectedTurma || !anoLectivoDestino || generating}
                                className="w-full px-5 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                            >
                                {generating ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Gerando...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span>Gerar Matrículas</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Statistics */}
            {matriculas.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                        <div className="text-2xl font-bold text-slate-800">{resumo.total}</div>
                        <div className="text-xs text-slate-500">Total</div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-200">
                        <div className="text-2xl font-bold text-green-700">{resumo.transitados}</div>
                        <div className="text-xs text-green-600">Transitados</div>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 shadow-sm border border-red-200">
                        <div className="text-2xl font-bold text-red-700">{resumo.naoTransitados}</div>
                        <div className="text-xs text-red-600">Não Transitados</div>
                    </div>
                    <div className="bg-yellow-50 rounded-xl p-4 shadow-sm border border-yellow-200">
                        <div className="text-2xl font-bold text-yellow-700">{resumo.condicionais}</div>
                        <div className="text-xs text-yellow-600">Condicionais</div>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 shadow-sm border border-amber-200">
                        <div className="text-2xl font-bold text-amber-700">{resumo.pendentes}</div>
                        <div className="text-xs text-amber-600">Pendentes</div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-200">
                        <div className="text-2xl font-bold text-blue-700">{resumo.confirmadas}</div>
                        <div className="text-xs text-blue-600">Confirmadas</div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4 shadow-sm border border-purple-200">
                        <div className="text-2xl font-bold text-purple-700">{resumo.aguardandoExame}</div>
                        <div className="text-xs text-purple-600">Aguardando Exame</div>
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            {matriculas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {[
                        { key: 'todos', label: 'Todos' },
                        { key: 'Transita', label: 'Transitados' },
                        { key: 'Não Transita', label: 'Não Transitados' },
                        { key: 'Condicional', label: 'Condicionais' },
                        { key: 'pendente', label: 'Pendentes' },
                        { key: 'confirmada', label: 'Confirmadas' }
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilterStatus(key as FilterStatus)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === key
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* Matriculas Table */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            ) : filteredMatriculas.length > 0 ? (
                <Card className="overflow-hidden border-0 shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === filteredMatriculas.length && filteredMatriculas.length > 0}
                                            onChange={toggleSelectAll}
                                            className="rounded border-slate-300"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Aluno</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Nº Processo</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Média</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Estado</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Destino</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredMatriculas.map((matricula) => (
                                    <tr key={matricula.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(matricula.id)}
                                                onChange={() => toggleSelection(matricula.id)}
                                                className="rounded border-slate-300"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-800">{matricula.aluno?.nome_completo}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">
                                            {matricula.aluno?.numero_processo}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-semibold text-slate-800">
                                                {matricula.media_geral?.toFixed(1) || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(matricula.status_transicao)}`}>
                                                {matricula.status_transicao}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getEstadoColor(matricula.estado_matricula)}`}>
                                                {matricula.estado_matricula === 'aguardando_exame' ? 'Aguardando Exame' :
                                                    matricula.estado_matricula.charAt(0).toUpperCase() + matricula.estado_matricula.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-slate-600">
                                            {matricula.classe_destino || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {matricula.estado_matricula === 'pendente' && (
                                                    <button
                                                        onClick={() => handleConfirmarClick(matricula)}
                                                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                                    >
                                                        Confirmar
                                                    </button>
                                                )}
                                                {matricula.estado_matricula === 'aguardando_exame' && (
                                                    <button
                                                        onClick={() => handleExameClick(matricula)}
                                                        className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
                                                    >
                                                        Registrar Exame
                                                    </button>
                                                )}
                                                {matricula.estado_matricula === 'confirmada' && (
                                                    <span className="text-xs text-green-600 font-medium">✓ Confirmada</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : selectedTurma && !loading ? (
                <div className="text-center py-12 text-slate-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium text-slate-600">Nenhuma matrícula encontrada</p>
                    <p className="text-sm">Clique em "Gerar Matrículas" para criar as matrículas pendentes</p>
                </div>
            ) : null}

            {/* Modals */}
            {showConfirmModal && selectedMatricula && (
                <ConfirmarMatriculaModal
                    matricula={selectedMatricula}
                    turmasDestino={turmasDestino}
                    onClose={() => {
                        setShowConfirmModal(false)
                        setSelectedMatricula(null)
                    }}
                    onSuccess={handleConfirmSuccess}
                />
            )}

            {showExameModal && selectedMatricula && (
                <ExameExtraordinarioModal
                    matricula={selectedMatricula}
                    onClose={() => {
                        setShowExameModal(false)
                        setSelectedMatricula(null)
                    }}
                    onSuccess={handleExameSuccess}
                />
            )}
        </div>
    )
}
