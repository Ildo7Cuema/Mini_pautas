/*
component-meta:
  name: StaffPage
  description: Page for managing non-teaching staff (funcionários)
  tokens: [--color-primary, --fs-md, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Input } from './ui/Input'
import { Icons } from './ui/Icons'
import { translateError } from '../utils/translations'
import { ConfirmModal } from './ui/ConfirmModal'
import { useAuth } from '../contexts/AuthContext'
import { FuncionarioEscola } from '../types'

interface StaffPageProps {
    onNavigate?: (page: string) => void
    searchQuery?: string
}

export const StaffPage: React.FC<StaffPageProps> = ({ onNavigate: _onNavigate, searchQuery = '' }) => {

    const { escolaProfile } = useAuth()
    const [funcionarios, setFuncionarios] = useState<FuncionarioEscola[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showConfirmDelete, setShowConfirmDelete] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [selectedFuncionarioId, setSelectedFuncionarioId] = useState<string | null>(null)
    const [funcionarioToDelete, setFuncionarioToDelete] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'pessoal' | 'profissional'>('pessoal')

    // Form data
    const [formData, setFormData] = useState({
        // Pessoal
        nome_completo: '',
        email: '',
        telefone: '',
        genero: '' as '' | 'M' | 'F',
        data_nascimento: '',
        nif: '',

        // Profissional
        numero_funcionario: '',
        categoria: '' as FuncionarioEscola['categoria'] | '',
        subcategoria: '',
        cargo: '',
        departamento: '',
        data_admissao: '',
    })

    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (escolaProfile) {
            loadFuncionarios()
        }
    }, [escolaProfile])

    const loadFuncionarios = async () => {
        if (!escolaProfile) return

        try {
            setLoading(true)
            setError(null)

            const { data, error } = await supabase
                .from('funcionarios_escola')
                .select('*')
                .eq('escola_id', escolaProfile.id)
                .order('nome_completo', { ascending: true })

            if (error) throw error

            setFuncionarios(data || [])
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar funcionários'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!escolaProfile) return

        setError(null)
        setSuccess(null)
        setSubmitting(true)

        try {
            // Validate required fields
            if (!formData.nome_completo || !formData.categoria || !formData.subcategoria) {
                throw new Error('Nome, Categoria e Subcategoria são obrigatórios')
            }

            const funcionarioData = {
                // Pessoal
                nome_completo: formData.nome_completo,
                email: formData.email,
                telefone: formData.telefone,
                genero: formData.genero || null,
                data_nascimento: formData.data_nascimento || null,
                nif: formData.nif || null,

                // Profissional
                numero_funcionario: formData.numero_funcionario,
                categoria: formData.categoria,
                subcategoria: formData.subcategoria,
                cargo: formData.cargo,
                departamento: formData.departamento,
                data_admissao: formData.data_admissao || null,
            }

            if (editMode && selectedFuncionarioId) {
                // Update existing
                const { error: updateError } = await supabase
                    .from('funcionarios_escola')
                    .update(funcionarioData)
                    .eq('id', selectedFuncionarioId)

                if (updateError) throw updateError
                setSuccess('Funcionário atualizado com sucesso!')
            } else {
                // Create new
                const { error: insertError } = await supabase
                    .from('funcionarios_escola')
                    .insert({
                        escola_id: escolaProfile.id,
                        ativo: true,
                        ...funcionarioData
                    })

                if (insertError) {
                    throw insertError
                }

                setSuccess('Funcionário cadastrado com sucesso!')
            }

            setShowModal(false)
            resetForm()
            loadFuncionarios()
        } catch (err) {
            console.error('Erro ao salvar funcionário:', err)
            const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar funcionário'
            setError(translateError(errorMessage))
        } finally {
            setSubmitting(false)
        }
    }

    const resetForm = () => {
        setEditMode(false)
        setSelectedFuncionarioId(null)
        setActiveTab('pessoal')
        setFormData({
            nome_completo: '',
            email: '',
            telefone: '',
            genero: '',
            data_nascimento: '',
            nif: '',
            numero_funcionario: '',
            categoria: '',
            subcategoria: '',
            cargo: '',
            departamento: '',
            data_admissao: '',
        })
    }

    const handleEdit = (func: FuncionarioEscola) => {
        setEditMode(true)
        setSelectedFuncionarioId(func.id)
        setFormData({
            nome_completo: func.nome_completo,
            email: func.email || '',
            telefone: func.telefone || '',
            genero: func.genero || '',
            data_nascimento: func.data_nascimento || '',
            nif: func.nif || '',
            numero_funcionario: func.numero_funcionario || '',
            categoria: func.categoria as FuncionarioEscola['categoria'],
            subcategoria: func.subcategoria,
            cargo: func.cargo || '',
            departamento: func.departamento || '',
            data_admissao: func.data_admissao || '',
        })
        setShowModal(true)
    }

    const handleDeleteClick = (id: string) => {
        setFuncionarioToDelete(id)
        setShowConfirmDelete(true)
    }

    const handleConfirmDelete = async () => {
        if (!funcionarioToDelete) return

        try {
            const { error } = await supabase
                .from('funcionarios_escola')
                .delete()
                .eq('id', funcionarioToDelete)

            if (error) throw error

            setSuccess('Funcionário removido com sucesso!')
            setShowConfirmDelete(false)
            setFuncionarioToDelete(null)
            loadFuncionarios()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao remover funcionário'
            setError(translateError(errorMessage))
            setShowConfirmDelete(false)
            setFuncionarioToDelete(null)
        }
    }

    // Filter based on search query
    const filteredFuncionarios = funcionarios.filter(func =>
        func.nome_completo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        func.cargo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        func.subcategoria.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="space-y-6 animate-fade-in pb-24 md:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="skeleton w-12 h-12 rounded-xl"></div>
                        <div>
                            <div className="skeleton h-7 w-32 mb-2 rounded-lg"></div>
                            <div className="skeleton h-4 w-48 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4 md:space-y-6 pb-24 md:pb-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                        <Icons.Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-900">Funcionários</h2>
                        <p className="text-sm text-slate-500">Gestão administrativa e apoio</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        resetForm()
                        setShowModal(true)
                    }}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-medium rounded-xl transition-all duration-200 shadow-md shadow-indigo-500/25 min-h-touch touch-feedback w-full sm:w-auto"
                >
                    <Icons.UserPlus className="w-5 h-5" />
                    <span>Novo Funcionário</span>
                </button>
            </div>

            {/* Messages */}
            {success && (
                <div className="alert alert-success animate-slide-down">
                    <Icons.Check />
                    <span className="ml-2 text-sm">{success}</span>
                </div>
            )}

            {error && (
                <div className="alert alert-error animate-slide-down">
                    <span className="ml-2 text-sm">{error}</span>
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredFuncionarios.length === 0 && !error ? (
                <Card>
                    <CardBody className="text-center py-12 md:py-16 px-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Icons.Users className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">
                            {searchQuery ? 'Nenhum funcionário encontrado' : 'Nenhum funcionário cadastrado'}
                        </h3>
                        <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                            Cadastre funcionários administrativos, limpeza, segurança e outros.
                        </p>
                    </CardBody>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
                    {filteredFuncionarios.map((func) => (
                        <Card key={func.id} className="hover:shadow-lg transition-all duration-300 touch-feedback">
                            <CardBody className="p-4">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center text-lg font-bold text-slate-600 flex-shrink-0">
                                        {func.nome_completo.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-semibold text-slate-900 truncate">{func.nome_completo}</h3>
                                        <p className="text-xs text-slate-500 truncate">{func.cargo || func.subcategoria}</p>
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700`}>
                                                {func.categoria}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                                        <Icons.Briefcase className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                        <span className="text-sm text-slate-700 truncate">{func.subcategoria}</span>
                                    </div>
                                    {func.telefone && (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                                            <Icons.Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                            <span className="text-sm text-slate-700">{func.telefone}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-3 border-t border-slate-100">
                                    <button
                                        onClick={() => handleEdit(func)}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all duration-200 touch-feedback min-h-touch"
                                    >
                                        <Icons.Edit className="w-4 h-4" />
                                        <span>Editar</span>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(func.id)}
                                        className="flex items-center justify-center px-3 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl transition-all duration-200 touch-feedback min-h-touch"
                                    >
                                        <Icons.Trash className="w-4 h-4" />
                                    </button>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4 z-50 animate-fade-in">
                    <Card className="w-full md:max-w-md md:rounded-2xl rounded-t-2xl rounded-b-none md:rounded-b-2xl animate-slide-up max-h-[90vh] flow-root overflow-y-auto">
                        <CardHeader className="border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                        {editMode ? <Icons.Edit className="w-5 h-5 text-white" /> : <Icons.UserPlus className="w-5 h-5 text-white" />}
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900">{editMode ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowModal(false)
                                        resetForm()
                                    }}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors touch-feedback"
                                >
                                    <Icons.X className="w-5 h-5" />
                                </button>
                            </div>
                        </CardHeader>

                        <CardBody className="p-0">
                            <div className="flex border-b border-slate-100">
                                <button
                                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pessoal' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    onClick={() => setActiveTab('pessoal')}
                                >
                                    Pessoal
                                </button>
                                <button
                                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'profissional' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    onClick={() => setActiveTab('profissional')}
                                >
                                    Profissional
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                                {activeTab === 'pessoal' && (
                                    <div className="space-y-4 animate-fade-in">
                                        <Input
                                            label="Nome Completo *"
                                            type="text"
                                            value={formData.nome_completo}
                                            onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                                            placeholder="Ex: Maria José"
                                            required
                                        />

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Input
                                                label="Data de Nascimento"
                                                type="date"
                                                value={formData.data_nascimento}
                                                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                                            />
                                            <div>
                                                <label className="form-label">Género *</label>
                                                <select
                                                    value={formData.genero}
                                                    onChange={(e) => setFormData({ ...formData, genero: e.target.value as '' | 'M' | 'F' })}
                                                    className="form-input min-h-touch"
                                                    required
                                                >
                                                    <option value="">Selecione</option>
                                                    <option value="M">Masculino</option>
                                                    <option value="F">Feminino</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Input
                                                label="Email"
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="email@escola.com"
                                            />
                                            <Input
                                                label="Telefone"
                                                type="tel"
                                                value={formData.telefone}
                                                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                                placeholder="+244 9..."
                                            />
                                        </div>

                                        <Input
                                            label="NIF"
                                            type="text"
                                            value={formData.nif}
                                            onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                                            placeholder="Nº Identificação Fiscal"
                                        />
                                    </div>
                                )}

                                {activeTab === 'profissional' && (
                                    <div className="space-y-4 animate-fade-in">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="form-label">Categoria *</label>
                                                <select
                                                    value={formData.categoria}
                                                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value as FuncionarioEscola['categoria'] })}
                                                    className="form-input min-h-touch"
                                                    required
                                                >
                                                    <option value="">Selecione</option>
                                                    <option value="DIRECAO">Direção</option>
                                                    <option value="COORDENACAO">Coordenação</option>
                                                    <option value="ADMINISTRATIVO">Administrativo</option>
                                                    <option value="APOIO">Apoio (Limpeza/Segurança)</option>
                                                </select>
                                            </div>
                                            <Input
                                                label="Subcategoria *"
                                                type="text"
                                                value={formData.subcategoria}
                                                onChange={(e) => setFormData({ ...formData, subcategoria: e.target.value })}
                                                placeholder="Ex: Limpeza, Secretaria"
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Input
                                                label="Cargo"
                                                type="text"
                                                value={formData.cargo}
                                                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                                                placeholder="Ex: Chefe de Limpeza"
                                            />
                                            <Input
                                                label="Departamento"
                                                type="text"
                                                value={formData.departamento}
                                                onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                                                placeholder="Ex: Serviços Gerais"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Input
                                                label="Nº Funcionário"
                                                type="text"
                                                value={formData.numero_funcionario}
                                                onChange={(e) => setFormData({ ...formData, numero_funcionario: e.target.value })}
                                            />
                                            <Input
                                                label="Data Admissão"
                                                type="date"
                                                value={formData.data_admissao}
                                                onChange={(e) => setFormData({ ...formData, data_admissao: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowModal(false)
                                            resetForm()
                                        }}
                                        className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all duration-200 touch-feedback min-h-touch"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-medium rounded-xl transition-all duration-200 shadow-md shadow-indigo-500/25 disabled:opacity-50 touch-feedback min-h-touch"
                                    >
                                        {submitting ? (
                                            <>
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                A guardar...
                                            </>
                                        ) : (
                                            editMode ? 'Salvar' : 'Cadastrar'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </CardBody>
                    </Card>
                </div>
            )}

            <ConfirmModal
                isOpen={showConfirmDelete}
                onClose={() => {
                    setShowConfirmDelete(false)
                    setFuncionarioToDelete(null)
                }}
                onConfirm={handleConfirmDelete}
                title="Remover Funcionário?"
                message="Tem certeza que deseja remover este funcionário? Esta ação não pode ser desfeita."
                confirmText="Sim, Remover"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    )
}
