/*
component-meta:
  name: ProfileSetupModal
  description: Modal for first-time professor profile setup
  tokens: [--color-primary, --fs-md, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { translateError } from '../utils/translations'

interface ProfileSetupModalProps {
    onComplete: () => void
}

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({ onComplete }) => {
    const [formData, setFormData] = useState({
        nome_completo: '',
        numero_agente: '',
        telefone: '',
        especialidade: '',
        escola_nome: '',
        escola_codigo: '',
        provincia: '',
        municipio: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuário não autenticado')

            // First, create or get escola
            let escolaId: string

            // Try to find existing escola by codigo
            const { data: existingEscola } = await supabase
                .from('escolas')
                .select('id')
                .eq('codigo_escola', formData.escola_codigo)
                .maybeSingle()

            if (existingEscola) {
                escolaId = existingEscola.id
            } else {
                // Create new escola
                const { data: newEscola, error: escolaError } = await supabase
                    .from('escolas')
                    .insert({
                        nome: formData.escola_nome,
                        codigo_escola: formData.escola_codigo,
                        provincia: formData.provincia,
                        municipio: formData.municipio,
                    })
                    .select('id')
                    .single()

                if (escolaError) throw escolaError
                if (!newEscola) throw new Error('Erro ao criar escola')

                escolaId = newEscola.id
            }

            // Create professor profile
            const { error: profError } = await supabase
                .from('professores')
                .insert({
                    escola_id: escolaId,
                    user_id: user.id,
                    nome_completo: formData.nome_completo,
                    numero_agente: formData.numero_agente,
                    email: user.email!,
                    telefone: formData.telefone || null,
                    especialidade: formData.especialidade || null,
                    funcoes: ['professor'],
                    ativo: true,
                })

            if (profError) throw profError

            // Success!
            onComplete()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao criar perfil'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                    <div className="text-center">
                        <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                            Bem-vindo ao EduGest Angola! 🎓
                        </h2>
                        <p className="text-sm md:text-base text-slate-600">
                            Complete seu perfil para começar a usar o sistema
                        </p>
                    </div>
                </CardHeader>
                <CardBody>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="alert alert-error">
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        {/* Professor Info */}
                        <div className="space-y-4">
                            <h3 className="text-base md:text-lg font-semibold text-slate-900 border-b pb-2">
                                Informações Pessoais
                            </h3>

                            <Input
                                label="Nome Completo"
                                type="text"
                                value={formData.nome_completo}
                                onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                                placeholder="Seu nome completo"
                                required
                            />

                            <Input
                                label="Número de Agente"
                                type="text"
                                value={formData.numero_agente}
                                onChange={(e) => setFormData({ ...formData, numero_agente: e.target.value })}
                                placeholder="Ex: AG123456"
                                required
                                helpText="Número único de identificação como professor"
                            />

                            <Input
                                label="Telefone"
                                type="tel"
                                value={formData.telefone}
                                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                placeholder="Ex: +244 923 456 789"
                            />

                            <Input
                                label="Especialidade"
                                type="text"
                                value={formData.especialidade}
                                onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
                                placeholder="Ex: Matemática, Física, etc."
                            />
                        </div>

                        {/* School Info */}
                        <div className="space-y-4">
                            <h3 className="text-base md:text-lg font-semibold text-slate-900 border-b pb-2">
                                Informações da Escola
                            </h3>

                            <Input
                                label="Nome da Escola"
                                type="text"
                                value={formData.escola_nome}
                                onChange={(e) => setFormData({ ...formData, escola_nome: e.target.value })}
                                placeholder="Ex: Escola Secundária de Luanda"
                                required
                            />

                            <Input
                                label="Código da Escola"
                                type="text"
                                value={formData.escola_codigo}
                                onChange={(e) => setFormData({ ...formData, escola_codigo: e.target.value })}
                                placeholder="Ex: ESL001"
                                required
                                helpText="Se a escola já existe, use o código existente"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Província"
                                    type="text"
                                    value={formData.provincia}
                                    onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                                    placeholder="Ex: Luanda"
                                    required
                                />

                                <Input
                                    label="Município"
                                    type="text"
                                    value={formData.municipio}
                                    onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                                    placeholder="Ex: Belas"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button
                                type="submit"
                                variant="primary"
                                loading={loading}
                                className="w-full md:w-auto"
                            >
                                Completar Perfil e Começar
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>
        </div>
    )
}
