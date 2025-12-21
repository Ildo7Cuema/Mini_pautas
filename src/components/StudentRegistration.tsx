/*
component-meta:
  name: StudentRegistration
  description: Premium student invite acceptance page
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

export const StudentRegistration: React.FC = () => {
    const [email, setEmail] = useState('')
    const [alunoId, setAlunoId] = useState<string | null>(null)
    const [studentName, setStudentName] = useState<string | null>(null)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [validating, setValidating] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        // Get params from URL
        const params = new URLSearchParams(window.location.search)
        const emailParam = params.get('email')
        const alunoIdParam = params.get('aluno_id')

        if (emailParam) setEmail(emailParam)
        if (alunoIdParam) setAlunoId(alunoIdParam)

        // Validate that aluno exists
        if (alunoIdParam) {
            validateAluno(alunoIdParam, emailParam || '')
        } else {
            setValidating(false)
            setError('Link de convite inválido. Por favor, solicite um novo convite.')
        }
    }, [])

    const validateAluno = async (id: string, expectedEmail: string) => {
        try {
            const { data, error } = await supabase
                .from('alunos')
                .select('id, nome_completo, email_encarregado, user_id')
                .eq('id', id)
                .maybeSingle()

            if (error) throw error

            if (!data) {
                setError('Aluno não encontrado. O link pode estar expirado.')
                return
            }

            if (data.user_id) {
                setError('Este aluno já possui uma conta registada. Faça login.')
                return
            }

            setStudentName(data.nome_completo)
        } catch (err) {
            console.error('Error validating aluno:', err)
            setError('Erro ao validar convite. Por favor, tente novamente.')
        } finally {
            setValidating(false)
        }
    }

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
            // Create auth user
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        tipo_perfil: 'ALUNO',
                        nome: studentName,
                    }
                }
            })

            if (signUpError) throw signUpError

            // Use RPC function to link user_id and create user_profile (bypasses RLS)
            if (authData.user && alunoId) {
                const { data: rpcResult, error: rpcError } = await supabase
                    .rpc('register_student_account', {
                        p_aluno_id: alunoId,
                        p_user_id: authData.user.id,
                        p_email: email
                    })

                if (rpcError) {
                    console.error('Error in register_student_account RPC:', rpcError)
                    // Don't fail completely - auth user was created
                } else if (rpcResult && !rpcResult.success) {
                    console.error('RPC returned error:', rpcResult.error)
                } else {
                    console.log('Successfully linked student account:', rpcResult)
                }
            }

            setSuccess(true)
        } catch (err: any) {
            const msg = err.message || 'Erro ao registrar'
            setError(translateError(msg))
        } finally {
            setLoading(false)
        }
    }

    if (validating) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/80 to-indigo-100 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="mt-4 text-slate-600">Validando convite...</p>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/80 to-indigo-100 flex items-center justify-center p-4">
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
                        <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Conta Criada!</h2>
                        <p className="text-slate-600 mb-6 leading-relaxed">
                            Sua conta de aluno foi criada com sucesso. Agora pode fazer login para ver as suas notas.
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/80 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="blob blob-1 w-[600px] h-[600px] -top-40 -right-40 opacity-30" />
                <div className="blob blob-2 w-[500px] h-[500px] -bottom-32 -left-32 opacity-30" />
                <div className="blob blob-3 w-[400px] h-[400px] top-1/2 left-1/2 opacity-20" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8 animate-fade-in">
                    <div className="logo-container inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
                        <Icons.User className="w-8 h-8 text-primary-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">Bem-vindo Aluno</h1>
                    {studentName && (
                        <p className="text-primary-600 font-semibold text-lg mb-1">{studentName}</p>
                    )}
                    <p className="text-slate-500 font-medium">Crie sua conta para acessar o EduGest</p>
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

                        {!error && (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="input-glow rounded-xl">
                                    <Input
                                        label="Email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="seu.email@exemplo.com"
                                        required
                                        disabled={true}
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
                                    {loading ? 'Criando Conta...' : 'Criar Minha Conta'}
                                </Button>
                            </form>
                        )}

                        {error && (
                            <Button
                                variant="ghost"
                                onClick={() => window.location.href = '/'}
                                fullWidth
                                className="mt-4"
                            >
                                Voltar para Login
                            </Button>
                        )}
                    </CardBody>
                </div>

                <div className="mt-8 text-center space-y-2">
                    <p className="text-slate-500 text-sm">
                        © 2025 EduGest Angola
                    </p>
                </div>
            </div>
        </div>
    )
}
