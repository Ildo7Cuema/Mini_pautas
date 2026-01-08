import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
    fetchMunicipioStats,
    fetchSolicitacoes,
    fetchSolicitacaoStats,
    updateSolicitacaoStatus
} from '../utils/direcaoMunicipal'
import { getEstadoLabel, formatDataSolicitacao } from '../utils/solicitacoes'
import type { MunicipioStats, SolicitacaoDocumento, SolicitacaoStats, EstadoSolicitacao } from '../types'

interface DirecaoMunicipalDashboardProps {
    onNavigate?: (page: string, params?: Record<string, any>) => void
}

export default function DirecaoMunicipalDashboard({ onNavigate }: DirecaoMunicipalDashboardProps) {
    const { direcaoMunicipalProfile, profile } = useAuth()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<MunicipioStats | null>(null)
    const [solicitacoes, setSolicitacoes] = useState<SolicitacaoDocumento[]>([])
    const [solicitacaoStats, setSolicitacaoStats] = useState<SolicitacaoStats | null>(null)
    const [processingId, setProcessingId] = useState<string | null>(null)

    const municipio = direcaoMunicipalProfile?.municipio || ''
    const provincia = direcaoMunicipalProfile?.provincia || ''

    useEffect(() => {
        loadData()
    }, [municipio])

    const loadData = async () => {
        if (!municipio) return

        setLoading(true)
        try {
            const [statsData, solicitacoesData, solStatsData] = await Promise.all([
                fetchMunicipioStats(municipio),
                fetchSolicitacoes({ limit: 10 }),
                fetchSolicitacaoStats()
            ])

            setStats(statsData)
            setSolicitacoes(solicitacoesData)
            setSolicitacaoStats(solStatsData)
        } catch (error) {
            console.error('Error loading dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleQuickAction = async (solicitacaoId: string, action: 'approve' | 'analyze') => {
        setProcessingId(solicitacaoId)
        try {
            const estado: EstadoSolicitacao = action === 'approve' ? 'aprovado' : 'em_analise'
            await updateSolicitacaoStatus(solicitacaoId, estado)
            await loadData()
        } catch (error) {
            console.error('Error updating solicitação:', error)
        } finally {
            setProcessingId(null)
        }
    }

    if (!direcaoMunicipalProfile) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="text-6xl mb-4">🏛️</div>
                    <h2 className="text-xl font-semibold text-gray-700">
                        Perfil de Direção Municipal não encontrado
                    </h2>
                    <p className="text-gray-500 mt-2">
                        Por favor, contacte o administrador do sistema.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-24 md:pb-6 animate-fade-in">
            {/* Modern Header with Gradient */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 rounded-2xl p-6 md:p-8 text-white shadow-xl">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 shadow-lg">
                            <span className="text-3xl">🏛️</span>
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white drop-shadow-lg" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                Direção Municipal de Educação
                            </h1>
                            <p className="text-white/80 font-medium mt-1">
                                {municipio}, {provincia}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/60">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full backdrop-blur-sm">
                            <span>👤</span>
                            <span className="font-medium text-white/90">{direcaoMunicipalProfile.nome}</span>
                        </div>
                        <span className="hidden md:inline text-white/40">•</span>
                        <span className="hidden md:inline text-white/70">{direcaoMunicipalProfile.cargo}</span>
                    </div>
                </div>
            </div>

            {
                loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <>
                        {/* Statistics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
                            <StatCard
                                icon="🏫"
                                label="Escolas"
                                value={stats?.total_escolas || 0}
                                subLabel={`${stats?.escolas_ativas || 0} activas`}
                                color="blue"
                            />
                            <StatCard
                                icon="👨‍🎓"
                                label="Alunos"
                                value={stats?.total_alunos || 0}
                                subLabel={`♂ ${stats?.alunos_masculino || 0} • ♀ ${stats?.alunos_feminino || 0}`}
                                color="green"
                            />
                            <StatCard
                                icon="👨‍🏫"
                                label="Professores"
                                value={stats?.total_professores || 0}
                                subLabel={`♂ ${stats?.professores_masculino || 0} • ♀ ${stats?.professores_feminino || 0}`}
                                color="purple"
                            />
                            <StatCard
                                icon="👥"
                                label="Funcionários"
                                value={stats?.total_funcionarios || 0}
                                subLabel={`♂ ${stats?.funcionarios_masculino || 0} • ♀ ${stats?.funcionarios_feminino || 0}`}
                                color="gray"
                            />
                            <StatCard
                                icon="📋"
                                label="Solicitações"
                                value={solicitacaoStats?.pendentes || 0}
                                subLabel="Pendentes"
                                color={(solicitacaoStats?.pendentes || 0) > 0 ? 'red' : 'gray'}
                                highlight={(solicitacaoStats?.pendentes || 0) > 0}
                            />
                        </div>

                        {/* Performance Stats - Secondary Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-slate-600 font-medium">Total de Turmas</span>
                                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                        <span className="text-xl">📚</span>
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-slate-900 tracking-tight">
                                    {stats?.total_turmas || 0}
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-slate-600 font-medium">Média Geral</span>
                                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                                        <span className="text-xl">📊</span>
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-slate-900 tracking-tight">
                                    {stats?.media_geral?.toFixed(1) || '0.0'}
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-slate-600 font-medium">Taxa de Aprovação</span>
                                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                        <span className="text-xl">✅</span>
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-slate-900 tracking-tight">
                                    {stats?.taxa_aprovacao || 0}%
                                </div>
                            </div>
                        </div>

                        {/* Two Column Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Recent Requests */}
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                                        <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">📋</span>
                                        Solicitações Recentes
                                    </h2>
                                    <button
                                        onClick={() => onNavigate?.('solicitacoes')}
                                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium hover:underline flex items-center gap-1"
                                    >
                                        Ver Todas
                                        <span>→</span>
                                    </button>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {solicitacoes.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-3 flex items-center justify-center">📭</div>
                                            Nenhuma solicitação encontrada
                                        </div>
                                    ) : (
                                        solicitacoes.slice(0, 5).map((sol) => {
                                            const estadoInfo = getEstadoLabel(sol.estado)
                                            return (
                                                <div key={sol.id} className="p-4 hover:bg-slate-50 transition-colors">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                {sol.urgente && (
                                                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                                                )}
                                                                <span className="font-medium text-slate-900 truncate">
                                                                    {sol.assunto}
                                                                </span>
                                                            </div>
                                                            <div className="text-sm text-slate-500 truncate">
                                                                {sol.solicitante_nome} • {sol.escola?.nome}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${estadoInfo.bgColor} ${estadoInfo.color}`}>
                                                                    {estadoInfo.label}
                                                                </span>
                                                                <span className="text-xs text-slate-400">
                                                                    {formatDataSolicitacao(sol.created_at)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {sol.estado === 'pendente' && (
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => handleQuickAction(sol.id, 'analyze')}
                                                                    disabled={processingId === sol.id}
                                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                                                                    title="Marcar em análise"
                                                                >
                                                                    🔍
                                                                </button>
                                                                <button
                                                                    onClick={() => handleQuickAction(sol.id, 'approve')}
                                                                    disabled={processingId === sol.id}
                                                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                                                                    title="Aprovar"
                                                                >
                                                                    ✅
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="space-y-6">
                                {/* Actions */}
                                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                    <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">⚡</span>
                                        Acesso Rápido
                                    </h2>
                                    <div className="grid grid-cols-2 gap-3">
                                        <ActionButton
                                            icon="🏫"
                                            label="Escolas"
                                            onClick={() => onNavigate?.('escolas')}
                                        />
                                        <ActionButton
                                            icon="📋"
                                            label="Solicitações"
                                            onClick={() => onNavigate?.('solicitacoes')}
                                            badge={solicitacaoStats?.pendentes}
                                        />
                                        <ActionButton
                                            icon="📊"
                                            label="Supervisão"
                                            onClick={() => onNavigate?.('supervisao-pedagogica')}
                                        />
                                        <ActionButton
                                            icon="👥"
                                            label="Funcionários"
                                            onClick={() => onNavigate?.('funcionarios')}
                                        />
                                        <ActionButton
                                            icon="📢"
                                            label="Circulares"
                                            onClick={() => onNavigate?.('circulares')}
                                        />
                                        <ActionButton
                                            icon="📈"
                                            label="Relatórios"
                                            onClick={() => onNavigate?.('relatorios-municipais')}
                                        />
                                    </div>
                                </div>

                                {/* Top Schools by Performance */}
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                                        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                                            <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">🏆</span>
                                            Top Escolas
                                        </h2>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {stats?.estatisticas_por_escola
                                            .sort((a, b) => b.media_geral - a.media_geral)
                                            .slice(0, 5)
                                            .map((escola, index) => (
                                                <div key={escola.escola_id} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                        index === 1 ? 'bg-slate-200 text-slate-600' :
                                                            index === 2 ? 'bg-amber-100 text-amber-700' :
                                                                'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-slate-900 truncate text-sm">
                                                            {escola.escola_nome}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {escola.total_alunos} alunos
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-indigo-600">
                                                            {escola.media_geral.toFixed(1)}
                                                        </div>
                                                        <div className="text-xs text-emerald-600 font-medium">
                                                            {escola.taxa_aprovacao}%
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        {!stats?.estatisticas_por_escola?.length && (
                                            <div className="p-8 text-center text-slate-500">
                                                <div className="w-12 h-12 bg-slate-100 rounded-full mx-auto mb-3 flex items-center justify-center">🏫</div>
                                                Nenhuma escola encontrada
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )
            }
        </div >
    )
}

// Stat Card Component - Modern Design
function StatCard({
    icon,
    label,
    value,
    subLabel,
    color = 'blue',
    highlight = false
}: {
    icon: string
    label: string
    value: number
    subLabel?: string
    color?: 'blue' | 'green' | 'purple' | 'red' | 'gray'
    highlight?: boolean
}) {
    const colorConfig = {
        blue: {
            bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
            light: 'bg-blue-50 border-blue-100',
            text: 'text-white',
            subText: 'text-blue-100'
        },
        green: {
            bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
            light: 'bg-emerald-50 border-emerald-100',
            text: 'text-white',
            subText: 'text-emerald-100'
        },
        purple: {
            bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
            light: 'bg-purple-50 border-purple-100',
            text: 'text-white',
            subText: 'text-purple-100'
        },
        red: {
            bg: 'bg-gradient-to-br from-red-500 to-red-600',
            light: 'bg-red-50 border-red-100',
            text: 'text-white',
            subText: 'text-red-100'
        },
        gray: {
            bg: 'bg-gradient-to-br from-slate-500 to-slate-600',
            light: 'bg-slate-50 border-slate-100',
            text: 'text-white',
            subText: 'text-slate-200'
        }
    }

    const config = colorConfig[color]

    return (
        <div className={`relative rounded-2xl p-5 ${config.bg} ${config.text} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${highlight ? 'ring-2 ring-red-400 ring-offset-2' : ''}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <span className="text-2xl">{icon}</span>
                </div>
                {highlight && <span className="animate-pulse text-xl">⚠️</span>}
            </div>
            <div className="text-3xl font-bold mb-1 tracking-tight">
                {value.toLocaleString('pt-AO')}
            </div>
            <div className="text-sm font-medium opacity-90">{label}</div>
            {subLabel && (
                <div className={`text-xs mt-1 ${config.subText}`}>{subLabel}</div>
            )}
        </div>
    )
}

// Action Button Component - Modern Design
function ActionButton({
    icon,
    label,
    onClick,
    badge
}: {
    icon: string
    label: string
    onClick: () => void
    badge?: number
}) {
    return (
        <button
            onClick={onClick}
            className="relative p-4 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200 text-left group"
        >
            <div className="w-10 h-10 bg-slate-100 group-hover:bg-indigo-100 rounded-lg flex items-center justify-center mb-3 transition-colors">
                <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
            </div>
            <div className="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">{label}</div>
            {badge !== undefined && badge > 0 && (
                <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1 shadow-lg animate-pulse">
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
        </button>
    )
}
