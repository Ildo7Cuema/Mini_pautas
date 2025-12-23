import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Edge Function: Public School Lookup
 * 
 * POST /public-school-lookup
 * 
 * Allows public (unauthenticated) lookup of schools by code or email
 * for the purpose of blocked school payment flow.
 * 
 * Uses service role to bypass RLS policies.
 * 
 * Body: { identifier: string }
 * Returns: { success, school?: {...} }
 */

interface LookupRequest {
    identifier: string
}

interface SchoolPublicInfo {
    id: string
    nome: string
    codigo_escola: string
    email?: string
    bloqueado: boolean
    bloqueado_motivo?: string
    provincia?: string
    municipio?: string
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
            { status: 405, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        )
    }

    try {
        // Create Supabase client with SERVICE ROLE (bypasses RLS)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Parse request body
        const body: LookupRequest = await req.json()
        const { identifier } = body

        // Validate input
        if (!identifier || typeof identifier !== 'string' || identifier.trim().length < 2) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Identificador inválido. Forneça o código ou email da escola.'
                }),
                { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
            )
        }

        const searchValue = identifier.trim()

        // Try to find school by codigo_escola first
        let school: SchoolPublicInfo | null = null

        const { data: byCode, error: codeError } = await supabaseAdmin
            .from('escolas')
            .select('id, nome, codigo_escola, email, bloqueado, bloqueado_motivo, provincia, municipio')
            .ilike('codigo_escola', searchValue)
            .limit(1)
            .maybeSingle()

        if (codeError) {
            console.error('Error searching by code:', codeError)
        }

        if (byCode) {
            school = byCode as SchoolPublicInfo
        } else {
            // Try by email
            const { data: byEmail, error: emailError } = await supabaseAdmin
                .from('escolas')
                .select('id, nome, codigo_escola, email, bloqueado, bloqueado_motivo, provincia, municipio')
                .ilike('email', searchValue)
                .limit(1)
                .maybeSingle()

            if (emailError) {
                console.error('Error searching by email:', emailError)
            }

            if (byEmail) {
                school = byEmail as SchoolPublicInfo
            }
        }

        if (!school) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Escola não encontrada. Verifique o código ou email inserido.'
                }),
                { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
            )
        }

        // Return limited public info only
        return new Response(
            JSON.stringify({
                success: true,
                school: {
                    id: school.id,
                    nome: school.nome,
                    codigo_escola: school.codigo_escola,
                    email: school.email,
                    bloqueado: school.bloqueado,
                    bloqueado_motivo: school.bloqueado_motivo,
                    provincia: school.provincia,
                    municipio: school.municipio
                }
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
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
