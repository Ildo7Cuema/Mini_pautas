import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parse } from 'https://deno.land/std@0.168.0/encoding/csv.ts'

/**
 * Edge Function: Import CSV
 * 
 * POST /import-csv
 * 
 * Imports student data and grades from CSV file
 * Expected CSV format:
 * numero_processo,nome_completo,genero,data_nascimento,nome_encarregado,telefone_encarregado
 */

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

        const { turma_id, csv_data } = await req.json()

        if (!turma_id || !csv_data) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Parse CSV
        const records = parse(csv_data, {
            skipFirstRow: true,
            columns: [
                'numero_processo',
                'nome_completo',
                'genero',
                'data_nascimento',
                'nome_encarregado',
                'telefone_encarregado',
            ],
        })

        const imported = []
        const errors = []

        // Import each student
        for (let i = 0; i < records.length; i++) {
            const record = records[i]

            try {
                const { error } = await supabaseClient
                    .from('alunos')
                    .upsert({
                        turma_id,
                        numero_processo: record.numero_processo,
                        nome_completo: record.nome_completo,
                        genero: record.genero,
                        data_nascimento: record.data_nascimento || null,
                        nome_encarregado: record.nome_encarregado || null,
                        telefone_encarregado: record.telefone_encarregado || null,
                        ativo: true,
                    }, {
                        onConflict: 'numero_processo',
                    })

                if (error) throw error
                imported.push(record.numero_processo)
            } catch (error) {
                errors.push({
                    row: i + 2, // +2 because of 0-index and header row
                    field: 'general',
                    message: error.message,
                })
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                imported: imported.length,
                errors,
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
