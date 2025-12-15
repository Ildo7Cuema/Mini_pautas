// Notification API functions for Supabase integration

import { supabase } from '../lib/supabaseClient'
import { Notification, NotificationType } from './notificationUtils'

/**
 * Create a new notification
 */
export async function createNotification(
    userId: string,
    escolaId: string,
    tipo: NotificationType,
    titulo: string,
    mensagem?: string,
    link?: string
): Promise<{ data: Notification | null; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('notificacoes')
            .insert({
                user_id: userId,
                escola_id: escolaId,
                tipo,
                titulo,
                mensagem,
                link,
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
): Promise<{ data: Notification[]; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('notificacoes')
            .select('*')
            .eq('user_id', userId)
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
            .eq('user_id', userId)
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
            .eq('user_id', userId)
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
 * Subscribe to real-time notifications (optional feature)
 */
export function subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void
) {
    const channel = supabase
        .channel('notifications')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notificacoes',
                filter: `user_id=eq.${userId}`
            },
            (payload) => {
                callback(payload.new as Notification)
            }
        )
        .subscribe()

    return () => {
        supabase.removeChannel(channel)
    }
}
