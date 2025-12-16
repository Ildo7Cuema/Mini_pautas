// Helper functions to create notifications for common events

import { createNotification } from './notificationApi'
import { NotificationType } from './notificationUtils'

/**
 * Create notification when a new student is added
 */
export async function notifyNewStudent(
    userId: string,
    escolaId: string,
    studentName: string,
    className: string
): Promise<void> {
    await createNotification(
        userId,
        escolaId,
        'aluno_novo',
        'Novo aluno cadastrado',
        `${studentName} foi adicionado à turma ${className}`,
        'students'
    )
}

/**
 * Create notification when grades are posted
 */
export async function notifyGradesPosted(
    userId: string,
    escolaId: string,
    subject: string,
    className: string
): Promise<void> {
    await createNotification(
        userId,
        escolaId,
        'nota_lancada',
        'Notas lançadas',
        `Notas de ${subject} foram lançadas para ${className}`,
        'grades'
    )
}

/**
 * Create notification when a report is generated
 */
export async function notifyReportGenerated(
    userId: string,
    escolaId: string,
    reportType: string,
    className: string
): Promise<void> {
    await createNotification(
        userId,
        escolaId,
        'relatorio_gerado',
        'Relatório disponível',
        `${reportType} da turma ${className} está pronto`,
        'reports'
    )
}

/**
 * Create system notification
 */
export async function notifySystem(
    userId: string,
    escolaId: string,
    title: string,
    message?: string,
    link?: string
): Promise<void> {
    await createNotification(
        userId,
        escolaId,
        'sistema',
        title,
        message,
        link
    )
}

/**
 * Broadcast notification to all users in a school
 */
export async function broadcastToSchool(
    escolaId: string,
    tipo: NotificationType,
    title: string,
    _message?: string,
    _link?: string
): Promise<void> {
    // This would require fetching all users in the school
    // and creating a notification for each one
    // Implementation depends on your user management structure
    console.log('Broadcasting notification to school:', escolaId, tipo, title)
    // TODO: Implement based on your needs
}
