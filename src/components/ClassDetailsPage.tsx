/*
component-meta:
  name: ClassDetailsPage
  description: Page showing details of a specific class/turma
  tokens: [--color-primary, --fs-md, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Button } from './ui/Button'
import { Icons } from './ui/Icons'
import { translateError } from '../utils/translations'
import { DisciplinesManagement } from './DisciplinesManagement'
import { StudentFormModal, StudentFormData, initialStudentFormData } from './StudentFormModal'

interface ClassDetailsPageProps {
    turmaId: string
    onNavigate?: (page: string) => void
}

interface TurmaDetails {
    id: string
    nome: string
    ano_lectivo: string
    trimestre: number
    nivel_ensino: string
    codigo_turma: string
    capacidade_maxima: number
    total_alunos?: number
}

interface Aluno {
    id: string
    nome_completo: string
    numero_processo: string
    turma_id: string
    data_nascimento?: string
    genero?: 'M' | 'F'
    nacionalidade?: string
    naturalidade?: string
    tipo_documento?: string
    numero_documento?: string
    nome_pai?: string
    nome_mae?: string
    nome_encarregado?: string
    parentesco_encarregado?: string
    telefone_encarregado?: string
    email_encarregado?: string
    profissao_encarregado?: string
    provincia?: string
    municipio?: string
    bairro?: string
    rua?: string
    endereco?: string
    ano_ingresso?: number
    escola_anterior?: string
    classe_anterior?: string
    observacoes_academicas?: string
}

export const ClassDetailsPage: React.FC<ClassDetailsPageProps> = ({ turmaId, onNavigate }) => {
    const [turma, setTurma] = useState<TurmaDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Student management state
    const [showAddStudentModal, setShowAddStudentModal] = useState(false)
    const [showEditStudentModal, setShowEditStudentModal] = useState(false)
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
    const [showStudentsList, setShowStudentsList] = useState(false)
    const [students, setStudents] = useState<Aluno[]>([])
    const [loadingStudents, setLoadingStudents] = useState(false)
    const [selectedStudent, setSelectedStudent] = useState<Aluno | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [studentFormData, setStudentFormData] = useState<Partial<StudentFormData>>({})

    // Disciplines management state
    const [showDisciplinesManagement, setShowDisciplinesManagement] = useState(false)

    useEffect(() => {
        loadTurmaDetails()
    }, [turmaId])

    const loadTurmaDetails = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('turmas')
                .select(`
                    id,
                    nome,
                    ano_lectivo,
                    trimestre,
                    nivel_ensino,
                    codigo_turma,
                    capacidade_maxima,
                    alunos(count)
                `)
                .eq('id', turmaId)
                .single()

            if (error) throw error

            setTurma({
                ...data,
                total_alunos: data.alunos?.[0]?.count || 0
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar detalhes da turma')
        } finally {
            setLoading(false)
        }
    }

    const handleBack = () => {
        if (onNavigate) {
            onNavigate('classes')
        }
    }

    const loadStudents = async () => {
        try {
            setLoadingStudents(true)
            const { data, error } = await supabase
                .from('alunos')
                .select('id, nome_completo, numero_processo, turma_id')
                .eq('turma_id', turmaId)
                .order('nome_completo')

            if (error) throw error
            setStudents(data || [])
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar alunos'
            setError(translateError(errorMessage))
        } finally {
            setLoadingStudents(false)
        }
    }

    const handleAddStudent = async (data: StudentFormData) => {
        setError(null)
        setSuccess(null)

        try {
            const dataToSubmit = {
                ...data,
                turma_id: turmaId,
                genero: data.genero || null,
                ano_ingresso: data.ano_ingresso ? parseInt(data.ano_ingresso) : null,
            }

            const { error: insertError } = await supabase
                .from('alunos')
                .insert(dataToSubmit)

            if (insertError) throw insertError

            setSuccess('Aluno adicionado com sucesso!')
            setShowAddStudentModal(false)
            setStudentFormData({})

            // Reload turma details to update student count
            loadTurmaDetails()

            // If students list is visible, reload it
            if (showStudentsList) {
                loadStudents()
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao adicionar aluno'
            setError(translateError(errorMessage))
            throw err // Re-throw to keep modal open
        }
    }

    const handleListStudents = () => {
        const newShowState = !showStudentsList
        setShowStudentsList(newShowState)

        if (newShowState && students.length === 0) {
            loadStudents()
        }
    }

    const handleViewGrades = () => {
        if (onNavigate) {
            // Navigate to grades page - will need to be handled by parent component
            onNavigate('grades')
        }
    }

    const handleGenerateReport = () => {
        if (onNavigate) {
            // Navigate to reports page - will need to be handled by parent component
            onNavigate('reports')
        }
    }

    const handleEditStudent = (student: Aluno) => {
        setSelectedStudent(student)
        setStudentFormData({
            nome_completo: student.nome_completo || '',
            numero_processo: student.numero_processo || '',
            turma_id: student.turma_id || '',
            data_nascimento: student.data_nascimento || '',
            genero: (student.genero as '' | 'M' | 'F') || '',
            nacionalidade: student.nacionalidade || '',
            naturalidade: student.naturalidade || '',
            tipo_documento: student.tipo_documento || '',
            numero_documento: student.numero_documento || '',
            nome_pai: student.nome_pai || '',
            nome_mae: student.nome_mae || '',
            nome_encarregado: student.nome_encarregado || '',
            parentesco_encarregado: student.parentesco_encarregado || '',
            telefone_encarregado: student.telefone_encarregado || '',
            email_encarregado: student.email_encarregado || '',
            profissao_encarregado: student.profissao_encarregado || '',
            provincia: student.provincia || '',
            municipio: student.municipio || '',
            bairro: student.bairro || '',
            rua: student.rua || '',
            endereco: student.endereco || '',
            ano_ingresso: student.ano_ingresso?.toString() || '',
            escola_anterior: student.escola_anterior || '',
            classe_anterior: student.classe_anterior || '',
            observacoes_academicas: student.observacoes_academicas || '',
        })
        setShowEditStudentModal(true)
    }

    const handleUpdateStudent = async (data: StudentFormData) => {
        if (!selectedStudent) return

        setError(null)
        setSuccess(null)

        try {
            const dataToUpdate = {
                ...data,
                genero: data.genero || null,
                ano_ingresso: data.ano_ingresso ? parseInt(data.ano_ingresso) : null,
            }

            const { error: updateError } = await supabase
                .from('alunos')
                .update(dataToUpdate)
                .eq('id', selectedStudent.id)

            if (updateError) throw updateError

            setSuccess('Aluno atualizado com sucesso!')
            setShowEditStudentModal(false)
            setSelectedStudent(null)
            setStudentFormData({})

            // Reload students list
            loadStudents()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar aluno'
            setError(translateError(errorMessage))
            throw err // Re-throw to keep modal open
        }
    }

    const handleDeleteClick = (student: Aluno) => {
        setSelectedStudent(student)
        setShowDeleteConfirmModal(true)
    }

    const handleConfirmDelete = async () => {
        if (!selectedStudent) return

        setError(null)
        setSuccess(null)

        try {
            const { error: deleteError } = await supabase
                .from('alunos')
                .delete()
                .eq('id', selectedStudent.id)

            if (deleteError) throw deleteError

            setSuccess('Aluno removido com sucesso!')
            setShowDeleteConfirmModal(false)
            setSelectedStudent(null)

            // Reload turma details to update student count
            loadTurmaDetails()

            // Reload students list
            loadStudents()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao remover aluno'
            setError(translateError(errorMessage))
            setShowDeleteConfirmModal(false)
        }
    }

    const getStudentInitials = (name: string) => {
        const names = name.trim().split(' ')
        if (names.length === 1) return names[0].substring(0, 2).toUpperCase()
        return (names[0][0] + names[names.length - 1][0]).toUpperCase()
    }

    // Filter students based on search query
    const filteredStudents = students.filter(student =>
        student.nome_completo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.numero_processo.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="mt-4 text-slate-600">Carregando detalhes...</p>
                </div>
            </div>
        )
    }

    if (error || !turma) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>} onClick={handleBack}>
                    Voltar
                </Button>
                <Card>
                    <CardBody className="text-center py-12">
                        <svg className="w-16 h-16 text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Erro ao carregar turma</h3>
                        <p className="text-slate-600 mb-4">{error}</p>
                        <Button variant="primary" onClick={handleBack}>
                            Voltar para Turmas
                        </Button>
                    </CardBody>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="min-h-touch min-w-touch"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Button>
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900">{turma.nome}</h2>
                    <p className="text-sm md:text-base text-slate-600">Detalhes da Turma</p>
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="alert alert-error animate-slide-down">
                    <span className="text-sm">{error}</span>
                </div>
            )}
            {success && (
                <div className="alert alert-success animate-slide-down">
                    <Icons.Check />
                    <span className="ml-2 text-sm">{success}</span>
                </div>
            )}

            {/* Turma Information Card */}
            <Card>
                <CardHeader>
                    <h3 className="text-lg font-semibold text-slate-900">Informações Gerais</h3>
                </CardHeader>
                <CardBody className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-500">Código da Turma</label>
                            <p className="text-base font-semibold text-slate-900 mt-1">{turma.codigo_turma}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-500">Ano Lectivo</label>
                            <p className="text-base font-semibold text-slate-900 mt-1">{turma.ano_lectivo}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-500">Trimestre</label>
                            <p className="text-base font-semibold text-slate-900 mt-1">{turma.trimestre}º Trimestre</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-500">Nível de Ensino</label>
                            <p className="text-base font-semibold text-slate-900 mt-1">{turma.nivel_ensino}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-500">Total de Alunos</label>
                            <p className="text-base font-semibold text-slate-900 mt-1">
                                {turma.total_alunos} / {turma.capacidade_maxima}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-500">Capacidade</label>
                            <div className="mt-2">
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div
                                        className="bg-primary-600 h-2 rounded-full transition-all"
                                        style={{ width: `${Math.min((turma.total_alunos || 0) / turma.capacidade_maxima * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <h3 className="text-lg font-semibold text-slate-900">Ações Rápidas</h3>
                </CardHeader>
                <CardBody>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button variant="primary" className="w-full" onClick={() => setShowAddStudentModal(true)}>
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Adicionar Aluno
                        </Button>
                        <Button variant="secondary" className="w-full" onClick={() => setShowDisciplinesManagement(!showDisciplinesManagement)}>
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            {showDisciplinesManagement ? 'Ocultar Disciplinas' : 'Gerir Disciplinas'}
                        </Button>
                        <Button variant="secondary" className="w-full" onClick={handleViewGrades}>
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Ver Notas
                        </Button>
                        <Button variant="secondary" className="w-full" onClick={handleListStudents}>
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            {showStudentsList ? 'Ocultar Alunos' : 'Listar Alunos'}
                        </Button>
                        <Button variant="secondary" className="w-full" onClick={handleGenerateReport}>
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Gerar Relatório
                        </Button>
                    </div>
                </CardBody>
            </Card>

            {/* Disciplines Management - Conditionally shown */}
            {showDisciplinesManagement && (
                <DisciplinesManagement
                    turmaId={turmaId}
                    turmaNome={turma.nome}
                    onClose={() => setShowDisciplinesManagement(false)}
                />
            )}

            {/* Students List - Conditionally shown */}
            {showStudentsList && (
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <h3 className="text-lg font-semibold text-slate-900">Alunos da Turma</h3>
                            {students.length > 0 && (
                                <div className="relative flex-1 sm:max-w-xs">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Pesquisar aluno..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardBody>
                        {loadingStudents ? (
                            <div className="text-center py-8">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                <p className="mt-2 text-slate-600">Carregando alunos...</p>
                            </div>
                        ) : students.length === 0 ? (
                            <div className="text-center py-8">
                                <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                <p className="text-slate-600">Nenhum aluno nesta turma</p>
                                <Button variant="primary" className="mt-4" onClick={() => setShowAddStudentModal(true)}>
                                    Adicionar Primeiro Aluno
                                </Button>
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="text-center py-8">
                                <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <p className="text-slate-600">Nenhum aluno encontrado</p>
                                <p className="text-sm text-slate-500 mt-1">Tente pesquisar com outros termos</p>
                            </div>
                        ) : (
                            <>
                                {/* Premium Card View for All Screens */}
                                <div className="space-y-3">
                                    {filteredStudents.map((aluno) => (
                                        <div
                                            key={aluno.id}
                                            className="group relative bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:border-primary-300 hover:-translate-y-0.5"
                                        >
                                            <div className="flex items-center gap-4">
                                                {/* Avatar with Initials */}
                                                <div className="flex-shrink-0">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:shadow-lg transition-shadow">
                                                        {getStudentInitials(aluno.nome_completo)}
                                                    </div>
                                                </div>

                                                {/* Student Info */}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-slate-900 text-base truncate">
                                                        {aluno.nome_completo}
                                                    </h4>
                                                    <p className="text-sm text-slate-500 mt-0.5">
                                                        Nº {aluno.numero_processo}
                                                    </p>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex-shrink-0 flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditStudent(aluno)}
                                                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 min-h-touch min-w-touch flex items-center justify-center"
                                                        title="Editar aluno"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(aluno)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 min-h-touch min-w-touch flex items-center justify-center"
                                                        title="Remover aluno"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <p className="text-sm text-slate-600">
                                        {searchQuery ? (
                                            <>
                                                Mostrando {filteredStudents.length} de {students.length} {students.length === 1 ? 'aluno' : 'alunos'}
                                            </>
                                        ) : (
                                            <>
                                                Total: {students.length} {students.length === 1 ? 'aluno' : 'alunos'}
                                            </>
                                        )}
                                    </p>
                                </div>
                            </>
                        )}
                    </CardBody>
                </Card>
            )}

            {/* Add Student Modal */}
            <StudentFormModal
                isOpen={showAddStudentModal}
                onClose={() => {
                    setShowAddStudentModal(false)
                    setStudentFormData({})
                }}
                onSubmit={handleAddStudent}
                title="Adicionar Aluno"
                submitLabel="Adicionar Aluno"
                turmaId={turmaId}
                turmaNome={turma.nome}
            />

            {/* Edit Student Modal */}
            <StudentFormModal
                isOpen={showEditStudentModal && selectedStudent !== null}
                onClose={() => {
                    setShowEditStudentModal(false)
                    setSelectedStudent(null)
                    setStudentFormData({})
                }}
                onSubmit={handleUpdateStudent}
                initialData={studentFormData}
                title="Editar Aluno"
                submitLabel="Salvar Alterações"
                turmaId={turmaId}
                turmaNome={turma.nome}
            />

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmModal && selectedStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center md:p-4 z-50 animate-fade-in">
                    <Card className="w-full md:max-w-md md:rounded-lg rounded-t-2xl rounded-b-none md:rounded-b-lg animate-slide-up max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-slate-900">Remover Aluno</h3>
                                    <p className="text-sm text-slate-600 mt-0.5">Esta ação não pode ser desfeita</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardBody>
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <p className="text-sm text-slate-600 mb-2">Você está prestes a remover:</p>
                                    <p className="font-semibold text-slate-900">{selectedStudent.nome_completo}</p>
                                    <p className="text-sm text-slate-600 mt-1">Nº {selectedStudent.numero_processo}</p>
                                </div>

                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <div className="flex gap-2">
                                        <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <p className="text-sm text-amber-800">
                                            Todos os dados do aluno, incluindo notas e histórico, serão permanentemente removidos.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => {
                                            setShowDeleteConfirmModal(false)
                                            setSelectedStudent(null)
                                        }}
                                        className="flex-1"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="danger"
                                        onClick={handleConfirmDelete}
                                        className="flex-1"
                                    >
                                        Remover Aluno
                                    </Button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}
        </div>
    )
}
