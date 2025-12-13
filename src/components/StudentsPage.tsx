/*
component-meta:
  name: StudentsPage
  description: Page for managing students with expanded information tabs
  tokens: [--color-primary, --fs-md, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Icons } from './ui/Icons'
import { translateError } from '../utils/translations'
import { ConfirmModal } from './ui/ConfirmModal'

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
    turma?: {
        nome: string
    }
}

interface Turma {
    id: string
    nome: string
}

type TabType = 'pessoal' | 'encarregado' | 'endereco' | 'academico'

const initialFormData = {
    // Dados básicos
    nome_completo: '',
    numero_processo: '',
    turma_id: '',
    // Dados pessoais
    data_nascimento: '',
    genero: '' as '' | 'M' | 'F',
    nacionalidade: '',
    naturalidade: '',
    tipo_documento: '',
    numero_documento: '',
    // Encarregado
    nome_pai: '',
    nome_mae: '',
    nome_encarregado: '',
    parentesco_encarregado: '',
    telefone_encarregado: '',
    email_encarregado: '',
    profissao_encarregado: '',
    // Endereço
    provincia: '',
    municipio: '',
    bairro: '',
    rua: '',
    endereco: '',
    // Acadêmico
    ano_ingresso: '',
    escola_anterior: '',
    classe_anterior: '',
    observacoes_academicas: '',
}

export const StudentsPage: React.FC = () => {
    const [alunos, setAlunos] = useState<Aluno[]>([])
    const [turmas, setTurmas] = useState<Turma[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showConfirmDelete, setShowConfirmDelete] = useState(false)
    const [selectedTurma, setSelectedTurma] = useState<string>('all')
    const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null)
    const [alunoToDelete, setAlunoToDelete] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState<TabType>('pessoal')
    const [formData, setFormData] = useState(initialFormData)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [generatingNumero, setGeneratingNumero] = useState(false)
    const [manualNumero, setManualNumero] = useState(false)

    useEffect(() => {
        loadTurmas()
        loadAlunos()
    }, [selectedTurma])

    // Auto-generate numero_processo when turma is selected
    useEffect(() => {
        if (formData.turma_id && !manualNumero && !formData.numero_processo) {
            generateNumeroProcesso()
        }
    }, [formData.turma_id, manualNumero])

    const loadTurmas = async () => {
        try {
            const { data, error } = await supabase
                .from('turmas')
                .select('id, nome')
                .order('nome')

            if (error) throw error
            setTurmas(data || [])
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar turmas'
            setError(translateError(errorMessage))
        }
    }

    const loadAlunos = async () => {
        try {
            setLoading(true)
            let query = supabase
                .from('alunos')
                .select(`
                    id,
                    nome_completo,
                    numero_processo,
                    turma_id,
                    data_nascimento,
                    genero,
                    nacionalidade,
                    naturalidade,
                    tipo_documento,
                    numero_documento,
                    nome_pai,
                    nome_mae,
                    nome_encarregado,
                    parentesco_encarregado,
                    telefone_encarregado,
                    email_encarregado,
                    profissao_encarregado,
                    provincia,
                    municipio,
                    bairro,
                    rua,
                    endereco,
                    ano_ingresso,
                    escola_anterior,
                    classe_anterior,
                    observacoes_academicas,
                    turmas(nome)
                `)
                .order('nome_completo')

            if (selectedTurma !== 'all') {
                query = query.eq('turma_id', selectedTurma)
            }

            const { data, error } = await query

            if (error) throw error
            setAlunos(data || [])
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar alunos'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    const generateNumeroProcesso = async () => {
        if (!formData.turma_id) return

        setGeneratingNumero(true)
        try {
            const { data, error } = await supabase
                .rpc('generate_numero_processo', { turma_uuid: formData.turma_id })

            if (error) throw error
            setFormData(prev => ({ ...prev, numero_processo: data }))
        } catch (err) {
            console.error('Error generating numero_processo:', err)
            setError('Erro ao gerar número de processo automaticamente')
        } finally {
            setGeneratingNumero(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)

        try {
            const dataToSubmit = {
                ...formData,
                genero: formData.genero || null,
                ano_ingresso: formData.ano_ingresso ? parseInt(formData.ano_ingresso) : null,
            }

            const { error: insertError } = await supabase
                .from('alunos')
                .insert(dataToSubmit)

            if (insertError) throw insertError

            setSuccess('Aluno adicionado com sucesso!')
            setShowModal(false)
            setFormData(initialFormData)
            setActiveTab('pessoal')
            loadAlunos()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao adicionar aluno'
            setError(translateError(errorMessage))
        }
    }

    const handleDeleteClick = (id: string) => {
        setAlunoToDelete(id)
        setShowConfirmDelete(true)
    }

    const handleConfirmDelete = async () => {
        if (!alunoToDelete) return

        try {
            const { error } = await supabase
                .from('alunos')
                .delete()
                .eq('id', alunoToDelete)

            if (error) throw error

            setSuccess('Aluno excluído com sucesso!')
            setShowConfirmDelete(false)
            setAlunoToDelete(null)
            loadAlunos()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir aluno'
            setError(translateError(errorMessage))
            setShowConfirmDelete(false)
            setAlunoToDelete(null)
        }
    }

    const handleEditClick = (aluno: Aluno) => {
        setSelectedAluno(aluno)
        setFormData({
            nome_completo: aluno.nome_completo || '',
            numero_processo: aluno.numero_processo || '',
            turma_id: aluno.turma_id || '',
            data_nascimento: aluno.data_nascimento || '',
            genero: (aluno.genero as '' | 'M' | 'F') || '',
            nacionalidade: aluno.nacionalidade || '',
            naturalidade: aluno.naturalidade || '',
            tipo_documento: aluno.tipo_documento || '',
            numero_documento: aluno.numero_documento || '',
            nome_pai: aluno.nome_pai || '',
            nome_mae: aluno.nome_mae || '',
            nome_encarregado: aluno.nome_encarregado || '',
            parentesco_encarregado: aluno.parentesco_encarregado || '',
            telefone_encarregado: aluno.telefone_encarregado || '',
            email_encarregado: aluno.email_encarregado || '',
            profissao_encarregado: aluno.profissao_encarregado || '',
            provincia: aluno.provincia || '',
            municipio: aluno.municipio || '',
            bairro: aluno.bairro || '',
            rua: aluno.rua || '',
            endereco: aluno.endereco || '',
            ano_ingresso: aluno.ano_ingresso?.toString() || '',
            escola_anterior: aluno.escola_anterior || '',
            classe_anterior: aluno.classe_anterior || '',
            observacoes_academicas: aluno.observacoes_academicas || '',
        })
        setActiveTab('pessoal')
        setShowEditModal(true)
    }

    const handleUpdateStudent = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedAluno) return

        setError(null)
        setSuccess(null)

        try {
            const dataToUpdate = {
                ...formData,
                genero: formData.genero || null,
                ano_ingresso: formData.ano_ingresso ? parseInt(formData.ano_ingresso) : null,
            }

            const { error: updateError } = await supabase
                .from('alunos')
                .update(dataToUpdate)
                .eq('id', selectedAluno.id)

            if (updateError) throw updateError

            setSuccess('Aluno atualizado com sucesso!')
            setShowEditModal(false)
            setSelectedAluno(null)
            setFormData(initialFormData)
            setActiveTab('pessoal')
            loadAlunos()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar aluno'
            setError(translateError(errorMessage))
        }
    }

    const getStudentInitials = (name: string) => {
        const names = name.trim().split(' ')
        if (names.length === 1) return names[0].substring(0, 2).toUpperCase()
        return (names[0][0] + names[names.length - 1][0]).toUpperCase()
    }

    // Filter students based on search query
    const filteredAlunos = alunos.filter(aluno =>
        aluno.nome_completo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        aluno.numero_processo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        aluno.turma?.nome?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const closeModal = () => {
        setShowModal(false)
        setFormData(initialFormData)
        setActiveTab('pessoal')
        setGeneratingNumero(false)
        setManualNumero(false)
    }

    const closeEditModal = () => {
        setShowEditModal(false)
        setSelectedAluno(null)
        setFormData(initialFormData)
        setActiveTab('pessoal')
        setGeneratingNumero(false)
        setManualNumero(false)
    }

    // Tab component with icons
    const TabButton: React.FC<{ tab: TabType; label: string; icon: React.ReactNode }> = ({ tab, label, icon }) => (
        <button
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === tab
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    )

    // Form fields for each tab
    const renderTabContent = (isEdit: boolean = false) => {
        switch (activeTab) {
            case 'pessoal':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Nome Completo *"
                                type="text"
                                value={formData.nome_completo}
                                onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                                placeholder="Nome completo do aluno"
                                required
                                icon={<Icons.User />}
                            />
                            <div className="relative">
                                <Input
                                    label="Nº de Processo"
                                    type="text"
                                    value={formData.numero_processo}
                                    onChange={(e) => {
                                        setFormData({ ...formData, numero_processo: e.target.value })
                                        setManualNumero(true)
                                    }}
                                    placeholder={generatingNumero ? "Gerando..." : "Gerado automaticamente"}
                                    disabled={generatingNumero}
                                    helpText={
                                        formData.turma_id
                                            ? "Gerado automaticamente ao selecionar a turma. Clique para editar manualmente."
                                            : "Selecione uma turma primeiro"
                                    }
                                />
                                {generatingNumero && (
                                    <div className="absolute right-3 top-9">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Data de Nascimento"
                                type="date"
                                value={formData.data_nascimento}
                                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                            />
                            <div>
                                <label className="form-label">Género</label>
                                <select
                                    value={formData.genero}
                                    onChange={(e) => setFormData({ ...formData, genero: e.target.value as '' | 'M' | 'F' })}
                                    className="form-input min-h-touch"
                                >
                                    <option value="">Selecione</option>
                                    <option value="M">Masculino</option>
                                    <option value="F">Feminino</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Nacionalidade"
                                type="text"
                                value={formData.nacionalidade}
                                onChange={(e) => setFormData({ ...formData, nacionalidade: e.target.value })}
                                placeholder="Angolana"
                            />
                            <Input
                                label="Naturalidade"
                                type="text"
                                value={formData.naturalidade}
                                onChange={(e) => setFormData({ ...formData, naturalidade: e.target.value })}
                                placeholder="Luanda"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Tipo de Documento</label>
                                <select
                                    value={formData.tipo_documento}
                                    onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
                                    className="form-input min-h-touch"
                                >
                                    <option value="">Selecione</option>
                                    <option value="BI">Bilhete de Identidade</option>
                                    <option value="Passaporte">Passaporte</option>
                                    <option value="Cédula">Cédula</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>
                            <Input
                                label="Nº do Documento"
                                type="text"
                                value={formData.numero_documento}
                                onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                                placeholder="000000000LA000"
                            />
                        </div>

                        <div>
                            <label className="form-label">Turma *</label>
                            <select
                                value={formData.turma_id}
                                onChange={(e) => setFormData({ ...formData, turma_id: e.target.value })}
                                className="form-input min-h-touch"
                                required
                            >
                                <option value="">Selecione uma turma</option>
                                {turmas.map((turma) => (
                                    <option key={turma.id} value={turma.id}>
                                        {turma.nome}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )

            case 'encarregado':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Nome do Pai"
                                type="text"
                                value={formData.nome_pai}
                                onChange={(e) => setFormData({ ...formData, nome_pai: e.target.value })}
                                placeholder="Nome completo do pai"
                            />
                            <Input
                                label="Nome da Mãe"
                                type="text"
                                value={formData.nome_mae}
                                onChange={(e) => setFormData({ ...formData, nome_mae: e.target.value })}
                                placeholder="Nome completo da mãe"
                            />
                        </div>

                        <div className="border-t border-slate-200 pt-4 mt-4">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Encarregado de Educação</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    label="Nome do Encarregado"
                                    type="text"
                                    value={formData.nome_encarregado}
                                    onChange={(e) => setFormData({ ...formData, nome_encarregado: e.target.value })}
                                    placeholder="Nome completo"
                                />
                                <div>
                                    <label className="form-label">Parentesco</label>
                                    <select
                                        value={formData.parentesco_encarregado}
                                        onChange={(e) => setFormData({ ...formData, parentesco_encarregado: e.target.value })}
                                        className="form-input min-h-touch"
                                    >
                                        <option value="">Selecione</option>
                                        <option value="Pai">Pai</option>
                                        <option value="Mãe">Mãe</option>
                                        <option value="Avô/Avó">Avô/Avó</option>
                                        <option value="Tio/Tia">Tio/Tia</option>
                                        <option value="Irmão/Irmã">Irmão/Irmã</option>
                                        <option value="Outro">Outro</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <Input
                                    label="Telefone"
                                    type="tel"
                                    value={formData.telefone_encarregado}
                                    onChange={(e) => setFormData({ ...formData, telefone_encarregado: e.target.value })}
                                    placeholder="+244 9XX XXX XXX"
                                />
                                <Input
                                    label="Email"
                                    type="email"
                                    value={formData.email_encarregado}
                                    onChange={(e) => setFormData({ ...formData, email_encarregado: e.target.value })}
                                    placeholder="email@exemplo.com"
                                />
                            </div>

                            <div className="mt-4">
                                <Input
                                    label="Profissão do Encarregado"
                                    type="text"
                                    value={formData.profissao_encarregado}
                                    onChange={(e) => setFormData({ ...formData, profissao_encarregado: e.target.value })}
                                    placeholder="Ex: Professor, Engenheiro, etc."
                                />
                            </div>
                        </div>
                    </div>
                )

            case 'endereco':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Província"
                                type="text"
                                value={formData.provincia}
                                onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                                placeholder="Luanda"
                            />
                            <Input
                                label="Município"
                                type="text"
                                value={formData.municipio}
                                onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                                placeholder="Talatona"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Bairro/Comuna"
                                type="text"
                                value={formData.bairro}
                                onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                                placeholder="Nome do bairro"
                            />
                            <Input
                                label="Rua/Avenida"
                                type="text"
                                value={formData.rua}
                                onChange={(e) => setFormData({ ...formData, rua: e.target.value })}
                                placeholder="Rua e número"
                            />
                        </div>

                        <div>
                            <label className="form-label">Referência/Complemento</label>
                            <textarea
                                value={formData.endereco}
                                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                                placeholder="Ponto de referência ou informações adicionais"
                                className="form-input min-h-[80px] resize-none"
                                rows={3}
                            />
                        </div>
                    </div>
                )

            case 'academico':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Ano de Ingresso"
                                type="number"
                                value={formData.ano_ingresso}
                                onChange={(e) => setFormData({ ...formData, ano_ingresso: e.target.value })}
                                placeholder="2024"
                            />
                            <Input
                                label="Classe Anterior"
                                type="text"
                                value={formData.classe_anterior}
                                onChange={(e) => setFormData({ ...formData, classe_anterior: e.target.value })}
                                placeholder="5ª Classe"
                            />
                        </div>

                        <Input
                            label="Escola Anterior"
                            type="text"
                            value={formData.escola_anterior}
                            onChange={(e) => setFormData({ ...formData, escola_anterior: e.target.value })}
                            placeholder="Nome da escola de origem"
                        />

                        <div>
                            <label className="form-label">Observações Académicas</label>
                            <textarea
                                value={formData.observacoes_academicas}
                                onChange={(e) => setFormData({ ...formData, observacoes_academicas: e.target.value })}
                                placeholder="Informações relevantes sobre o histórico académico do aluno"
                                className="form-input min-h-[100px] resize-none"
                                rows={4}
                            />
                        </div>
                    </div>
                )
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="mt-4 text-slate-600">Carregando alunos...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900">Alunos</h2>
                    <p className="text-sm md:text-base text-slate-600 mt-1">Gerencie os alunos das suas turmas</p>
                </div>
                <Button
                    variant="primary"
                    icon={<Icons.UserPlus />}
                    onClick={() => setShowModal(true)}
                    className="w-full sm:w-auto"
                >
                    Novo Aluno
                </Button>
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

            {/* Filter */}
            <Card>
                <CardBody className="p-3 md:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <label className="text-sm font-medium text-slate-700 flex-shrink-0">Filtrar por turma:</label>
                        <select
                            value={selectedTurma}
                            onChange={(e) => setSelectedTurma(e.target.value)}
                            className="form-input min-h-touch flex-1 sm:max-w-xs"
                        >
                            <option value="all">Todas as turmas</option>
                            {turmas.map((turma) => (
                                <option key={turma.id} value={turma.id}>
                                    {turma.nome}
                                </option>
                            ))}
                        </select>
                        <span className="text-sm text-slate-600">
                            {alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'}
                        </span>
                    </div>
                </CardBody>
            </Card>

            {/* Alunos List */}
            {alunos.length === 0 ? (
                <Card>
                    <CardBody className="text-center py-8 md:py-12">
                        <svg className="w-12 h-12 md:w-16 md:h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <h3 className="text-base md:text-lg font-semibold text-slate-900 mb-2">Nenhum aluno encontrado</h3>
                        <p className="text-sm md:text-base text-slate-600 mb-4">Adicione alunos às suas turmas</p>
                        <Button variant="primary" onClick={() => setShowModal(true)} className="w-full sm:w-auto">
                            Adicionar Primeiro Aluno
                        </Button>
                    </CardBody>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <h3 className="text-lg font-semibold text-slate-900">Lista de Alunos</h3>
                            {alunos.length > 0 && (
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
                        {filteredAlunos.length === 0 ? (
                            <div className="text-center py-8">
                                <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <p className="text-slate-600">Nenhum aluno encontrado</p>
                                <p className="text-sm text-slate-500 mt-1">Tente pesquisar com outros termos</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3">
                                    {filteredAlunos.map((aluno) => (
                                        <div
                                            key={aluno.id}
                                            className="group relative bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:border-primary-300 hover:-translate-y-0.5"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex-shrink-0">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:shadow-lg transition-shadow">
                                                        {getStudentInitials(aluno.nome_completo)}
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-slate-900 text-base truncate">
                                                        {aluno.nome_completo}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-sm text-slate-500">
                                                            Nº {aluno.numero_processo}
                                                        </p>
                                                        {aluno.turma?.nome && (
                                                            <>
                                                                <span className="text-slate-300">•</span>
                                                                <p className="text-sm text-slate-500 truncate">
                                                                    {aluno.turma.nome}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex-shrink-0 flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditClick(aluno)}
                                                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 min-h-touch min-w-touch flex items-center justify-center"
                                                        title="Editar aluno"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(aluno.id)}
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
                                                Mostrando {filteredAlunos.length} de {alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'}
                                            </>
                                        ) : (
                                            <>
                                                Total: {alunos.length} {alunos.length === 1 ? 'aluno' : 'alunos'}
                                            </>
                                        )}
                                    </p>
                                </div>
                            </>
                        )}
                    </CardBody>
                </Card>
            )}

            {/* New Student Modal with Tabs */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center md:p-4 z-50 animate-fade-in">
                    <Card className="w-full md:max-w-2xl md:rounded-lg rounded-t-2xl rounded-b-none md:rounded-b-lg animate-slide-up max-h-[95vh] overflow-hidden flex flex-col">
                        <CardHeader className="flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-900">Novo Aluno</h3>
                                <button
                                    onClick={closeModal}
                                    className="text-slate-400 hover:text-slate-600 min-h-touch min-w-touch flex items-center justify-center -mr-2"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
                                <TabButton tab="pessoal" label="Pessoal" icon={<Icons.User />} />
                                <TabButton tab="encarregado" label="Encarregado" icon={<Icons.Users />} />
                                <TabButton tab="endereco" label="Endereço" icon={<Icons.Home />} />
                                <TabButton tab="academico" label="Acadêmico" icon={<Icons.ClipboardList />} />
                            </div>
                        </CardHeader>
                        <CardBody className="flex-1 overflow-y-auto">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {renderTabContent()}

                                <div className="flex gap-3 pt-4 border-t border-slate-200 mt-6">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={closeModal}
                                        className="flex-1"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button type="submit" variant="primary" className="flex-1">
                                        Adicionar Aluno
                                    </Button>
                                </div>
                            </form>
                        </CardBody>
                    </Card>
                </div>
            )}

            {/* Edit Student Modal with Tabs */}
            {showEditModal && selectedAluno && (
                <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center md:p-4 z-50 animate-fade-in">
                    <Card className="w-full md:max-w-2xl md:rounded-lg rounded-t-2xl rounded-b-none md:rounded-b-lg animate-slide-up max-h-[95vh] overflow-hidden flex flex-col">
                        <CardHeader className="flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-900">Editar Aluno</h3>
                                <button
                                    onClick={closeEditModal}
                                    className="text-slate-400 hover:text-slate-600 min-h-touch min-w-touch flex items-center justify-center -mr-2"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
                                <TabButton tab="pessoal" label="Pessoal" icon={<Icons.User />} />
                                <TabButton tab="encarregado" label="Encarregado" icon={<Icons.Users />} />
                                <TabButton tab="endereco" label="Endereço" icon={<Icons.Home />} />
                                <TabButton tab="academico" label="Acadêmico" icon={<Icons.ClipboardList />} />
                            </div>
                        </CardHeader>
                        <CardBody className="flex-1 overflow-y-auto">
                            <form onSubmit={handleUpdateStudent} className="space-y-4">
                                {renderTabContent(true)}

                                <div className="flex gap-3 pt-4 border-t border-slate-200 mt-6">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={closeEditModal}
                                        className="flex-1"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button type="submit" variant="primary" className="flex-1">
                                        Salvar Alterações
                                    </Button>
                                </div>
                            </form>
                        </CardBody>
                    </Card>
                </div>
            )}

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={showConfirmDelete}
                onClose={() => {
                    setShowConfirmDelete(false)
                    setAlunoToDelete(null)
                }}
                onConfirm={handleConfirmDelete}
                title="Excluir Aluno?"
                message="Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita."
                confirmText="Sim, Excluir"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    )
}
