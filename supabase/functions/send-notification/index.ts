import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Edge Function: Send Notification
 * 
 * POST /send-notification
 * 
 * Sends notifications to students/parents about:
 * - New grades posted
 * - Final grades calculated
 * - Important announcements
 */

interface NotificationRequest {
    destinatario_id: string
    tipo: string
    titulo: string
    mensagem: string
    dados_adicionais?: Record<string, any>
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
        })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        const {
            destinatario_id,
            tipo,
            titulo,
            mensagem,
            dados_adicionais,
        }: NotificationRequest = await req.json()

        if (!destinatario_id || !tipo || !titulo || !mensagem) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Create notification
        const { data, error } = await supabaseClient
            .from('notificacoes')
            .insert({
                destinatario_id,
                tipo,
                titulo,
                mensagem,
                dados_adicionais: dados_adicionais || {},
                lida: false,
            })
            .select()
            .single()

        if (error) throw error

        // TODO: Send email notification if configured
        // This would integrate with a service like SendGrid or AWS SES

        return new Response(
            JSON.stringify({
                success: true,
                data,
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        )
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        )
    }
})
