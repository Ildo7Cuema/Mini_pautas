// Notification API functions for Supabase integration

import { supabase } from '../lib/supabaseClient'
import { AppNotification, NotificationType } from './notificationUtils'

/**
 * Create a new notification
 */
export async function createNotification(
    destinatarioId: string,
    tipo: NotificationType,
    titulo: string,
    mensagem?: string,
    dadosAdicionais?: Record<string, any>
): Promise<{ data: AppNotification | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('notificacoes')
            .insert({
                destinatario_id: destinatarioId,
                tipo,
                titulo,
                mensagem: mensagem || '',
                link: dadosAdicionais?.link || '',
                lida: false
            })
            .select()
            .single()

        if (error) throw error

        return { data, error: null }
    } catch (err) {
        console.error('Error creating notification:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Fetch notifications for the current user
 */
export async function fetchNotifications(
    userId: string,
    limit: number = 50
): Promise<{ data: AppNotification[]; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('notificacoes')
            .select('*')
            .eq('destinatario_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error

        return { data: data || [], error: null }
    } catch (err) {
        console.error('Error fetching notifications:', err)
        return { data: [], error: err as Error }
    }
}

/**
 * Fetch unread notification count
 */
export async function fetchUnreadCount(
    userId: string
): Promise<{ count: number; error: Error | null }> {
    try {
        const { count, error } = await supabase
            .from('notificacoes')
            .select('*', { count: 'exact', head: true })
            .eq('destinatario_id', userId)
            .eq('lida', false)

        if (error) throw error

        return { count: count || 0, error: null }
    } catch (err) {
        console.error('Error fetching unread count:', err)
        return { count: 0, error: err as Error }
    }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(
    notificationId: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { error } = await supabase
            .from('notificacoes')
            .update({ lida: true })
            .eq('id', notificationId)

        if (error) throw error

        return { success: true, error: null }
    } catch (err) {
        console.error('Error marking notification as read:', err)
        return { success: false, error: err as Error }
    }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(
    userId: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { error } = await supabase
            .from('notificacoes')
            .update({ lida: true })
            .eq('destinatario_id', userId)
            .eq('lida', false)

        if (error) throw error

        return { success: true, error: null }
    } catch (err) {
        console.error('Error marking all notifications as read:', err)
        return { success: false, error: err as Error }
    }
}

/**
 * Delete a notification
 */
export async function deleteNotification(
    notificationId: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { error } = await supabase
            .from('notificacoes')
            .delete()
            .eq('id', notificationId)

        if (error) throw error

        return { success: true, error: null }
    } catch (err) {
        console.error('Error deleting notification:', err)
        return { success: false, error: err as Error }
    }
}

/**
 * Delete all notifications for a user
 */
export async function deleteAllNotifications(
    userId: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { error } = await supabase
            .from('notificacoes')
            .delete()
            .eq('destinatario_id', userId)

        if (error) throw error

        return { success: true, error: null }
    } catch (err) {
        console.error('Error deleting all notifications:', err)
        return { success: false, error: err as Error }
    }
}

/**
 * Subscribe to real-time notifications (optional feature)
 */
export function subscribeToNotifications(
    userId: string,
    callback: (notification: AppNotification) => void
) {
    const channel = supabase
        .channel('notifications')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notificacoes',
                filter: `destinatario_id=eq.${userId}`
            },
            (payload) => {
                callback(payload.new as AppNotification)
            }
        )
        .subscribe()

    return () => {
        supabase.removeChannel(channel)
    }
}

/**
 * Get SuperAdmin user_id (first active SUPERADMIN)
 */
export async function getSuperAdminUserId(): Promise<{ userId: string | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('tipo_perfil', 'SUPERADMIN')
            .eq('ativo', true)
            .limit(1)
            .maybeSingle()

        if (error) throw error

        return { userId: data?.user_id || null, error: null }
    } catch (err) {
        console.error('Error fetching SuperAdmin user_id:', err)
        return { userId: null, error: err as Error }
    }
}

/**
 * Send a suggestion to SuperAdmin inbox
 * This function can be called without authentication (from login page)
 */
export async function sendSuggestionToSuperAdmin(
    nomeRemetente: string,
    emailRemetente: string,
    mensagem: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        // Get SuperAdmin user_id
        const { userId: superAdminId, error: fetchError } = await getSuperAdminUserId()

        if (fetchError) {
            console.error('Error fetching SuperAdmin:', fetchError)
            return { success: false, error: 'Não foi possível encontrar o administrador do sistema.' }
        }

        if (!superAdminId) {
            return { success: false, error: 'Nenhum administrador do sistema encontrado.' }
        }

        // Create notification for SuperAdmin
        const { error: notifError } = await supabase
            .from('notificacoes')
            .insert({
                destinatario_id: superAdminId,
                tipo: 'sugestao',
                titulo: `💡 Nova Sugestão de ${nomeRemetente}`,
                mensagem: `${mensagem}\n\n📧 Email de contacto: ${emailRemetente}`,
                lida: false
            })
            .select()
            .single()

        if (notifError) throw notifError

        return { success: true, error: null }
    } catch (err) {
        console.error('Error sending suggestion:', err)
        return { success: false, error: 'Ocorreu um erro ao enviar a sugestão. Tente novamente mais tarde.' }
    }
}
