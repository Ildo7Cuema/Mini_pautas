/**
 * @component SettingsPage
 * @description Página de configurações moderna mobile-first para SUPERADMIN
 * @tokens [--color-primary, --fs-md, min-h-touch]
 * @responsive true
 * @tested-on [375x667, 768x1024, 1440x900]
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { translateError } from '../utils/translations'
import { useAuth } from '../contexts/AuthContext'
import { isSuperAdmin } from '../utils/permissions'

export const SettingsPage: React.FC = () => {
    const { profile } = useAuth()
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const isSuperAdminUser = profile ? isSuperAdmin(profile) : false

    useEffect(() => {
        loadUserData()
    }, [])

    const loadUserData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            setFullName(user.user_metadata?.full_name || '')
            setEmail(user.email || '')
        }
    }

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                data: { full_name: fullName }
            })

            if (updateError) throw updateError

            setSuccess('Perfil actualizado com sucesso!')
            loadUserData()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao actualizar perfil'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            if (newPassword !== confirmPassword) {
                throw new Error('As palavras-passe não coincidem')
            }

            if (newPassword.length < 6) {
                throw new Error('A palavra-passe deve ter pelo menos 6 caracteres')
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (updateError) throw updateError

            setSuccess('Palavra-passe alterada com sucesso!')
            setNewPassword('')
            setConfirmPassword('')
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao alterar palavra-passe'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
    }

    return (
        <div className="min-h-screen bg-neutral-50 pb-24 md:pb-8">
            {/* Header with Gradient - Only for SUPERADMIN */}
            {isSuperAdminUser ? (
                <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 text-white px-4 py-6 md:px-8 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
                    </div>

                    <div className="relative animate-fade-in">
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                            <span className="text-3xl">⚙️</span>
                            Configurações
                        </h1>
                        <p className="text-slate-300 mt-1 text-sm md:text-base">
                            Perfil e segurança do SUPERADMIN
                        </p>
                    </div>
                </div>
            ) : (
                <div className="px-4 md:px-8 pt-6 pb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-neutral-800 flex items-center gap-3">
                        <span className="text-3xl">⚙️</span>
                        Configurações
                    </h1>
                    <p className="text-neutral-500 mt-1 text-sm">Gerencie seu perfil e preferências</p>
                </div>
            )}

            <div className={`px-4 md:px-8 ${isSuperAdminUser ? '-mt-4' : 'mt-4'} space-y-4 max-w-3xl`}>
                {/* Messages */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 animate-slide-up">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">⚠️</span>
                            <p className="text-red-800 text-sm flex-1">{error}</p>
                            <button onClick={() => setError(null)} className="text-red-600 font-bold">×</button>
                        </div>
                    </div>
                )}
                {success && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 animate-slide-up">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">✅</span>
                            <p className="text-emerald-800 text-sm flex-1">{success}</p>
                            <button onClick={() => setSuccess(null)} className="text-emerald-600 font-bold">×</button>
                        </div>
                    </div>
                )}

                {/* Profile Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden animate-slide-up">
                    <div className="bg-gradient-to-r from-neutral-50 to-neutral-100 px-5 py-4 border-b border-neutral-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                                <span className="text-xl">👤</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-neutral-800">Informações do Perfil</h3>
                                <p className="text-xs text-neutral-500">Dados pessoais da conta</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-5">
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Nome Completo
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">👤</span>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Seu nome completo"
                                        required
                                        className="w-full pl-11 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Email
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">📧</span>
                                    <input
                                        type="email"
                                        value={email}
                                        disabled
                                        className="w-full pl-11 pr-4 py-3 border border-neutral-200 rounded-xl bg-neutral-50 text-neutral-500 text-sm cursor-not-allowed"
                                    />
                                </div>
                                <p className="text-xs text-neutral-500 mt-1.5">O email não pode ser alterado</p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-semibold disabled:opacity-50 transition-all touch-feedback"
                            >
                                {loading ? 'A guardar...' : 'Guardar Alterações'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Password Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden animate-slide-up" style={{ animationDelay: '50ms' }}>
                    <div className="bg-gradient-to-r from-neutral-50 to-neutral-100 px-5 py-4 border-b border-neutral-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                <span className="text-xl">🔐</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-neutral-800">Alterar Palavra-passe</h3>
                                <p className="text-xs text-neutral-500">Segurança da conta</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-5">
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Nova Palavra-passe
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">🔒</span>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full pl-11 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                                    />
                                </div>
                                <p className="text-xs text-neutral-500 mt-1.5">Mínimo de 6 caracteres</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">
                                    Confirmar Nova Palavra-passe
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">🔒</span>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full pl-11 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-semibold disabled:opacity-50 transition-all touch-feedback"
                            >
                                {loading ? 'A alterar...' : 'Alterar Palavra-passe'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* System Preferences - Only for regular users */}
                {!isSuperAdminUser && (
                    <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden animate-slide-up" style={{ animationDelay: '100ms' }}>
                        <div className="bg-gradient-to-r from-neutral-50 to-neutral-100 px-5 py-4 border-b border-neutral-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                    <span className="text-xl">🎛️</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-neutral-800">Preferências do Sistema</h3>
                                    <p className="text-xs text-neutral-500">Configurações académicas</p>
                                </div>
                            </div>
                        </div>
                        <div className="divide-y divide-neutral-100">
                            <div className="flex items-center justify-between p-4 gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-neutral-800 text-sm">Escala de Notas</p>
                                    <p className="text-xs text-neutral-500">Sistema angolano (0-20)</p>
                                </div>
                                <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full flex-shrink-0">
                                    Padrão
                                </span>
                            </div>

                            <div className="flex items-center justify-between p-4 gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-neutral-800 text-sm">Ano Lectivo Actual</p>
                                    <p className="text-xs text-neutral-500">2025</p>
                                </div>
                                <button className="px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg font-medium transition-colors touch-feedback">
                                    Editar
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-neutral-800 text-sm">Trimestre Actual</p>
                                    <p className="text-xs text-neutral-500">1º Trimestre</p>
                                </div>
                                <button className="px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg font-medium transition-colors touch-feedback">
                                    Editar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Session Management - SUPERADMIN only */}
                {isSuperAdminUser && (
                    <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden animate-slide-up" style={{ animationDelay: '100ms' }}>
                        <div className="bg-gradient-to-r from-neutral-50 to-neutral-100 px-5 py-4 border-b border-neutral-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                                    <span className="text-xl">🛡️</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-neutral-800">Segurança da Sessão</h3>
                                    <p className="text-xs text-neutral-500">Gestão de sessões activas</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-5">
                            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4">
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">ℹ️</span>
                                    <div>
                                        <p className="font-medium text-violet-800 text-sm">Sessão Actual</p>
                                        <p className="text-xs text-violet-600 mt-1">
                                            Ligado desde {new Date().toLocaleDateString('pt-AO')} às {new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-500 mb-2">
                                Por motivos de segurança, considere terminar a sessão ao finalizar o trabalho.
                            </p>
                        </div>
                    </div>
                )}

                {/* Account Actions */}
                <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden animate-slide-up" style={{ animationDelay: '150ms' }}>
                    <div className="bg-gradient-to-r from-neutral-50 to-neutral-100 px-5 py-4 border-b border-neutral-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                <span className="text-xl">🚪</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-neutral-800">Acções da Conta</h3>
                                <p className="text-xs text-neutral-500">Terminar sessão</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-5">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold transition-all touch-feedback"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Sair da Conta</span>
                        </button>
                    </div>
                </div>

                {/* App Info */}
                <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 text-center animate-slide-up" style={{ animationDelay: '200ms' }}>
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-3xl">📚</span>
                    </div>
                    <p className="font-bold text-neutral-800">EduGest Angola</p>
                    <p className="text-sm text-neutral-500 mt-1">Versão 1.0.0</p>
                    <p className="text-xs text-neutral-400 mt-3">
                        Sistema de Gestão Escolar para Angola
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                        © 2025 Todos os direitos reservados
                    </p>
                </div>
            </div>
        </div>
    )
}

export default SettingsPage
