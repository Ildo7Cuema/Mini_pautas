import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Edge Function: Generate Report
 * 
 * GET /generate-report?turma_id=xxx&disciplina_id=xxx&trimestre=1
 * 
 * Generates a complete mini-pauta report with:
 * - Student grades
 * - Class statistics
 * - Calculation details
 */

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
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

        const url = new URL(req.url)
        const turma_id = url.searchParams.get('turma_id')
        const disciplina_id = url.searchParams.get('disciplina_id')
        const trimestre = url.searchParams.get('trimestre')

        if (!turma_id || !disciplina_id || !trimestre) {
            return new Response(
                JSON.stringify({ error: 'Missing required parameters' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Get mini-pauta data
        const { data: miniPauta, error: miniPautaError } = await supabaseClient
            .from('vw_mini_pauta')
            .select('*')
            .eq('turma_id', turma_id)
            .eq('disciplina_id', disciplina_id)
            .order('aluno_nome')

        if (miniPautaError) throw miniPautaError

        // Get statistics
        const { data: stats, error: statsError } = await supabaseClient
            .from('vw_estatisticas_turma')
            .select('*')
            .eq('turma_id', turma_id)
            .eq('disciplina_id', disciplina_id)
            .single()

        if (statsError) throw statsError

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    mini_pauta: miniPauta,
                    estatisticas: stats,
                },
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
