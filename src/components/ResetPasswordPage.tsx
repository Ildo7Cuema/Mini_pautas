/*
component-meta:
  name: ResetPasswordPage
  description: Premium password reset page with native-like mobile experience
  tokens: [--color-primary, --fs-md, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Card, CardBody } from './ui/Card'
import { Icons } from './ui/Icons'
import { translateError } from '../utils/translations'

export const ResetPasswordPage: React.FC = () => {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        // Check if we have a valid session from the reset link
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setError('Link de recuperação inválido ou expirado. Por favor, solicite um novo link.')
            }
        })
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        // Validate passwords
        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres')
            setLoading(false)
            return
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem')
            setLoading(false)
            return
        }

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            })

            if (updateError) throw updateError

            setSuccess(true)

            // Redirect to login after 3 seconds
            setTimeout(() => {
                window.location.href = '/'
            }, 3000)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/80 to-indigo-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
                {/* Animated Background Blobs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="blob blob-1 w-[500px] h-[500px] -top-32 -right-32" />
                    <div className="blob blob-2 w-[400px] h-[400px] -bottom-24 -left-24" />
                    <div className="blob blob-3 w-[350px] h-[350px] top-1/3 left-1/4 opacity-25" />
                </div>

                <div className="w-full max-w-md relative z-10">
                    <div className="auth-card rounded-2xl animate-fade-in shadow-xl">
                        <CardBody className="p-8 text-center">
                            <div className="success-ring inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                                <svg className="success-checkmark w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Senha Atualizada!</h2>
                            <p className="text-slate-600 mb-6 leading-relaxed">
                                Sua senha foi atualizada com sucesso. Você será redirecionado para a página de login em instantes.
                            </p>
                            <div className="flex flex-col items-center gap-3">
                                <div className="spinner-gradient w-8 h-8 rounded-full mask-linear"></div>
                                <span className="text-xs text-slate-400 font-medium animate-pulse">Redirecionando...</span>
                            </div>
                        </CardBody>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/80 to-indigo-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="blob blob-1 w-[500px] h-[500px] -top-32 -right-32" />
                <div className="blob blob-2 w-[400px] h-[400px] -bottom-24 -left-24" />
                <div className="blob blob-3 w-[350px] h-[350px] top-1/3 left-1/4 opacity-25" />
            </div>

            {/* Subtle Pattern */}
            <div
                className="absolute inset-0 opacity-[0.015] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
            />

            <div className="w-full max-w-md relative z-10">
                {/* Logo and Title */}
                <div className="text-center mb-8 animate-fade-in">
                    <div className="logo-container inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-5">
                        <svg className="w-11 h-11 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">EduGest Angola</h1>
                    <p className="text-slate-500 font-medium">Redefinição de Segurança</p>
                </div>

                {/* Reset Password Card */}
                <div className="auth-card rounded-2xl animate-slide-up">
                    <CardBody className="p-6 sm:p-8">
                        <div className="mb-6">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
                                Criar Nova Senha
                            </h2>
                            <p className="text-slate-500 text-sm">
                                Escolha uma senha forte para proteger sua conta
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-start gap-3 p-4 mb-5 bg-red-50 border border-red-100 rounded-xl animate-slide-down form-error-shake" role="alert">
                                <div className="flex-shrink-0 w-5 h-5 mt-0.5 text-red-500">
                                    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <p className="text-sm text-red-700 font-medium">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* New Password */}
                            <div className="input-glow rounded-xl">
                                <Input
                                    label="Nova Senha"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="new-password"
                                    icon={<Icons.Lock />}
                                    helpText="Mínimo de 6 caracteres"
                                    inputSize="md"
                                />
                            </div>

                            {/* Confirm Password */}
                            <div className="input-glow rounded-xl">
                                <Input
                                    label="Confirmar Senha"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="new-password"
                                    icon={<Icons.Check />}
                                    inputSize="md"
                                />
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                loading={loading}
                                fullWidth
                                className="btn-premium mt-2 !py-3.5 !text-base font-semibold"
                                icon={<Icons.Check />}
                            >
                                {loading ? 'Atualizando...' : 'Definir Nova Senha'}
                            </Button>
                        </form>

                        {/* Back to Login */}
                        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                            <a
                                href="/"
                                className="inline-flex items-center text-sm text-slate-500 hover:text-primary-600 font-medium transition-colors group"
                            >
                                <svg className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Voltar para o login
                            </a>
                        </div>
                    </CardBody>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center space-y-2">
                    <p className="text-slate-500 text-sm">
                        © 2025 EduGest Angola
                    </p>
                </div>
            </div>
        </div>
    )
}
