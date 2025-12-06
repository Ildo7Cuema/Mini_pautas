import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Turma, Aluno, Professor } from '../types'

export const ClassManagement: React.FC = () => {
    const [turmas, setTurmas] = useState<Turma[]>([])
    const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null)
    const [alunos, setAlunos] = useState<Aluno[]>([])
    const [loading, setLoading] = useState(false)
    const [professor, setProfessor] = useState<Professor | null>(null)

    useEffect(() => {
        loadProfessorProfile()
    }, [])

    useEffect(() => {
        if (professor) {
            loadTurmas()
        }
    }, [professor])

    useEffect(() => {
        if (selectedTurma) {
            loadAlunos()
        }
    }, [selectedTurma])

    const loadProfessorProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('professores')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (error) throw error
            setProfessor(data)
        } catch (error) {
            console.error('Error loading professor profile:', error)
        }
    }

    const loadTurmas = async () => {
        if (!professor) return

        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('turmas')
                .select('*')
                .eq('professor_id', professor.id)
                .order('ano_lectivo', { ascending: false })
                .order('trimestre', { ascending: false })

            if (error) throw error
            setTurmas(data || [])
        } catch (error) {
            console.error('Error loading classes:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadAlunos = async () => {
        if (!selectedTurma) return

        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('alunos')
                .select('*')
                .eq('turma_id', selectedTurma.id)
                .eq('ativo', true)
                .order('nome_completo')

            if (error) throw error
            setAlunos(data || [])
        } catch (error) {
            console.error('Error loading students:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Gestão de Turmas</h1>
                    <p className="text-gray-600 mt-2">
                        Gerencie suas turmas e alunos
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Classes List */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-800">Minhas Turmas</h2>
                            </div>

                            {loading && turmas.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Carregando turmas...
                                </div>
                            ) : turmas.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    Nenhuma turma encontrada
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {turmas.map((turma) => (
                                        <button
                                            key={turma.id}
                                            onClick={() => setSelectedTurma(turma)}
                                            className={`w-full text-left p-4 rounded-lg border-2 transition ${selectedTurma?.id === turma.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                                }`}
                                        >
                                            <div className="font-semibold text-gray-900">{turma.nome}</div>
                                            <div className="text-sm text-gray-600 mt-1">
                                                {turma.ano_lectivo} - {turma.trimestre}º Trimestre
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {turma.nivel_ensino} • Sala {turma.sala}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Students List */}
                    <div className="lg:col-span-2">
                        {selectedTurma ? (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-800">
                                            Alunos - {selectedTurma.nome}
                                        </h2>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {alunos.length} aluno{alunos.length !== 1 ? 's' : ''} matriculado{alunos.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition">
                                        + Adicionar Aluno
                                    </button>
                                </div>

                                {loading ? (
                                    <div className="text-center py-12 text-gray-500">
                                        Carregando alunos...
                                    </div>
                                ) : alunos.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        <p className="font-medium">Nenhum aluno matriculado</p>
                                        <p className="text-sm mt-1">Adicione alunos para começar</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-gray-200">
                                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Nº</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome Completo</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Nº Processo</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Género</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Encarregado</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {alunos.map((aluno, index) => (
                                                    <tr key={aluno.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                                        <td className="py-3 px-4 text-gray-600">{index + 1}</td>
                                                        <td className="py-3 px-4">
                                                            <div className="font-medium text-gray-900">{aluno.nome_completo}</div>
                                                        </td>
                                                        <td className="py-3 px-4 text-gray-600">{aluno.numero_processo}</td>
                                                        <td className="py-3 px-4 text-gray-600">{aluno.genero}</td>
                                                        <td className="py-3 px-4 text-gray-600 text-sm">
                                                            {aluno.nome_encarregado || '-'}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                                                                Editar
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow-md p-12 text-center">
                                <svg className="w-20 h-20 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                    Selecione uma turma
                                </h3>
                                <p className="text-gray-500">
                                    Escolha uma turma à esquerda para ver os alunos
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
