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
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
                </div>

                <div className="w-full max-w-md relative z-10">
                    <Card className="animate-slide-up shadow-xl backdrop-blur-sm bg-white/90 border border-white/20">
                        <CardBody className="p-6 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Senha Atualizada!</h2>
                            <p className="text-slate-600 mb-4">
                                Sua senha foi atualizada com sucesso. Você será redirecionado para a página de login em instantes.
                            </p>
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                        </CardBody>
                    </Card>
                </div>

                <style>{`
                    @keyframes blob {
                        0%, 100% { 
                            transform: translate(0, 0) scale(1);
                            opacity: 0.3;
                        }
                        33% { 
                            transform: translate(40px, -60px) scale(1.15);
                            opacity: 0.4;
                        }
                        66% { 
                            transform: translate(-30px, 30px) scale(0.95);
                            opacity: 0.25;
                        }
                    }
                    .animate-blob {
                        animation: blob 8s ease-in-out infinite;
                    }
                    .animation-delay-2000 {
                        animation-delay: 2s;
                    }
                    .animation-delay-4000 {
                        animation-delay: 4s;
                    }
                `}</style>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo and Title */}
                <div className="text-center mb-6 animate-fade-in">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4 transform transition-all duration-300 hover:scale-110 hover:rotate-6 hover:shadow-xl">
                        <svg className="w-9 h-9 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-1 tracking-tight">EduGest Angola</h1>
                    <p className="text-slate-600 text-sm font-medium">Redefinir Senha</p>
                </div>

                {/* Reset Password Card */}
                <Card className="animate-slide-up shadow-xl backdrop-blur-sm bg-white/90 border border-white/20">
                    <CardBody className="p-6">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">
                            Criar Nova Senha
                        </h2>

                        {/* Error Message */}
                        {error && (
                            <div className="alert alert-error mb-4 animate-slide-down" role="alert">
                                <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* New Password */}
                            <Input
                                label="Nova Senha"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
                                icon={<Icons.Lock />}
                                helperText="Mínimo de 6 caracteres"
                            />

                            {/* Confirm Password */}
                            <Input
                                label="Confirmar Senha"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
                                icon={<Icons.Lock />}
                            />

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                variant="primary"
                                size="md"
                                loading={loading}
                                fullWidth
                                className="mt-5"
                                icon={<Icons.Check />}
                            >
                                {loading ? 'Atualizando...' : 'Atualizar Senha'}
                            </Button>
                        </form>

                        {/* Back to Login */}
                        <div className="mt-5 text-center">
                            <a href="/" className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors">
                                Voltar para o login
                            </a>
                        </div>
                    </CardBody>
                </Card>

                {/* Footer */}
                <div className="mt-6 text-center text-slate-600 text-xs space-y-1">
                    <p>© 2025 EduGest Angola · Sistema de Gestão Educacional</p>
                    <p className="text-slate-500">Desenvolvido com ❤️ para a educação</p>
                </div>
            </div>

            <style>{`
                @keyframes blob {
                    0%, 100% { 
                        transform: translate(0, 0) scale(1);
                        opacity: 0.3;
                    }
                    33% { 
                        transform: translate(40px, -60px) scale(1.15);
                        opacity: 0.4;
                    }
                    66% { 
                        transform: translate(-30px, 30px) scale(0.95);
                        opacity: 0.25;
                    }
                }
                .animate-blob {
                    animation: blob 8s ease-in-out infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </div>
    )
}
