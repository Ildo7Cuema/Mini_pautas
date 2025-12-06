/*
component-meta:
  name: Dashboard
  description: Main dashboard with stats, recent classes, and quick actions
  tokens: [--color-primary, --fs-md, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { translateError } from '../utils/translations'
import type { User } from '@supabase/supabase-js'

interface DashboardStats {
    totalTurmas: number
    totalAlunos: number
    mediaGeral: number
    taxaAprovacao: number
}

interface RecentClass {
    id: string
    nome: string
    total_alunos: number
    media: number
}

interface DashboardProps {
    onNavigate?: (page: string) => void
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const [stats, setStats] = useState<DashboardStats>({
        totalTurmas: 0,
        totalAlunos: 0,
        mediaGeral: 0,
        taxaAprovacao: 0,
    })
    const [recentClasses, setRecentClasses] = useState<RecentClass[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [formData, setFormData] = useState({
        nome: '',
        ano_lectivo: new Date().getFullYear().toString(),
        trimestre_atual: 1,
    })

    useEffect(() => {
        loadUserData()
        loadDashboardData()
    }, [])

    const loadUserData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
    }

    const loadDashboardData = async () => {
        try {
            setLoading(true)

            // Get total turmas
            const { count: turmasCount, error: turmasError } = await supabase
                .from('turmas')
                .select('*', { count: 'exact', head: true })

            if (turmasError) throw turmasError

            // Get total alunos
            const { count: alunosCount, error: alunosError } = await supabase
                .from('alunos')
                .select('*', { count: 'exact', head: true })

            if (alunosError) throw alunosError

            // Get recent classes with student count
            const { data: turmasData, error: turmasDataError } = await supabase
                .from('turmas')
                .select(`
          id,
          nome,
          alunos(count)
        `)
                .order('created_at', { ascending: false })
                .limit(4)

            if (turmasDataError) throw turmasDataError

            const classesWithCount = turmasData?.map(turma => ({
                id: turma.id,
                nome: turma.nome,
                total_alunos: turma.alunos?.[0]?.count || 0,
                media: 0, // Will be calculated from grades when implemented
            })) || []

            setStats({
                totalTurmas: turmasCount || 0,
                totalAlunos: alunosCount || 0,
                mediaGeral: 0, // Will be calculated from grades
                taxaAprovacao: 0, // Will be calculated from grades
            })

            setRecentClasses(classesWithCount)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    const handleQuickAction = (action: string) => {
        if (action === 'new-class') {
            setShowCreateModal(true)
        } else if (onNavigate) {
            switch (action) {
                case 'grades':
                    onNavigate('grades')
                    break
                case 'reports':
                    onNavigate('reports')
                    break
            }
        }
    }

    const handleCreateTurma = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        try {
            setLoading(true)

            // Get current user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuário não autenticado')

            // Get professor profile
            const { data: professor, error: profError } = await supabase
                .from('professores')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (profError) throw profError
            if (!professor) throw new Error('Perfil de professor não encontrado')

            // Create turma
            const { error: insertError } = await supabase
                .from('turmas')
                .insert({
                    ...formData,
                    professor_id: professor.id,
                })

            if (insertError) throw insertError

            setShowCreateModal(false)
            setFormData({
                nome: '',
                ano_lectivo: new Date().getFullYear().toString(),
                trimestre_atual: 1,
            })
            loadDashboardData()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao criar turma'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="mt-4 text-slate-600">Carregando dashboard...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="alert alert-error">
                <span>{error}</span>
            </div>
        )
    }

    const statsData = [
        {
            title: 'Total de Turmas',
            value: stats.totalTurmas.toString(),
            change: '+0',
            changeType: 'positive' as const,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
        },
        {
            title: 'Total de Alunos',
            value: stats.totalAlunos.toString(),
            change: '+0',
            changeType: 'positive' as const,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
        },
        {
            title: 'Média Geral',
            value: stats.mediaGeral > 0 ? stats.mediaGeral.toFixed(1) : '--',
            change: '--',
            changeType: 'positive' as const,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
        },
        {
            title: 'Taxa de Aprovação',
            value: stats.taxaAprovacao > 0 ? `${stats.taxaAprovacao}%` : '--',
            change: '--',
            changeType: 'positive' as const,
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
    ]

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Welcome Section */}
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-1">
                    Bem-vindo de volta, {user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Professor'}!
                </h2>
                <p className="text-sm md:text-base text-slate-600">Aqui está um resumo das suas turmas e alunos</p>
            </div>

            {/* Stats Grid - 2 columns on mobile, 4 on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {statsData.map((stat, index) => (
                    <Card key={index} className="hover:shadow-lg transition-shadow">
                        <CardBody className="p-3 md:p-5">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs md:text-sm font-medium text-slate-600 mb-1 truncate">{stat.title}</p>
                                    <p className="text-xl md:text-3xl font-bold text-slate-900">{stat.value}</p>
                                    {stat.change !== '--' && (
                                        <div className="flex items-center gap-1 mt-2">
                                            <span className={`text-sm font-medium ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {stat.change}
                                            </span>
                                            <span className="text-xs text-slate-500">este mês</span>
                                        </div>
                                    )}
                                </div>
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 flex-shrink-0">
                                    {stat.icon}
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            {/* Recent Classes */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-900">Turmas Recentes</h3>
                        <button
                            onClick={() => onNavigate?.('classes')}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                            Ver todas
                        </button>
                    </div>
                </CardHeader>
                <CardBody className="p-0">
                    {recentClasses.length === 0 ? (
                        <div className="text-center py-8 md:py-12">
                            <p className="text-slate-600">Nenhuma turma encontrada</p>
                            <button
                                onClick={() => handleQuickAction('new-class')}
                                className="mt-4 text-primary-600 hover:text-primary-700 font-medium min-h-touch inline-flex items-center"
                            >
                                Criar sua primeira turma
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-slate-100">
                                {recentClasses.map((cls) => (
                                    <div key={cls.id} className="p-4 flex items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 truncate">{cls.nome}</p>
                                            <p className="text-sm text-slate-500">{cls.total_alunos} alunos</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {cls.media > 0 ? (
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls.media >= 14 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {cls.media.toFixed(1)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-sm">--</span>
                                            )}
                                            <button
                                                onClick={() => onNavigate?.('classes')}
                                                className="text-primary-600 p-2 min-h-touch min-w-touch flex items-center justify-center"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Turma</th>
                                            <th>Alunos</th>
                                            <th>Média</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentClasses.map((cls) => (
                                            <tr key={cls.id}>
                                                <td className="font-medium text-slate-900">{cls.nome}</td>
                                                <td className="text-slate-600">{cls.total_alunos} alunos</td>
                                                <td>
                                                    {cls.media > 0 ? (
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls.media >= 14 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                            {cls.media.toFixed(1)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm">--</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => onNavigate?.('classes')}
                                                        className="text-primary-600 hover:text-primary-700 text-sm font-medium min-h-touch inline-flex items-center"
                                                    >
                                                        Ver detalhes
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </CardBody>
            </Card>

            {/* Quick Actions - Horizontal scroll on mobile, grid on desktop */}
            <div className="flex md:grid md:grid-cols-3 gap-3 md:gap-6 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
                <Card
                    className="hover:shadow-lg transition-shadow cursor-pointer flex-shrink-0 w-40 md:w-auto"
                    onClick={() => handleQuickAction('new-class')}
                >
                    <CardBody className="p-4 md:p-6 text-center">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 mx-auto mb-2 md:mb-3">
                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <h4 className="font-semibold text-slate-900 mb-1 text-sm md:text-base">Nova Turma</h4>
                        <p className="text-xs md:text-sm text-slate-600 hidden md:block">Criar uma nova turma</p>
                    </CardBody>
                </Card>

                <Card
                    className="hover:shadow-lg transition-shadow cursor-pointer flex-shrink-0 w-40 md:w-auto"
                    onClick={() => handleQuickAction('grades')}
                >
                    <CardBody className="p-4 md:p-6 text-center">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 mx-auto mb-2 md:mb-3">
                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h4 className="font-semibold text-slate-900 mb-1 text-sm md:text-base">Lançar Notas</h4>
                        <p className="text-xs md:text-sm text-slate-600 hidden md:block">Registrar notas dos alunos</p>
                    </CardBody>
                </Card>

                <Card
                    className="hover:shadow-lg transition-shadow cursor-pointer flex-shrink-0 w-40 md:w-auto"
                    onClick={() => handleQuickAction('reports')}
                >
                    <CardBody className="p-4 md:p-6 text-center">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mx-auto mb-2 md:mb-3">
                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h4 className="font-semibold text-slate-900 mb-1 text-sm md:text-base">Gerar Relatório</h4>
                        <p className="text-xs md:text-sm text-slate-600 hidden md:block">Criar mini-pauta</p>
                    </CardBody>
                </Card>
            </div>
            {/* Create Class Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <Card className="w-full max-w-md animate-slide-up">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-900">Nova Turma</h3>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </CardHeader>
                        <CardBody>
                            <form onSubmit={handleCreateTurma} className="space-y-4">
                                <Input
                                    label="Nome da Turma"
                                    type="text"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    placeholder="Ex: 10ª A"
                                    required
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Ano Lectivo"
                                        type="number"
                                        value={formData.ano_lectivo}
                                        onChange={(e) => setFormData({ ...formData, ano_lectivo: e.target.value })}
                                        required
                                    />

                                    <div>
                                        <label className="form-label">Trimestre</label>
                                        <select
                                            value={formData.trimestre_atual}
                                            onChange={(e) => setFormData({ ...formData, trimestre_atual: parseInt(e.target.value) })}
                                            className="form-input"
                                        >
                                            <option value={1}>1º Trimestre</option>
                                            <option value={2}>2º Trimestre</option>
                                            <option value={3}>3º Trimestre</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button type="submit" variant="primary" loading={loading} className="flex-1">
                                        Criar Turma
                                    </Button>
                                </div>
                            </form>
                        </CardBody>
                    </Card>
                </div>
            )}
        </div >
    )
}
