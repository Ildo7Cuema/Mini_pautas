import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Card, CardBody } from './ui/Card'
import { Icons } from './ui/Icons'
import { translateError } from '../utils/translations'

interface SchoolRegistrationForm {
    // Dados da Escola
    nome_escola: string
    codigo_escola: string
    provincia: string
    municipio: string
    endereco: string
    telefone: string
    email_escola: string

    // Dados do Responsável/Administrador
    nome_responsavel: string
    email_responsavel: string
    senha: string
    confirmar_senha: string
}

const PROVINCIAS_ANGOLA = [
    'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango',
    'Cuanza Norte', 'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla',
    'Luanda', 'Lunda Norte', 'Lunda Sul', 'Malanje', 'Moxico',
    'Namibe', 'Uíge', 'Zaire'
]

interface SchoolRegistrationProps {
    onSuccess?: () => void
    onCancel?: () => void
}

export const SchoolRegistration: React.FC<SchoolRegistrationProps> = ({ onSuccess, onCancel }) => {
    const [formData, setFormData] = useState<SchoolRegistrationForm>({
        nome_escola: '',
        codigo_escola: '',
        provincia: '',
        municipio: '',
        endereco: '',
        telefone: '',
        email_escola: '',
        nome_responsavel: '',
        email_responsavel: '',
        senha: '',
        confirmar_senha: ''
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [step, setStep] = useState(1) // 1: Dados da Escola, 2: Dados do Responsável

    const handleChange = (field: keyof SchoolRegistrationForm, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        setError(null)
    }

    const validateStep1 = (): boolean => {
        if (!formData.nome_escola.trim()) {
            setError('Nome da escola é obrigatório')
            return false
        }
        if (!formData.codigo_escola.trim()) {
            setError('Código da escola é obrigatório')
            return false
        }
        if (!formData.provincia) {
            setError('Província é obrigatória')
            return false
        }
        if (!formData.municipio.trim()) {
            setError('Município é obrigatório')
            return false
        }
        return true
    }

    const validateStep2 = (): boolean => {
        if (!formData.nome_responsavel.trim()) {
            setError('Nome do responsável é obrigatório')
            return false
        }
        if (!formData.email_responsavel.trim()) {
            setError('Email do responsável é obrigatório')
            return false
        }
        if (!formData.email_responsavel.includes('@')) {
            setError('Email inválido')
            return false
        }
        if (formData.senha.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres')
            return false
        }
        if (formData.senha !== formData.confirmar_senha) {
            setError('As senhas não coincidem')
            return false
        }
        return true
    }

    const handleNextStep = () => {
        if (validateStep1()) {
            setStep(2)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateStep2()) return

        setLoading(true)
        setError(null)

        try {
            // 1. Create user account
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email_responsavel,
                password: formData.senha,
                options: {
                    data: {
                        full_name: formData.nome_responsavel,
                        role: 'ESCOLA'
                    }
                }
            })

            if (authError) throw authError
            if (!authData.user) throw new Error('Erro ao criar conta de utilizador')

            // 2. Create escola record using RPC function (bypasses RLS)
            const { error: escolaError } = await supabase
                .rpc('register_escola', {
                    p_user_id: authData.user.id,
                    p_nome: formData.nome_escola,
                    p_codigo_escola: formData.codigo_escola,
                    p_provincia: formData.provincia,
                    p_municipio: formData.municipio,
                    p_endereco: formData.endereco || null,
                    p_telefone: formData.telefone || null,
                    p_email: formData.email_escola || formData.email_responsavel,
                    p_configuracoes: {}
                })

            if (escolaError) {
                // If escola creation fails, log the error
                console.error('Error creating escola:', escolaError)
                throw new Error(escolaError.message || 'Erro ao criar registro da escola. Por favor, contacte o suporte.')
            }

            // 3. Sign out the user so they can log in properly
            await supabase.auth.signOut()

            // 4. Show success message
            setSuccess(true)

            // 5. After 3 seconds, redirect to login
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess()
                }
            }, 3000)

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    // Success screen
    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <Card className="shadow-xl w-full max-w-md">
                    <CardBody className="p-8 text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-3">Cadastro Realizado com Sucesso!</h2>
                        <p className="text-slate-600 mb-6">
                            A escola <strong>{formData.nome_escola}</strong> foi registada com sucesso.
                            Verifique seu email para confirmar a conta.
                        </p>
                        <p className="text-sm text-slate-500 mb-4">
                            Redirecionando para a tela de login...
                        </p>
                        <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
                        <Button
                            variant="primary"
                            className="mt-6"
                            onClick={() => onSuccess?.()}
                            fullWidth
                        >
                            Ir para Login
                        </Button>
                    </CardBody>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
                        <Icons.School className="w-9 h-9 text-primary-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-1">Cadastro de Escola</h1>
                    <p className="text-slate-600 text-sm">Crie sua conta e comece a gerir as notas da sua escola</p>
                </div>

                {/* Progress Indicator */}
                <div className="mb-6">
                    <div className="flex items-center justify-center gap-2">
                        <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : 'text-slate-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-slate-200'}`}>
                                1
                            </div>
                            <span className="ml-2 text-sm font-medium hidden sm:inline">Dados da Escola</span>
                        </div>
                        <div className="w-12 h-0.5 bg-slate-300"></div>
                        <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : 'text-slate-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-slate-200'}`}>
                                2
                            </div>
                            <span className="ml-2 text-sm font-medium hidden sm:inline">Dados do Responsável</span>
                        </div>
                    </div>
                </div>

                <Card className="shadow-xl">
                    <CardBody className="p-6">
                        {/* Error Message */}
                        {error && (
                            <div className="alert alert-error mb-4" role="alert">
                                <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* Step 1: Dados da Escola */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    <h2 className="text-lg font-bold text-slate-900 mb-4">Informações da Escola</h2>

                                    <Input
                                        label="Nome da Escola *"
                                        type="text"
                                        value={formData.nome_escola}
                                        onChange={(e) => handleChange('nome_escola', e.target.value)}
                                        placeholder="Ex: Escola Secundária do 1º Ciclo"
                                        required
                                    />

                                    <Input
                                        label="Código da Escola *"
                                        type="text"
                                        value={formData.codigo_escola}
                                        onChange={(e) => handleChange('codigo_escola', e.target.value)}
                                        placeholder="Ex: ESC001"
                                        required
                                        helpText="Código único de identificação da escola"
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Província *
                                            </label>
                                            <select
                                                value={formData.provincia}
                                                onChange={(e) => handleChange('provincia', e.target.value)}
                                                className="input w-full"
                                                required
                                            >
                                                <option value="">Selecione a província</option>
                                                {PROVINCIAS_ANGOLA.map(prov => (
                                                    <option key={prov} value={prov}>{prov}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <Input
                                            label="Município *"
                                            type="text"
                                            value={formData.municipio}
                                            onChange={(e) => handleChange('municipio', e.target.value)}
                                            placeholder="Ex: Luanda"
                                            required
                                        />
                                    </div>

                                    <Input
                                        label="Endereço"
                                        type="text"
                                        value={formData.endereco}
                                        onChange={(e) => handleChange('endereco', e.target.value)}
                                        placeholder="Rua, Bairro, Número"
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label="Telefone"
                                            type="tel"
                                            value={formData.telefone}
                                            onChange={(e) => handleChange('telefone', e.target.value)}
                                            placeholder="+244 923 456 789"
                                        />

                                        <Input
                                            label="Email da Escola"
                                            type="email"
                                            value={formData.email_escola}
                                            onChange={(e) => handleChange('email_escola', e.target.value)}
                                            placeholder="escola@exemplo.ao"
                                        />
                                    </div>

                                    <div className="flex gap-3 mt-6">
                                        {onCancel && (
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={onCancel}
                                                fullWidth
                                            >
                                                Cancelar
                                            </Button>
                                        )}
                                        <Button
                                            type="button"
                                            variant="primary"
                                            onClick={handleNextStep}
                                            fullWidth
                                        >
                                            Próximo
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Dados do Responsável */}
                            {step === 2 && (
                                <div className="space-y-4">
                                    <h2 className="text-lg font-bold text-slate-900 mb-4">Dados do Responsável</h2>

                                    <Input
                                        label="Nome Completo do Responsável *"
                                        type="text"
                                        value={formData.nome_responsavel}
                                        onChange={(e) => handleChange('nome_responsavel', e.target.value)}
                                        placeholder="Nome completo"
                                        required
                                        icon={<Icons.User />}
                                    />

                                    <Input
                                        label="Email do Responsável *"
                                        type="email"
                                        value={formData.email_responsavel}
                                        onChange={(e) => handleChange('email_responsavel', e.target.value)}
                                        placeholder="responsavel@exemplo.com"
                                        required
                                        helpText="Este email será usado para fazer login no sistema"
                                        icon={<Icons.Email />}
                                    />

                                    <Input
                                        label="Senha *"
                                        type="password"
                                        value={formData.senha}
                                        onChange={(e) => handleChange('senha', e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        helpText="Mínimo de 6 caracteres"
                                        icon={<Icons.Lock />}
                                    />

                                    <Input
                                        label="Confirmar Senha *"
                                        type="password"
                                        value={formData.confirmar_senha}
                                        onChange={(e) => handleChange('confirmar_senha', e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        icon={<Icons.Lock />}
                                    />

                                    <div className="flex gap-3 mt-6">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setStep(1)}
                                            fullWidth
                                        >
                                            Voltar
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            loading={loading}
                                            fullWidth
                                        >
                                            {loading ? 'Criando conta...' : 'Criar Conta'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </form>
                    </CardBody>
                </Card>

                {/* Footer */}
                <div className="mt-6 text-center text-slate-600 text-xs">
                    <p>Ao criar uma conta, você concorda com os termos de uso do sistema</p>
                </div>
            </div>
        </div>
    )
}
