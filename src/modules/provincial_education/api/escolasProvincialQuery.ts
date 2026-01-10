/**
 * Escolas Provincial Query API
 * Read-only functions for querying schools within the province
 */

import { supabase } from '../../../lib/supabaseClient';
import type { Escola } from '../../../types';
import type { FiltrosEscolasProvincia } from '../types';

/**
 * Normalize municipality name for consistent grouping
 * Handles variations in capitalization and whitespace
 */
function normalizeMunicipio(municipio: string): string {
    const trimmed = municipio?.trim() || '';
    if (trimmed.length === 0) return trimmed;
    // Capitalize first letter of each word
    return trimmed
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Fetch all schools in the province
 */
export async function fetchEscolasProvincia(
    provincia: string,
    filtros?: FiltrosEscolasProvincia
): Promise<Escola[]> {
    let query = supabase
        .from('escolas')
        .select('*')
        .eq('provincia', provincia);

    // Apply filters
    if (filtros?.municipio) {
        query = query.eq('municipio', filtros.municipio);
    }

    if (filtros?.ativo !== undefined) {
        query = query.eq('ativo', filtros.ativo);
    }

    if (filtros?.bloqueado !== undefined) {
        query = query.eq('bloqueado', filtros.bloqueado);
    }

    if (filtros?.search) {
        query = query.or(`nome.ilike.%${filtros.search}%,codigo_escola.ilike.%${filtros.search}%`);
    }

    const { data, error } = await query.order('municipio').order('nome');

    if (error) throw error;
    return data || [];
}

/**
 * Fetch schools grouped by municipality
 */
export async function fetchEscolasAgrupadasPorMunicipio(provincia: string): Promise<{
    municipio: string;
    escolas: Escola[];
    total: number;
    activas: number;
}[]> {
    const escolas = await fetchEscolasProvincia(provincia);

    // Group by normalized municipality name
    const grouped: Record<string, Escola[]> = {};
    for (const escola of escolas) {
        const normalizedMunicipio = normalizeMunicipio(escola.municipio);
        if (!grouped[normalizedMunicipio]) {
            grouped[normalizedMunicipio] = [];
        }
        grouped[normalizedMunicipio].push(escola);
    }

    // Transform to array with counts
    return Object.entries(grouped).map(([municipio, escolasList]) => ({
        municipio,
        escolas: escolasList,
        total: escolasList.length,
        activas: escolasList.filter(e => e.ativo && !e.bloqueado).length
    })).sort((a, b) => a.municipio.localeCompare(b.municipio));
}

/**
 * Fetch consolidated statistics for all schools in the province
 */
export async function fetchEstatisticasEscolasProvincia(provincia: string): Promise<{
    total_escolas: number;
    escolas_activas: number;
    escolas_bloqueadas: number;
    escolas_inactivas: number;
    total_por_municipio: Record<string, number>;
}> {
    const escolas = await fetchEscolasProvincia(provincia);

    const stats = {
        total_escolas: escolas.length,
        escolas_activas: 0,
        escolas_bloqueadas: 0,
        escolas_inactivas: 0,
        total_por_municipio: {} as Record<string, number>
    };

    for (const escola of escolas) {
        if (escola.bloqueado) {
            stats.escolas_bloqueadas++;
        } else if (!escola.ativo) {
            stats.escolas_inactivas++;
        } else {
            stats.escolas_activas++;
        }

        // Use normalized municipality name for grouping
        const normalizedMunicipio = normalizeMunicipio(escola.municipio);
        if (!stats.total_por_municipio[normalizedMunicipio]) {
            stats.total_por_municipio[normalizedMunicipio] = 0;
        }
        stats.total_por_municipio[normalizedMunicipio]++;
    }

    return stats;
}

/**
 * Fetch school details with basic counts (read-only)
 */
export async function fetchEscolaDetalhesProvincial(escolaId: string): Promise<{
    escola: Escola;
    total_professores: number;
    total_turmas: number;
    total_alunos: number;
}> {
    // Fetch escola
    const { data: escola, error: escolaError } = await supabase
        .from('escolas')
        .select('*')
        .eq('id', escolaId)
        .single();

    if (escolaError) throw escolaError;

    // Count professores
    const { count: total_professores } = await supabase
        .from('professores')
        .select('*', { count: 'exact', head: true })
        .eq('escola_id', escolaId)
        .eq('ativo', true);

    // Count turmas
    const { data: turmas } = await supabase
        .from('turmas')
        .select('id')
        .eq('escola_id', escolaId);

    const turmaIds = turmas?.map(t => t.id) || [];
    const total_turmas = turmaIds.length;

    // Count alunos
    let total_alunos = 0;
    if (turmaIds.length > 0) {
        const { count } = await supabase
            .from('alunos')
            .select('*', { count: 'exact', head: true })
            .in('turma_id', turmaIds)
            .eq('ativo', true);
        total_alunos = count || 0;
    }

    return {
        escola,
        total_professores: total_professores || 0,
        total_turmas,
        total_alunos
    };
}

/**
 * Get list of municipalities in the province
 */
export async function fetchMunicipiosProvincia(provincia: string): Promise<string[]> {
    const escolas = await fetchEscolasProvincia(provincia);
    // Use normalized municipality names to avoid duplicates
    const municipios = [...new Set(escolas.map(e => normalizeMunicipio(e.municipio)))];
    return municipios.sort();
}

/**
 * Search schools across the province
 */
export async function searchEscolasProvincia(
    provincia: string,
    searchTerm: string,
    limit: number = 20
): Promise<Escola[]> {
    const { data, error } = await supabase
        .from('escolas')
        .select('*')
        .eq('provincia', provincia)
        .or(`nome.ilike.%${searchTerm}%,codigo_escola.ilike.%${searchTerm}%`)
        .limit(limit)
        .order('nome');

    if (error) throw error;
    return data || [];
}
