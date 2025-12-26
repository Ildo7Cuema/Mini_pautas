/*
component-meta:
  name: EscolaProfileSetupModal
  description: Modal for first-time escola profile setup after registration
  tokens: [--color-primary, --fs-md, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Button } from './ui/Button'
import { translateError } from '../utils/translations'
import { useAuth } from '../contexts/AuthContext'

interface EscolaProfileSetupModalProps {
    onComplete: () => void
}

export const EscolaProfileSetupModal: React.FC<EscolaProfileSetupModalProps> = ({ onComplete }) => {
    const { escolaProfile, refreshProfile } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleComplete = async () => {
        if (!escolaProfile?.id) {
            setError('Perfil da escola não encontrado')
            return
        }

        setLoading(true)
        setError(null)

        try {
            // Update escola configuracoes to mark profile as configured
            const currentConfig = escolaProfile.configuracoes || {}
            const updatedConfig = {
                ...currentConfig,
                perfil_configurado: true,
                data_configuracao: new Date().toISOString()
            }

            const { error: updateError } = await supabase
                .from('escolas')
                .update({ configuracoes: updatedConfig })
                .eq('id', escolaProfile.id)

            if (updateError) throw updateError

            // Refresh profile to get updated data
            await refreshProfile()

            // Success!
            onComplete()
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar perfil'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
            <Card className="w-full max-w-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary-500 to-primary-600 text-white">
                    <div className="text-center py-4">
                        <div className="text-5xl mb-4">🎓</div>
                        <h2 className="text-xl md:text-2xl font-bold mb-2">
                            Bem-vindo ao EduGest Angola!
                        </h2>
                        <p className="text-sm md:text-base text-white/90">
                            Complete seu perfil para começar a usar o sistema
                        </p>
                    </div>
                </CardHeader>
                <CardBody className="p-6 md:p-8">
                    {error && (
                        <div className="alert alert-error mb-6">
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {/* School info summary */}
                    <div className="space-y-4 mb-6">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                Sua Escola
                            </h3>
                            <div className="space-y-2">
                                <p className="text-lg font-bold text-slate-900">
                                    {escolaProfile?.nome || 'Nome da Escola'}
                                </p>
                                <p className="text-sm text-slate-600">
                                    Código: <span className="font-medium">{escolaProfile?.codigo_escola || '-'}</span>
                                </p>
                                <p className="text-sm text-slate-600">
                                    {escolaProfile?.municipio}, {escolaProfile?.provincia}
                                </p>
                            </div>
                        </div>

                        <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
                            <h3 className="text-sm font-semibold text-primary-700 mb-2">
                                📚 O que você pode fazer no EduGest:
                            </h3>
                            <ul className="text-sm text-primary-800 space-y-1">
                                <li>• Gerenciar turmas e disciplinas</li>
                                <li>• Cadastrar alunos e professores</li>
                                <li>• Lançar e calcular notas</li>
                                <li>• Gerar pautas e relatórios</li>
                            </ul>
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="primary"
                        loading={loading}
                        onClick={handleComplete}
                        className="w-full py-3 text-base font-semibold"
                    >
                        🚀 Começar a usar o sistema
                    </Button>
                </CardBody>
            </Card>
        </div>
    )
}
