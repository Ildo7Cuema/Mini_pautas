/*
component-meta:
  name: SecretaryRegistration
  description: Premium secretary invite acceptance page
  tokens: [--color-primary, --fs-md, min-h-touch]
  responsive: true
*/

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { CardBody } from './ui/Card'
import { Icons } from './ui/Icons'
import { translateError } from '../utils/translations'

export const SecretaryRegistration: React.FC = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        // Get email from URL
        const params = new URLSearchParams(window.location.search)
        const emailParam = params.get('email')
        if (emailParam) {
            setEmail(emailParam)
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (password !== confirmPassword) {
            setError('As senhas não coincidem')
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres')
            setLoading(false)
            return
        }

        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
            })

            if (signUpError) throw signUpError

            setSuccess(true)
        } catch (err: any) {
            const msg = err.message || 'Erro ao registrar'
            setError(translateError(msg))
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/80 to-teal-100 flex items-center justify-center p-4">
                {/* Animated Background Blobs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="blob blob-1 w-[500px] h-[500px] -top-32 -right-32" />
                    <div className="blob blob-2 w-[400px] h-[400px] -bottom-24 -left-24" />
                </div>

                <div className="auth-card w-full max-w-md rounded-2xl animate-fade-in shadow-xl bg-white/95">
                    <CardBody className="p-8 text-center">
                        <div className="success-ring inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                            <svg className="success-checkmark w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Cadastro Realizado!</h2>
                        <p className="text-slate-600 mb-6 leading-relaxed">
                            Sua conta foi criada com sucesso. Verifique seu email para confirmar o cadastro ou faça login.
                        </p>
                        <Button
                            variant="primary"
                            className="btn-premium"
                            onClick={() => window.location.href = '/'}
                            fullWidth
                        >
                            Ir para Login
                        </Button>
                    </CardBody>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/80 to-teal-100 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="blob blob-1 w-[600px] h-[600px] -top-40 -right-40 opacity-30" />
                <div className="blob blob-2 w-[500px] h-[500px] -bottom-32 -left-32 opacity-30" />
                <div className="blob blob-3 w-[400px] h-[400px] top-1/2 left-1/2 opacity-20" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8 animate-fade-in">
                    <div className="logo-container inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
                        <Icons.UserPlus className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">Bem-vindo Secretário</h1>
                    <p className="text-slate-500 font-medium">Finalize seu cadastro para acessar o EduGest</p>
                </div>

                <div className="auth-card rounded-2xl animate-slide-up shadow-xl backdrop-blur-sm bg-white/90">
                    <CardBody className="p-6 sm:p-8">
                        {error && (
                            <div className="flex items-start gap-3 p-4 mb-6 bg-red-50 border border-red-100 rounded-xl animate-slide-down form-error-shake" role="alert">
                                <div className="flex-shrink-0 w-5 h-5 mt-0.5 text-red-500">
                                    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <p className="text-sm text-red-700 font-medium">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="input-glow rounded-xl">
                                <Input
                                    label="Email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu.email@exemplo.com"
                                    required
                                    disabled={true} // Email should be fixed from invite
                                    icon={<Icons.Email />}
                                    className="bg-slate-50 text-slate-500"
                                    inputSize="md"
                                />
                            </div>

                            <div className="input-glow rounded-xl">
                                <Input
                                    label="Crie sua Senha"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    helpText="Mínimo de 6 caracteres"
                                    icon={<Icons.Lock />}
                                    inputSize="md"
                                />
                            </div>

                            <div className="input-glow rounded-xl">
                                <Input
                                    label="Confirmar Senha"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    icon={<Icons.Check />}
                                    inputSize="md"
                                />
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                loading={loading}
                                fullWidth
                                className="btn-premium mt-4"
                                icon={<Icons.Login />}
                            >
                                {loading ? 'Criando Conta...' : 'Completar Cadastro'}
                            </Button>
                        </form>
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
