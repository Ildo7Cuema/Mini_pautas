/*
component-meta:
  name: NotificationTestPanel
  description: Test panel to generate sample notifications (for development/testing)
  tokens: [--color-primary, --fs-sm]
  responsive: true
*/

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Button } from './ui/Button'
import { notifyNewStudent, notifyGradesPosted, notifyReportGenerated, notifySystem } from '../utils/notificationHelpers'

export const NotificationTestPanel: React.FC = () => {
    const { user, escolaProfile, professorProfile } = useAuth()
    const [creating, setCreating] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    const escolaId = escolaProfile?.id || professorProfile?.escola_id

    const handleCreateNotification = async (type: string) => {
        if (!user || !escolaId) {
            setMessage('Usuário ou escola não encontrado')
            return
        }

        setCreating(true)
        setMessage(null)

        try {
            switch (type) {
                case 'aluno_novo':
                    await notifyNewStudent(user.id, escolaId, 'João Silva', '10ª A')
                    break
                case 'nota_lancada':
                    await notifyGradesPosted(user.id, escolaId, 'Matemática', '10ª A')
                    break
                case 'relatorio_gerado':
                    await notifyReportGenerated(user.id, escolaId, 'Mini-pauta', '10ª A')
                    break
                case 'sistema':
                    await notifySystem(
                        user.id,
                        escolaId,
                        'Atualização do Sistema',
                        'Nova funcionalidade de notificações disponível!',
                        'dashboard'
                    )
                    break
            }
            setMessage('Notificação criada com sucesso!')
            setTimeout(() => setMessage(null), 3000)
        } catch (error) {
            setMessage('Erro ao criar notificação')
            console.error(error)
        } finally {
            setCreating(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <h3 className="text-lg font-semibold text-slate-900">Testar Notificações</h3>
                <p className="text-sm text-slate-600 mt-1">Crie notificações de exemplo para testar o sistema</p>
            </CardHeader>
            <CardBody>
                {message && (
                    <div className={`mb-4 p-3 rounded-lg ${message.includes('sucesso') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                        {message}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                        variant="primary"
                        onClick={() => handleCreateNotification('aluno_novo')}
                        loading={creating}
                        className="w-full"
                    >
                        Novo Aluno
                    </Button>

                    <Button
                        variant="primary"
                        onClick={() => handleCreateNotification('nota_lancada')}
                        loading={creating}
                        className="w-full"
                    >
                        Notas Lançadas
                    </Button>

                    <Button
                        variant="primary"
                        onClick={() => handleCreateNotification('relatorio_gerado')}
                        loading={creating}
                        className="w-full"
                    >
                        Relatório Gerado
                    </Button>

                    <Button
                        variant="primary"
                        onClick={() => handleCreateNotification('sistema')}
                        loading={creating}
                        className="w-full"
                    >
                        Notificação Sistema
                    </Button>
                </div>

                <p className="text-xs text-slate-500 mt-4">
                    <strong>Nota:</strong> Este painel é apenas para testes. As notificações reais serão geradas automaticamente pelo sistema.
                </p>
            </CardBody>
        </Card>
    )
}
