import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Edge Function: Payment Webhook
 * 
 * POST /payment-webhook
 * 
 * Receives payment confirmation callbacks from payment providers.
 * Updates transaction status and activates/renews licenses upon success.
 * 
 * Headers:
 *   - x-provider: The payment provider sending the webhook
 *   - x-signature: Signature for webhook verification (provider-specific)
 */

interface WebhookPayload {
    // Common fields
    transaction_id?: string
    reference?: string
    status: 'success' | 'failed' | 'cancelled' | 'pending'
    amount?: number
    currency?: string

    // Provider-specific fields stored in metadata
    provider_data?: Record<string, any>
}

// Webhook signature verification (placeholder - implement per provider)
function verifyWebhookSignature(
    provider: string,
    signature: string | null,
    body: string
): boolean {
    // In production, each provider has its own signature verification method
    // EMIS GPO, ProxyPay, and AppyPay all have different signature schemes

    const webhookSecrets: Record<string, string> = {
        emis_gpo: Deno.env.get('EMIS_GPO_WEBHOOK_SECRET') || '',
        proxypay: Deno.env.get('PROXYPAY_WEBHOOK_SECRET') || '',
        appypay: Deno.env.get('APPYPAY_WEBHOOK_SECRET') || '',
    }

    // Skip verification in development/testing
    if (Deno.env.get('SKIP_WEBHOOK_VERIFICATION') === 'true') {
        console.log('⚠️ Webhook verification skipped (development mode)')
        return true
    }

    // If no signature provided but secret exists, reject
    if (!signature && webhookSecrets[provider]) {
        console.error('Missing signature for provider:', provider)
        return false
    }

    // TODO: Implement actual signature verification per provider
    // Example for HMAC-based verification:
    // const crypto = await import('https://deno.land/std@0.168.0/crypto/mod.ts')
    // const expectedSignature = await crypto.hmac('sha256', webhookSecrets[provider], body)
    // return signature === expectedSignature

    return true
}

// Map provider status to our internal status
function mapProviderStatus(provider: string, providerStatus: string): string {
    const statusMaps: Record<string, Record<string, string>> = {
        emis_gpo: {
            'PAID': 'sucesso',
            'APPROVED': 'sucesso',
            'FAILED': 'falha',
            'CANCELLED': 'cancelado',
            'PENDING': 'processando',
            'EXPIRED': 'cancelado'
        },
        proxypay: {
            'paid': 'sucesso',
            'pending': 'processando',
            'failed': 'falha',
            'deleted': 'cancelado'
        },
        appypay: {
            'completed': 'sucesso',
            'processing': 'processando',
            'failed': 'falha',
            'cancelled': 'cancelado'
        },
        manual: {
            'success': 'sucesso',
            'failed': 'falha',
            'cancelled': 'cancelado'
        }
    }

    return statusMaps[provider]?.[providerStatus] || providerStatus
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-provider, x-signature',
            },
        })
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { 'Content-Type': 'application/json' } }
        )
    }

    try {
        // Get provider from header or body
        const provider = req.headers.get('x-provider') || 'manual'
        const signature = req.headers.get('x-signature')

        // Read raw body for signature verification
        const rawBody = await req.text()

        // Verify webhook signature
        if (!verifyWebhookSignature(provider, signature, rawBody)) {
            console.error('Webhook signature verification failed for provider:', provider)
            return new Response(
                JSON.stringify({ error: 'Invalid signature' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Parse body
        const payload: WebhookPayload = JSON.parse(rawBody)
        console.log('Received webhook:', { provider, payload })

        // Create Supabase admin client (webhooks don't have user context)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Find transaction by provider_transaction_id or reference
        const transactionId = payload.transaction_id || payload.reference
        if (!transactionId) {
            return new Response(
                JSON.stringify({ error: 'Missing transaction_id or reference' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Search for transaction
        let { data: transacao, error: searchError } = await supabaseAdmin
            .from('transacoes_pagamento')
            .select('*, licencas(*), escolas(*)')
            .or(`provider_transaction_id.eq.${transactionId},metadata->reference.eq.${transactionId}`)
            .eq('provider', provider)
            .single()

        // If not found by provider_transaction_id, try by our internal ID
        if (!transacao) {
            const { data, error } = await supabaseAdmin
                .from('transacoes_pagamento')
                .select('*, licencas(*), escolas(*)')
                .eq('id', transactionId)
                .single()

            transacao = data
            searchError = error
        }

        if (searchError || !transacao) {
            console.error('Transaction not found:', transactionId, searchError)
            return new Response(
                JSON.stringify({ error: 'Transação não encontrada' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Map status
        const internalStatus = mapProviderStatus(provider, payload.status)

        // Update transaction
        const { error: updateError } = await supabaseAdmin
            .from('transacoes_pagamento')
            .update({
                estado: internalStatus,
                provider_transaction_id: payload.transaction_id || transacao.provider_transaction_id,
                metadata: {
                    ...transacao.metadata,
                    webhook_received_at: new Date().toISOString(),
                    provider_data: payload.provider_data
                },
                updated_at: new Date().toISOString()
            })
            .eq('id', transacao.id)

        if (updateError) {
            console.error('Error updating transaction:', updateError)
            return new Response(
                JSON.stringify({ error: 'Erro ao actualizar transação' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // If payment successful, activate/renew license
        if (internalStatus === 'sucesso' && transacao.licenca_id) {
            // Update license
            const { error: licenseError } = await supabaseAdmin
                .from('licencas')
                .update({
                    estado: 'ativa',
                    data_ultimo_pagamento: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', transacao.licenca_id)

            if (licenseError) {
                console.error('Error updating license:', licenseError)
            }

            // Unblock school
            const { error: unblockError } = await supabaseAdmin
                .from('escolas')
                .update({
                    bloqueado: false,
                    bloqueado_motivo: null,
                    bloqueado_em: null,
                    bloqueado_por: null,
                    ativo: true
                })
                .eq('id', transacao.escola_id)

            if (unblockError) {
                console.error('Error unblocking school:', unblockError)
            }

            // Log to history
            await supabaseAdmin
                .from('historico_licencas')
                .insert({
                    licenca_id: transacao.licenca_id,
                    escola_id: transacao.escola_id,
                    estado_anterior: transacao.licencas?.estado || 'pendente',
                    estado_novo: 'ativa',
                    motivo: `Pagamento confirmado via ${provider} - Ref: ${transactionId}`,
                    metadata: { transaction_id: transacao.id, provider }
                })

            console.log('✅ License activated and school unblocked:', transacao.escola_id)
        }

        // If payment failed, log it
        if (internalStatus === 'falha') {
            console.log('❌ Payment failed for transaction:', transacao.id)

            // Log to history
            if (transacao.licenca_id) {
                await supabaseAdmin
                    .from('historico_licencas')
                    .insert({
                        licenca_id: transacao.licenca_id,
                        escola_id: transacao.escola_id,
                        estado_anterior: transacao.licencas?.estado,
                        estado_novo: transacao.licencas?.estado || 'pendente',
                        motivo: `Pagamento falhou via ${provider} - Ref: ${transactionId}`,
                        metadata: { transaction_id: transacao.id, provider, error: payload.provider_data }
                    })
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                transaction_id: transacao.id,
                status: internalStatus,
                message: internalStatus === 'sucesso'
                    ? 'Pagamento confirmado e licença activada'
                    : `Status actualizado para: ${internalStatus}`
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        )

    } catch (error) {
        console.error('Webhook error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
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
