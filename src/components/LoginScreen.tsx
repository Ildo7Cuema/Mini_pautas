/*
component-meta:
  name: LoginScreen
  description: Premium login screen with modern UI, mobile-first design, and native-like experience
  tokens: [--color-primary, --fs-md, min-h-touch]
  responsive: true
  tested-on: [360x800, 375x812, 768x1024, 1440x900]
*/

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Card, CardBody } from './ui/Card'
import { Icons } from './ui/Icons'
import { translateError } from '../utils/translations'
import { SchoolRegistration } from './SchoolRegistration'

type AuthMode = 'login' | 'signup' | 'school-registration'

export const LoginScreen: React.FC = () => {
    const [mode, setMode] = useState<AuthMode>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)
    const [resetEmail, setResetEmail] = useState('')
    const [resetLoading, setResetLoading] = useState(false)
    const [resetSuccess, setResetSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (signInError) throw signInError
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setResetLoading(true)
        setError(null)

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (resetError) throw resetError

            setResetSuccess(true)
            setTimeout(() => {
                setShowForgotPasswordModal(false)
                setResetSuccess(false)
                setResetEmail('')
            }, 3000)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro'
            setError(translateError(errorMessage))
        } finally {
            setResetLoading(false)
        }
    }

    // If in school registration mode, show the SchoolRegistration component
    if (mode === 'school-registration') {
        return (
            <SchoolRegistration
                onSuccess={() => {
                    // Voltar para a tela de login após cadastro bem-sucedido
                    setMode('login')
                }}
                onCancel={() => setMode('login')}
            />
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

            {/* Subtle Grid Pattern Overlay */}
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2 tracking-tight">
                        EduGest Angola
                    </h1>
                    <p className="text-slate-500 text-sm sm:text-base font-medium">
                        Sistema de Gestão Escolar
                    </p>
                </div>

                {/* Auth Card */}
                <div className="auth-card rounded-2xl animate-slide-up">
                    <CardBody className="p-6 sm:p-8">
                        {/* Mode Tabs */}
                        <div className="flex gap-2 mb-6 p-1.5 bg-slate-100/80 rounded-xl">
                            <button
                                onClick={() => setMode('login')}
                                className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${mode === 'login'
                                    ? 'bg-white text-primary-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Entrar
                            </button>
                            <button
                                onClick={() => setMode('school-registration')}
                                className="flex-1 py-2.5 px-3 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 text-slate-500 hover:text-slate-700"
                            >
                                Cadastrar Escola
                            </button>
                        </div>

                        {/* Welcome Text */}
                        <div className="mb-6">
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
                                Bem-vindo de volta!
                            </h2>
                            <p className="text-slate-500 text-sm">
                                Entre com as suas credenciais para continuar
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div
                                className="flex items-start gap-3 p-4 mb-5 bg-red-50 border border-red-100 rounded-xl animate-slide-down form-error-shake"
                                role="alert"
                            >
                                <div className="flex-shrink-0 w-5 h-5 mt-0.5 text-red-500">
                                    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <p className="text-sm text-red-700 font-medium">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email */}
                            <div className="input-glow rounded-xl">
                                <Input
                                    label="Email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu.email@exemplo.com"
                                    required
                                    autoComplete="email"
                                    icon={<Icons.Email />}
                                    inputSize="md"
                                />
                            </div>

                            {/* Password */}
                            <div className="input-glow rounded-xl">
                                <Input
                                    label="Senha"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                    icon={<Icons.Lock />}
                                    inputSize="md"
                                />
                            </div>

                            {/* Forgot Password Link */}
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForgotPasswordModal(true)
                                        setError(null)
                                        setResetSuccess(false)
                                    }}
                                    className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors hover:underline underline-offset-2"
                                >
                                    Esqueceu a senha?
                                </button>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                loading={loading}
                                fullWidth
                                className="btn-premium mt-2 !py-3.5 !text-base font-semibold"
                                icon={<Icons.Login />}
                            >
                                {loading ? 'Processando...' : 'Entrar'}
                            </Button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-white text-slate-400">ou</span>
                            </div>
                        </div>

                        {/* Switch to School Registration */}
                        <div className="text-center">
                            <p className="text-sm text-slate-500">
                                É uma escola?{' '}
                                <button
                                    type="button"
                                    onClick={() => setMode('school-registration')}
                                    className="text-primary-600 hover:text-primary-700 font-semibold transition-colors hover:underline underline-offset-2"
                                >
                                    Cadastre-se aqui
                                </button>
                            </p>
                        </div>
                    </CardBody>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center space-y-3">
                    {/* Tutorials Link */}
                    <a
                        href="/tutoriais"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 hover:bg-white rounded-xl text-sm font-medium text-primary-600 hover:text-primary-700 shadow-sm hover:shadow transition-all"
                    >
                        <span>📹</span>
                        Ver Tutoriais
                    </a>

                    <p className="text-slate-500 text-sm">
                        © 2025 EduGest Angola · Sistema de Gestão Escolar
                    </p>
                    <p className="text-slate-400 text-xs flex items-center justify-center gap-1">
                        Desenvolvido com
                        <span className="text-red-400 animate-pulse">❤</span>
                        para a educação
                    </p>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {showForgotPasswordModal && (
                <div className="modal-mobile-fullscreen">
                    <div className="modal-overlay" onClick={() => {
                        setShowForgotPasswordModal(false)
                        setError(null)
                        setResetEmail('')
                    }}>
                        <div
                            className="modal-content"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Card className="rounded-2xl shadow-2xl">
                                <CardBody className="p-6 sm:p-8">
                                    {resetSuccess ? (
                                        <div className="text-center py-4">
                                            <div className="success-ring inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-5">
                                                <svg className="success-checkmark w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">
                                                Email Enviado!
                                            </h3>
                                            <p className="text-slate-600 text-sm sm:text-base mb-2">
                                                Enviamos um link de recuperação para
                                            </p>
                                            <p className="text-primary-600 font-semibold mb-4">
                                                {resetEmail}
                                            </p>
                                            <p className="text-slate-400 text-sm">
                                                Verifique sua caixa de entrada e spam.
                                            </p>
                                            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                                Fechando automaticamente...
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Modal Header */}
                                            <div className="flex items-center justify-between mb-6">
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-900">
                                                        Recuperar Senha
                                                    </h3>
                                                    <p className="text-slate-500 text-sm mt-1">
                                                        Enviaremos um link para redefinir sua senha
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setShowForgotPasswordModal(false)
                                                        setError(null)
                                                        setResetEmail('')
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all touch-feedback"
                                                    aria-label="Fechar"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* Error in Modal */}
                                            {error && (
                                                <div
                                                    className="flex items-start gap-3 p-4 mb-5 bg-red-50 border border-red-100 rounded-xl animate-slide-down"
                                                    role="alert"
                                                >
                                                    <div className="flex-shrink-0 w-5 h-5 mt-0.5 text-red-500">
                                                        <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-sm text-red-700 font-medium">{error}</p>
                                                </div>
                                            )}

                                            <form onSubmit={handleForgotPassword} className="space-y-5">
                                                <div className="input-glow rounded-xl">
                                                    <Input
                                                        label="Email"
                                                        type="email"
                                                        value={resetEmail}
                                                        onChange={(e) => setResetEmail(e.target.value)}
                                                        placeholder="seu.email@exemplo.com"
                                                        required
                                                        autoComplete="email"
                                                        icon={<Icons.Email />}
                                                        inputSize="md"
                                                    />
                                                </div>

                                                <div className="flex gap-3 pt-2">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="lg"
                                                        onClick={() => {
                                                            setShowForgotPasswordModal(false)
                                                            setError(null)
                                                            setResetEmail('')
                                                        }}
                                                        fullWidth
                                                        className="!py-3"
                                                    >
                                                        Cancelar
                                                    </Button>
                                                    <Button
                                                        type="submit"
                                                        variant="primary"
                                                        size="lg"
                                                        loading={resetLoading}
                                                        fullWidth
                                                        className="btn-premium !py-3"
                                                        icon={<Icons.Send />}
                                                    >
                                                        {resetLoading ? 'Enviando...' : 'Enviar Link'}
                                                    </Button>
                                                </div>
                                            </form>
                                        </>
                                    )}
                                </CardBody>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
