import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Edge Function: Calculate Final Grade
 * 
 * POST /calculate-final-grade
 * 
 * Calculates the final grade for a student based on:
 * - Component grades
 * - Custom formula
 * - Component weights
 * 
 * Returns detailed calculation breakdown
 */

interface CalculateRequest {
    aluno_id: string
    turma_id: string
    disciplina_id: string
    trimestre: number
}

interface ComponentValue {
    codigo: string
    valor: number
    peso: number
}

interface CalculationStep {
    componente: string
    valor: number
    peso: number
    contribuicao: number
    calculo: string
}

interface CalculationResult {
    nota_final: number
    classificacao: string
    componentes: Record<string, CalculationStep>
    expressao_completa: string
}

serve(async (req) => {
    // Handle CORS
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
        // Create Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        // Get request body
        const { aluno_id, turma_id, disciplina_id, trimestre }: CalculateRequest = await req.json()

        // Validate input
        if (!aluno_id || !turma_id || !disciplina_id || !trimestre) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Get formula for the discipline
        const { data: formula, error: formulaError } = await supabaseClient
            .from('formulas')
            .select('*')
            .eq('turma_id', turma_id)
            .eq('disciplina_id', disciplina_id)
            .single()

        if (formulaError || !formula) {
            return new Response(
                JSON.stringify({ error: 'Fórmula não encontrada para esta disciplina' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
        }

        if (!formula.validada) {
            return new Response(
                JSON.stringify({ error: 'Fórmula não está validada' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Get all components for the discipline
        const { data: componentes, error: componentesError } = await supabaseClient
            .from('componentes_avaliacao')
            .select('*')
            .eq('disciplina_id', disciplina_id)
            .order('ordem')

        if (componentesError || !componentes) {
            return new Response(
                JSON.stringify({ error: 'Componentes de avaliação não encontrados' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Get all grades for the student
        const { data: notas, error: notasError } = await supabaseClient
            .from('notas')
            .select('*, componentes_avaliacao!inner(*)')
            .eq('aluno_id', aluno_id)
            .eq('turma_id', turma_id)
            .in('componente_id', componentes.map(c => c.id))

        if (notasError) {
            return new Response(
                JSON.stringify({ error: 'Erro ao buscar notas' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Check if all required components have grades
        const requiredComponents = componentes.filter(c => c.obrigatorio)
        const gradedComponentIds = new Set(notas?.map(n => n.componente_id) || [])
        const missingComponents = requiredComponents.filter(c => !gradedComponentIds.has(c.id))

        if (missingComponents.length > 0) {
            return new Response(
                JSON.stringify({
                    error: 'Notas faltando para componentes obrigatórios',
                    missing: missingComponents.map(c => c.nome),
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Build grade map
        const gradeMap: Record<string, number> = {}
        notas?.forEach(nota => {
            const componente = componentes.find(c => c.id === nota.componente_id)
            if (componente) {
                gradeMap[componente.codigo_componente] = nota.valor
            }
        })

        // Calculate final grade
        const result = calculateFinalGrade(
            formula.expressao,
            componentes.map(c => ({
                codigo: c.codigo_componente,
                valor: gradeMap[c.codigo_componente] || 0,
                peso: c.peso_percentual,
            })),
            gradeMap
        )

        // Save final grade to database
        const { data: notaFinal, error: saveError } = await supabaseClient
            .from('notas_finais')
            .upsert({
                aluno_id,
                turma_id,
                disciplina_id,
                trimestre,
                nota_final: result.nota_final,
                classificacao: result.classificacao,
                calculo_detalhado: result,
                data_calculo: new Date().toISOString(),
            })
            .select()
            .single()

        if (saveError) {
            console.error('Error saving final grade:', saveError)
            return new Response(
                JSON.stringify({ error: 'Erro ao salvar nota final' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({
                success: true,
                data: notaFinal,
                calculation: result,
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

/**
 * Calculate final grade with step-by-step breakdown
 */
function calculateFinalGrade(
    expressao: string,
    componentes: ComponentValue[],
    notas: Record<string, number>
): CalculationResult {
    const result: CalculationResult = {
        nota_final: 0,
        classificacao: '',
        componentes: {},
        expressao_completa: '',
    }

    const steps: string[] = []
    const contributions: number[] = []

    // Calculate contribution of each component
    componentes.forEach(({ codigo, valor, peso }) => {
        if (!(codigo in notas)) return

        const nota = notas[codigo]
        const pesoDecimal = peso / 100
        const contribuicao = nota * pesoDecimal

        result.componentes[codigo] = {
            componente: codigo,
            valor: nota,
            peso: pesoDecimal,
            contribuicao: parseFloat(contribuicao.toFixed(2)),
            calculo: `${pesoDecimal.toFixed(2)} * ${nota} = ${contribuicao.toFixed(2)}`,
        }

        steps.push(`${pesoDecimal.toFixed(2)}*${nota}`)
        contributions.push(contribuicao)
    })

    // Calculate final grade
    result.nota_final = parseFloat(
        contributions.reduce((sum, val) => sum + val, 0).toFixed(2)
    )

    // Determine classification
    result.classificacao = getClassificacao(result.nota_final)

    // Build complete expression
    const contributionSteps = contributions.map(c => c.toFixed(2)).join(' + ')
    result.expressao_completa = `${steps.join(' + ')} = ${contributionSteps} = ${result.nota_final}`

    return result
}

/**
 * Get classification based on grade
 */
function getClassificacao(nota: number): string {
    if (nota >= 17) return 'Excelente'
    if (nota >= 14) return 'Bom'
    if (nota >= 10) return 'Suficiente'
    return 'Insuficiente'
}
