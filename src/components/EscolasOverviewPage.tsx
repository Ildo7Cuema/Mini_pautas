import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchEscolasDoMunicipio, fetchEscolaStats, updateEscolaInfo } from '../utils/direcaoMunicipal'
import type { Escola, EscolaStats } from '../types'

interface EscolasOverviewPageProps {
    onNavigate?: (page: string, params?: Record<string, any>) => void
}

export default function EscolasOverviewPage({ onNavigate }: EscolasOverviewPageProps) {
    const { direcaoMunicipalProfile } = useAuth()
    const [loading, setLoading] = useState(true)
    const [escolas, setEscolas] = useState<Escola[]>([])
    const [escolaStats, setEscolaStats] = useState<Record<string, EscolaStats>>({})
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedEscola, setSelectedEscola] = useState<Escola | null>(null)
    const [showEditModal, setShowEditModal] = useState(false)

    const municipio = direcaoMunicipalProfile?.municipio || ''

    useEffect(() => {
        loadEscolas()
    }, [municipio])

    const loadEscolas = async () => {
        if (!municipio) return

        setLoading(true)
        try {
            const escolasData = await fetchEscolasDoMunicipio(municipio)
            setEscolas(escolasData)

            // Load stats for each escola
            const statsMap: Record<string, EscolaStats> = {}
            for (const escola of escolasData) {
                try {
                    const stats = await fetchEscolaStats(escola.id)
                    statsMap[escola.id] = stats
                } catch (err) {
                    console.error(`Error loading stats for escola ${escola.id}:`, err)
                }
            }
            setEscolaStats(statsMap)
        } catch (error) {
            console.error('Error loading escolas:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleEditEscola = (escola: Escola) => {
        setSelectedEscola(escola)
        setShowEditModal(true)
    }

    const handleSaveEscolaEdit = async (updates: Partial<Escola>) => {
        if (!selectedEscola) return

        try {
            await updateEscolaInfo(selectedEscola.id, updates)
            await loadEscolas()
            setShowEditModal(false)
            setSelectedEscola(null)
        } catch (error) {
            console.error('Error updating escola:', error)
            alert('Erro ao atualizar escola. Por favor, tente novamente.')
        }
    }

    const filteredEscolas = escolas.filter(escola =>
        escola.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        escola.codigo_escola?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6 pb-24 md:pb-6 animate-fade-in">
            {/* Modern Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950 rounded-2xl p-6 md:p-8 text-white shadow-xl">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-sm text-white/60 mb-3">
                        <button
                            onClick={() => onNavigate?.('dashboard')}
                            className="hover:text-white transition-colors"
                        >
                            Dashboard
                        </button>
                        <span>→</span>
                        <span className="text-white/90">Escolas</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                            <span className="text-3xl">🏫</span>
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white drop-shadow-lg" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                Escolas do Município
                            </h1>
                            <p className="text-white/80 font-medium mt-1">
                                Gestão e supervisão de {municipio}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Stats */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Pesquisar escola por nome ou código..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-shadow hover:shadow-md"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            🔍
                        </span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 px-5 py-3 rounded-xl shadow-lg">
                        <div className="text-2xl font-bold text-white">{escolas.length}</div>
                        <div className="text-xs text-blue-100 font-medium">Total</div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-3 rounded-xl shadow-lg">
                        <div className="text-2xl font-bold text-white">
                            {escolas.filter(e => e.ativo).length}
                        </div>
                        <div className="text-xs text-emerald-100 font-medium">Activas</div>
                    </div>
                </div>
            </div>

            {/* Escolas Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : filteredEscolas.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <span className="text-4xl">🏫</span>
                    </div>
                    <p className="text-slate-500">Nenhuma escola encontrada</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEscolas.map((escola) => {
                        const stats = escolaStats[escola.id]
                        return (
                            <div
                                key={escola.id}
                                className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${escola.bloqueado ? 'border-red-300 bg-red-50/50' :
                                    !escola.ativo ? 'border-slate-200 bg-slate-50/50 opacity-75' :
                                        'border-slate-200'
                                    }`}
                            >
                                {/* Card Header */}
                                <div className="p-4 border-b border-slate-100">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-slate-900 truncate">
                                                {escola.nome}
                                            </h3>
                                            <p className="text-sm text-slate-500">
                                                {escola.codigo_escola || 'Sem código'}
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            {escola.bloqueado && (
                                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Bloqueada</span>
                                            )}
                                            {!escola.ativo && !escola.bloqueado && (
                                                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">Inactiva</span>
                                            )}
                                            {escola.ativo && !escola.bloqueado && (
                                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Activa</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Card Stats */}
                                <div className="p-4 grid grid-cols-3 gap-3 text-center bg-slate-50/50">
                                    <div>
                                        <div className="font-bold text-slate-900">
                                            {stats?.total_turmas || 0}
                                        </div>
                                        <div className="text-xs text-slate-500">Turmas</div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">
                                            {stats?.total_alunos || 0}
                                        </div>
                                        <div className="text-xs text-slate-500">Alunos</div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">
                                            {stats?.total_professores || 0}
                                        </div>
                                        <div className="text-xs text-slate-500">Prof.</div>
                                    </div>
                                </div>

                                {/* Card Performance */}
                                <div className="px-4 py-3 flex items-center justify-between text-sm border-t border-slate-100">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-6 h-6 bg-indigo-100 rounded flex items-center justify-center text-xs">📊</span>
                                        <span className="text-slate-600">
                                            Média: <strong className="text-indigo-600">{stats?.media_geral?.toFixed(1) || '0.0'}</strong>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center text-xs">✅</span>
                                        <span className="text-slate-600">
                                            <strong className="text-emerald-600">{stats?.taxa_aprovacao || 0}%</strong>
                                        </span>
                                    </div>
                                </div>

                                {/* Card Actions */}
                                <div className="px-4 pb-4 flex gap-2">
                                    <button
                                        onClick={() => handleEditEscola(escola)}
                                        className="flex-1 px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors text-sm font-medium"
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button
                                        onClick={() => onNavigate?.('escola-detail', { escolaId: escola.id })}
                                        className="flex-1 px-3 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium"
                                    >
                                        👁️ Detalhes
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && selectedEscola && (
                <EscolaEditModal
                    escola={selectedEscola}
                    onClose={() => {
                        setShowEditModal(false)
                        setSelectedEscola(null)
                    }}
                    onSave={handleSaveEscolaEdit}
                />
            )}
        </div>
    )
}

// Escola Edit Modal Component
function EscolaEditModal({
    escola,
    onClose,
    onSave
}: {
    escola: Escola
    onClose: () => void
    onSave: (updates: Partial<Escola>) => Promise<void>
}) {
    const [formData, setFormData] = useState({
        nome: escola.nome,
        email: escola.email || '',
        telefone: escola.telefone || '',
        endereco: escola.endereco || '',
        codigo_escola: escola.codigo_escola || ''
    })
    const [saving, setSaving] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            await onSave(formData)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                        ✏️ Editar Escola
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome da Escola
                        </label>
                        <input
                            type="text"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Código da Escola
                        </label>
                        <input
                            type="text"
                            value={formData.codigo_escola}
                            onChange={(e) => setFormData({ ...formData, codigo_escola: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Telefone
                        </label>
                        <input
                            type="tel"
                            value={formData.telefone}
                            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Endereço
                        </label>
                        <textarea
                            value={formData.endereco}
                            onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {saving ? 'A guardar...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
