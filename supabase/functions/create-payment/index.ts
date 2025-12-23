import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Edge Function: Create Payment
 * 
 * POST /create-payment
 * 
 * Creates a new payment transaction and returns payment details
 * for the school to complete the payment via their chosen provider.
 * 
 * Body: { escola_id, plano, provider? }
 * Returns: { success, transaction_id, payment_url?, reference? }
 */

interface CreatePaymentRequest {
    escola_id: string
    plano: 'trimestral' | 'semestral' | 'anual'
    provider?: 'emis_gpo' | 'proxypay' | 'appypay' | 'manual'
}

interface PaymentProviderResponse {
    payment_url?: string
    reference?: string
    provider_transaction_id?: string
    expires_at?: string
}

// Default prices in AOA (Angolan Kwanza)
const DEFAULT_PRICES: Record<string, number> = {
    trimestral: 15000,
    semestral: 27000,
    anual: 48000
}

// Calculate license end date based on plan
function calculateEndDate(startDate: Date, plano: string): Date {
    const endDate = new Date(startDate)
    switch (plano) {
        case 'trimestral':
            endDate.setMonth(endDate.getMonth() + 3)
            break
        case 'semestral':
            endDate.setMonth(endDate.getMonth() + 6)
            break
        case 'anual':
            endDate.setFullYear(endDate.getFullYear() + 1)
            break
    }
    return endDate
}

// Mock payment provider integration (replace with actual provider SDK)
async function initializePayment(
    provider: string,
    escola_id: string,
    valor: number,
    descricao: string
): Promise<PaymentProviderResponse> {
    // In production, this would call the actual payment provider API
    // For now, we return mock data for testing

    switch (provider) {
        case 'emis_gpo':
            // EMIS GPO integration would go here
            return {
                reference: `EMIS-${Date.now()}`,
                payment_url: `https://gpo.emis.co.ao/pay?ref=EMIS-${Date.now()}`,
                provider_transaction_id: `GPO-${Date.now()}`,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }

        case 'proxypay':
            // ProxyPay integration would go here
            return {
                reference: `PP-${Date.now()}`,
                payment_url: `https://api.proxypay.co.ao/payments/${Date.now()}`,
                provider_transaction_id: `PROXY-${Date.now()}`,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }

        case 'appypay':
            // AppyPay integration would go here
            return {
                reference: `AP-${Date.now()}`,
                payment_url: `https://appypay.ao/checkout/${Date.now()}`,
                provider_transaction_id: `APPY-${Date.now()}`,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }

        default:
            // Manual payment - no external provider
            return {
                reference: `MANUAL-${Date.now()}`,
                provider_transaction_id: `MANUAL-${Date.now()}`
            }
    }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
        // Create Supabase client with user context
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        // Parse request body
        const body: CreatePaymentRequest = await req.json()
        const { escola_id, plano, provider = 'manual' } = body

        // Validate required fields
        if (!escola_id) {
            return new Response(
                JSON.stringify({ error: 'escola_id é obrigatório' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        if (!plano || !['trimestral', 'semestral', 'anual'].includes(plano)) {
            return new Response(
                JSON.stringify({ error: 'Plano inválido. Use: trimestral, semestral ou anual' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Verify escola exists
        const { data: escola, error: escolaError } = await supabaseClient
            .from('escolas')
            .select('id, nome, codigo_escola')
            .eq('id', escola_id)
            .single()

        if (escolaError || !escola) {
            return new Response(
                JSON.stringify({ error: 'Escola não encontrada' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Get price from configuration or use default
        const { data: precoData } = await supabaseClient
            .from('precos_licenca')
            .select('valor')
            .eq('plano', plano)
            .eq('ativo', true)
            .single()

        const valor = precoData?.valor ?? DEFAULT_PRICES[plano]

        // Calculate license dates
        const dataInicio = new Date()
        const dataFim = calculateEndDate(dataInicio, plano)

        // Check for existing active license and extend if present
        const { data: existingLicense } = await supabaseClient
            .from('licencas')
            .select('id, data_fim')
            .eq('escola_id', escola_id)
            .eq('estado', 'ativa')
            .single()

        let licencaId: string

        if (existingLicense) {
            // Extend existing license
            const currentEndDate = new Date(existingLicense.data_fim)
            const newEndDate = calculateEndDate(
                currentEndDate > dataInicio ? currentEndDate : dataInicio,
                plano
            )

            const { data: updatedLicense, error: updateError } = await supabaseClient
                .from('licencas')
                .update({
                    data_fim: newEndDate.toISOString().split('T')[0],
                    plano: plano,
                    valor: valor,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingLicense.id)
                .select('id')
                .single()

            if (updateError) {
                console.error('Error updating license:', updateError)
                return new Response(
                    JSON.stringify({ error: 'Erro ao actualizar licença existente' }),
                    { status: 500, headers: { 'Content-Type': 'application/json' } }
                )
            }

            licencaId = updatedLicense.id
        } else {
            // Create new license (in pending state until payment confirmed)
            const { data: newLicense, error: licenseError } = await supabaseClient
                .from('licencas')
                .insert({
                    escola_id: escola_id,
                    plano: plano,
                    data_inicio: dataInicio.toISOString().split('T')[0],
                    data_fim: dataFim.toISOString().split('T')[0],
                    estado: 'ativa', // Will be set to 'ativa' after payment confirmation
                    valor: valor
                })
                .select('id')
                .single()

            if (licenseError) {
                console.error('Error creating license:', licenseError)
                return new Response(
                    JSON.stringify({ error: 'Erro ao criar licença' }),
                    { status: 500, headers: { 'Content-Type': 'application/json' } }
                )
            }

            licencaId = newLicense.id
        }

        // Initialize payment with provider
        const descricao = `Licença ${plano} - ${escola.nome} (${escola.codigo_escola})`
        const providerResponse = await initializePayment(provider, escola_id, valor, descricao)

        // Create payment transaction record
        const { data: transacao, error: transacaoError } = await supabaseClient
            .from('transacoes_pagamento')
            .insert({
                escola_id: escola_id,
                licenca_id: licencaId,
                provider: provider,
                provider_transaction_id: providerResponse.provider_transaction_id,
                valor: valor,
                estado: 'pendente',
                moeda: 'AOA',
                descricao: descricao,
                metadata: {
                    plano: plano,
                    reference: providerResponse.reference,
                    expires_at: providerResponse.expires_at
                },
                ip_address: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'unknown'
            })
            .select('id')
            .single()

        if (transacaoError) {
            console.error('Error creating transaction:', transacaoError)
            return new Response(
                JSON.stringify({ error: 'Erro ao criar transação de pagamento' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Return success response
        return new Response(
            JSON.stringify({
                success: true,
                transaction_id: transacao.id,
                licenca_id: licencaId,
                payment_url: providerResponse.payment_url,
                reference: providerResponse.reference,
                expires_at: providerResponse.expires_at,
                valor: valor,
                moeda: 'AOA',
                plano: plano,
                data_inicio: dataInicio.toISOString().split('T')[0],
                data_fim: dataFim.toISOString().split('T')[0]
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
