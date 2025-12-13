
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Card, CardBody } from './ui/Card'
import { Icons } from './ui/Icons'
import { translateError } from '../utils/translations'

export const ProfessorRegistration: React.FC = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
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
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <Card className="max-w-md w-full animate-slide-up shadow-xl">
                    <CardBody className="p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Icons.Check className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Cadastro Realizado!</h2>
                        <p className="text-slate-600 mb-6">
                            Sua conta foi criada com sucesso. Verifique seu email para confirmar o cadastro (se necessário) ou faça login.
                        </p>
                        <Button
                            variant="primary"
                            onClick={() => window.location.href = '/'}
                        >
                            Ir para Login
                        </Button>
                    </CardBody>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Blob Animation */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-6 animate-fade-in">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
                        <Icons.UserPlus className="w-8 h-8 text-primary-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-1">Convite de Professor</h1>
                    <p className="text-slate-600 text-sm font-medium">Crie sua senha para acessar o sistema</p>
                </div>

                <Card className="animate-slide-up shadow-xl backdrop-blur-sm bg-white/90 border border-white/20">
                    <CardBody className="p-6">
                        {error && (
                            <div className="alert alert-error mb-4 animate-slide-down">
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu.email@exemplo.com"
                                required
                                disabled={true} // Email should be fixed from invite
                                icon={<Icons.Email />}
                            />

                            <Input
                                label="Crie sua Senha"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                icon={<Icons.Lock />}
                            />

                            <Button
                                type="submit"
                                variant="primary"
                                loading={loading}
                                fullWidth
                                className="mt-4"
                            >
                                Criar Conta e Acessar
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            </div>
        </div>
    )
}
