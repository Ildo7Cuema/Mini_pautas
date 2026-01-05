// Helper functions to create notifications for common events

import { createNotification } from './notificationApi'
import { NotificationType } from './notificationUtils'

/**
 * Create notification when a new student is added
 */
export async function notifyNewStudent(
    destinatarioId: string,
    studentName: string,
    className: string
): Promise<void> {
    await createNotification(
        destinatarioId,
        'aluno_novo',
        'Novo aluno cadastrado',
        `${studentName} foi adicionado à turma ${className}`,
        { link: 'students' }
    )
}

/**
 * Create notification when grades are posted
 */
export async function notifyGradesPosted(
    destinatarioId: string,
    subject: string,
    className: string,
    dadosAdicionais?: Record<string, any>
): Promise<void> {
    await createNotification(
        destinatarioId,
        'nota_lancada',
        'Notas lançadas',
        `Notas de ${subject} foram lançadas para ${className}`,
        { link: 'grades', ...dadosAdicionais }
    )
}

/**
 * Create notification when a report is generated
 */
export async function notifyReportGenerated(
    destinatarioId: string,
    reportType: string,
    className: string
): Promise<void> {
    await createNotification(
        destinatarioId,
        'relatorio_gerado',
        'Relatório disponível',
        `${reportType} da turma ${className} está pronto`,
        { link: 'reports' }
    )
}

/**
 * Create system notification
 */
export async function notifySystem(
    destinatarioId: string,
    title: string,
    message?: string,
    dadosAdicionais?: Record<string, any>
): Promise<void> {
    await createNotification(
        destinatarioId,
        'sistema',
        title,
        message,
        dadosAdicionais
    )
}

/**
 * Broadcast notification to all users in a school
 */
export async function broadcastToSchool(
    _escolaId: string,
    tipo: NotificationType,
    title: string,
    _message?: string,
    _dadosAdicionais?: Record<string, any>
): Promise<void> {
    // This would require fetching all users in the school
    // and creating a notification for each one
    // Implementation depends on your user management structure
    console.log('Broadcasting notification to school:', tipo, title)
    // TODO: Implement based on your needs
}

