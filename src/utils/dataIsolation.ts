import { supabase } from '../lib/supabaseClient'
import type { UserProfile } from '../types'

/**
 * Data isolation utility functions for multi-tenant architecture
 */

/**
 * Get escola filter for current user
 */
export const getEscolaFilter = (profile: UserProfile | null) => {
    if (!profile) return null
    return { escola_id: profile.escola_id }
}

/**
 * Get turma IDs accessible by a professor
 */
export const getProfessorTurmasFilter = async (
    professorId: string
): Promise<string[]> => {
    const { data, error } = await supabase
        .from('turma_professores')
        .select('turma_id')
        .eq('professor_id', professorId)

    if (error) {
        console.error('Error fetching professor turmas:', error)
        return []
    }

    return data?.map(d => d.turma_id) || []
}

/**
 * Get disciplina IDs accessible by a professor
 * Optionally filter by turma
 */
export const getProfessorDisciplinasFilter = async (
    professorId: string,
    turmaId?: string
): Promise<string[]> => {
    let query = supabase
        .from('turma_professores')
        .select('disciplina_id')
        .eq('professor_id', professorId)

    if (turmaId) {
        query = query.eq('turma_id', turmaId)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching professor disciplinas:', error)
        return []
    }

    return data?.map(d => d.disciplina_id) || []
}

/**
 * Get aluno IDs accessible by a professor
 */
export const getProfessorAlunosFilter = async (
    professorId: string
): Promise<string[]> => {
    // First get accessible turmas
    const turmaIds = await getProfessorTurmasFilter(professorId)

    if (turmaIds.length === 0) return []

    // Then get all alunos from those turmas
    const { data, error } = await supabase
        .from('alunos')
        .select('id')
        .in('turma_id', turmaIds)
        .eq('ativo', true)

    if (error) {
        console.error('Error fetching professor alunos:', error)
        return []
    }

    return data?.map(d => d.id) || []
}

/**
 * Check if a turma belongs to a specific escola
 */
export const turmaBelongsToEscola = async (
    turmaId: string,
    escolaId: string
): Promise<boolean> => {
    const { data, error } = await supabase
        .from('turmas')
        .select('escola_id')
        .eq('id', turmaId)
        .single()

    if (error || !data) return false

    return data.escola_id === escolaId
}

/**
 * Check if a professor belongs to a specific escola
 */
export const professorBelongsToEscola = async (
    professorId: string,
    escolaId: string
): Promise<boolean> => {
    const { data, error } = await supabase
        .from('professores')
        .select('escola_id')
        .eq('id', professorId)
        .single()

    if (error || !data) return false

    return data.escola_id === escolaId
}

/**
 * Check if an aluno belongs to a specific escola
 */
export const alunoBelongsToEscola = async (
    alunoId: string,
    escolaId: string
): Promise<boolean> => {
    const { data, error } = await supabase
        .from('alunos')
        .select('turma:turmas(escola_id)')
        .eq('id', alunoId)
        .single()

    if (error || !data || !data.turma) return false

    return (data.turma as any).escola_id === escolaId
}

/**
 * Filter turmas query based on user profile
 */
export const applyTurmaFilter = (
    query: any,
    profile: UserProfile | null,
    professorId?: string
) => {
    if (!profile) return query

    if (profile.tipo_perfil === 'ESCOLA') {
        // Schools see all their turmas
        return query.eq('escola_id', profile.escola_id)
    } else if (profile.tipo_perfil === 'PROFESSOR' && professorId) {
        // Professors see only assigned turmas
        // This requires a join with turma_professores
        return query.in('id', async () => {
            const turmaIds = await getProfessorTurmasFilter(professorId)
            return turmaIds
        })
    }

    return query
}

/**
 * Filter alunos query based on user profile
 */
export const applyAlunoFilter = (
    query: any,
    profile: UserProfile | null,
    professorId?: string
) => {
    if (!profile) return query

    if (profile.tipo_perfil === 'ESCOLA') {
        // Schools see all students from their turmas
        return query.in('turma_id', async () => {
            const { data } = await supabase
                .from('turmas')
                .select('id')
                .eq('escola_id', profile.escola_id)
            return data?.map(t => t.id) || []
        })
    } else if (profile.tipo_perfil === 'PROFESSOR' && professorId) {
        // Professors see only students from assigned turmas
        return query.in('turma_id', async () => {
            const turmaIds = await getProfessorTurmasFilter(professorId)
            return turmaIds
        })
    }

    return query
}

/**
 * Validate that a resource belongs to the user's escola
 */
export const validateEscolaAccess = async (
    resourceType: 'turma' | 'professor' | 'aluno',
    resourceId: string,
    escolaId: string
): Promise<boolean> => {
    switch (resourceType) {
        case 'turma':
            return turmaBelongsToEscola(resourceId, escolaId)
        case 'professor':
            return professorBelongsToEscola(resourceId, escolaId)
        case 'aluno':
            return alunoBelongsToEscola(resourceId, escolaId)
        default:
            return false
    }
}

/**
 * Get all resources accessible by user
 */
export const getAccessibleResources = async (
    profile: UserProfile | null,
    professorId?: string
) => {
    if (!profile) return { turmas: [], disciplinas: [], alunos: [] }

    if (profile.tipo_perfil === 'ESCOLA') {
        // Get all turmas from escola
        const { data: turmas } = await supabase
            .from('turmas')
            .select('id')
            .eq('escola_id', profile.escola_id)

        const turmaIds = turmas?.map(t => t.id) || []

        // Get all disciplinas from those turmas
        const { data: disciplinas } = await supabase
            .from('disciplinas')
            .select('id')
            .in('turma_id', turmaIds)

        // Get all alunos from those turmas
        const { data: alunos } = await supabase
            .from('alunos')
            .select('id')
            .in('turma_id', turmaIds)
            .eq('ativo', true)

        return {
            turmas: turmaIds,
            disciplinas: disciplinas?.map(d => d.id) || [],
            alunos: alunos?.map(a => a.id) || []
        }
    } else if (profile.tipo_perfil === 'PROFESSOR' && professorId) {
        const turmas = await getProfessorTurmasFilter(professorId)
        const disciplinas = await getProfessorDisciplinasFilter(professorId)
        const alunos = await getProfessorAlunosFilter(professorId)

        return { turmas, disciplinas, alunos }
    }

    return { turmas: [], disciplinas: [], alunos: [] }
}
