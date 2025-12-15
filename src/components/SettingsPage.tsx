/*
component-meta:
  name: SettingsPage
  description: User settings and preferences page
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

export const SettingsPage: React.FC = () => {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

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

            setSuccess('Perfil atualizado com sucesso!')
            loadUserData()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar perfil'
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
                throw new Error('As senhas não coincidem')
            }

            if (newPassword.length < 6) {
                throw new Error('A senha deve ter pelo menos 6 caracteres')
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (updateError) throw updateError

            setSuccess('Senha alterada com sucesso!')
            setNewPassword('')
            setConfirmPassword('')
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao alterar senha'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
    }

    return (
        <div className="space-y-4 md:space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">Configurações</h2>
                <p className="text-sm md:text-base text-slate-600 mt-1">Gerencie seu perfil e preferências</p>
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

            {/* Profile Settings */}
            <Card>
                <CardHeader>
                    <h3 className="text-base md:text-lg font-semibold text-slate-900">Informações do Perfil</h3>
                </CardHeader>
                <CardBody>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <Input
                            label="Nome Completo"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Seu nome completo"
                            required
                            icon={<Icons.User />}
                        />

                        <Input
                            label="Email"
                            type="email"
                            value={email}
                            disabled
                            helpText="O email não pode ser alterado"
                            icon={<Icons.Email />}
                        />

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                variant="primary"
                                loading={loading}
                                className="w-full sm:w-auto"
                            >
                                Salvar Alterações
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>

            {/* Password Change */}
            <Card>
                <CardHeader>
                    <h3 className="text-base md:text-lg font-semibold text-slate-900">Alterar Senha</h3>
                </CardHeader>
                <CardBody>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <Input
                            label="Nova Senha"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            helpText="Mínimo de 6 caracteres"
                            icon={<Icons.Lock />}
                        />

                        <Input
                            label="Confirmar Nova Senha"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            icon={<Icons.Lock />}
                        />

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                variant="primary"
                                loading={loading}
                                className="w-full sm:w-auto"
                            >
                                Alterar Senha
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>

            {/* System Preferences */}
            <Card>
                <CardHeader>
                    <h3 className="text-base md:text-lg font-semibold text-slate-900">Preferências do Sistema</h3>
                </CardHeader>
                <CardBody>
                    <div className="space-y-0">
                        <div className="flex items-center justify-between py-3 border-b border-slate-200 gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm md:text-base font-medium text-slate-900">Escala de Notas</p>
                                <p className="text-xs md:text-sm text-slate-600">Sistema angolano (0-20)</p>
                            </div>
                            <span className="badge badge-primary text-xs flex-shrink-0">Padrão</span>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-slate-200 gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm md:text-base font-medium text-slate-900">Ano Lectivo Atual</p>
                                <p className="text-xs md:text-sm text-slate-600">2025</p>
                            </div>
                            <Button variant="ghost" size="sm" className="min-h-touch flex-shrink-0">Editar</Button>
                        </div>

                        <div className="flex items-center justify-between py-3 gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm md:text-base font-medium text-slate-900">Trimestre Atual</p>
                                <p className="text-xs md:text-sm text-slate-600">1º Trimestre</p>
                            </div>
                            <Button variant="ghost" size="sm" className="min-h-touch flex-shrink-0">Editar</Button>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Account Actions */}
            <Card>
                <CardHeader>
                    <h3 className="text-base md:text-lg font-semibold text-slate-900">Ações da Conta</h3>
                </CardHeader>
                <CardBody>
                    <div className="space-y-3">
                        <Button
                            variant="danger"
                            onClick={handleLogout}
                            className="w-full sm:w-auto"
                            icon={
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            }
                        >
                            Sair da Conta
                        </Button>
                    </div>
                </CardBody>
            </Card>

            {/* App Info */}
            <Card>
                <CardBody className="text-center py-6">
                    <p className="text-sm text-slate-600 mb-2">EduGest Angola v1.0.0</p>
                    <p className="text-xs text-slate-500">
                        Sistema de Gestão de Notas para Professores Angolanos
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                        © 2025 EduGest Angola. Todos os direitos reservados.
                    </p>
                </CardBody>
            </Card>
        </div>
    )
}
