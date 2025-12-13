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

    // If in school registration mode, show the SchoolRegistration component
    if (mode === 'school-registration') {
        return (
            <SchoolRegistration
                onSuccess={() => {
                    // After successful registration, user will be logged in automatically
                    // The AuthContext will handle the redirect
                }}
                onCancel={() => setMode('login')}
            />
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
                    <h1 className="text-3xl font-bold text-slate-800 mb-1 tracking-tight">Mini-Pautas</h1>
                    <p className="text-slate-600 text-sm font-medium">Sistema de Gestão de Notas</p>
                </div>

                {/* Auth Card */}
                <Card className="animate-slide-up shadow-xl backdrop-blur-sm bg-white/90 border border-white/20">
                    <CardBody className="p-6">
                        {/* Mode Tabs */}
                        <div className="flex gap-2 mb-5 p-1 bg-slate-100 rounded-lg">
                            <button
                                onClick={() => setMode('login')}
                                className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all duration-200 ${mode === 'login'
                                    ? 'bg-white text-primary-600 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Entrar
                            </button>
                            <button
                                onClick={() => setMode('school-registration')}
                                className={`flex-1 py-2 px-3 rounded-md font-semibold text-xs sm:text-sm transition-all duration-200 ${mode === 'school-registration'
                                    ? 'bg-white text-primary-600 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Cadastrar Escola
                            </button>
                        </div>

                        <h2 className="text-lg font-bold text-slate-900 mb-4">
                            Bem-vindo de volta!
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
                            {/* Email */}
                            <Input
                                label="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu.email@exemplo.com"
                                required
                                autoComplete="email"
                                icon={<Icons.Email />}
                            />

                            {/* Password */}
                            <Input
                                label="Senha"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
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
                                icon={<Icons.Login />}
                            >
                                {loading ? 'Processando...' : 'Entrar'}
                            </Button>
                        </form>

                        {/* Forgot Password */}
                        <div className="mt-5 text-center">
                            <a href="#" className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors">
                                Esqueceu a senha?
                            </a>
                        </div>

                        {/* Switch to School Registration */}
                        <div className="mt-5 text-center text-xs text-slate-600">
                            É uma escola?{' '}
                            <button
                                type="button"
                                onClick={() => setMode('school-registration')}
                                className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                            >
                                Cadastre-se aqui
                            </button>
                        </div>
                    </CardBody>
                </Card>

                {/* Footer */}
                <div className="mt-6 text-center text-slate-600 text-xs space-y-1">
                    <p>© 2025 Mini-Pautas · Sistema para professores angolanos</p>
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
