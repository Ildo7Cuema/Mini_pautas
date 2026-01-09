/**
 * Circulares Provinciais API
 * Functions for managing provincial circulars
 */

import { supabase } from '../../../lib/supabaseClient';
import type {
    CircularProvincial,
    LeituraCircularProvincial,
    CreateCircularProvincialRequest,
    FiltrosCircularesProvinciais
} from '../types';

/**
 * Fetch all circulars for the province
 */
export async function fetchCircularesProvinciais(
    provincia: string,
    filtros?: FiltrosCircularesProvinciais
): Promise<CircularProvincial[]> {
    let query = supabase
        .from('circulares_provinciais')
        .select('*')
        .eq('provincia', provincia);

    // Apply filters
    if (filtros?.tipo) {
        query = query.eq('tipo', filtros.tipo);
    }

    if (filtros?.publicado !== undefined) {
        query = query.eq('publicado', filtros.publicado);
    }

    if (filtros?.urgente !== undefined) {
        query = query.eq('urgente', filtros.urgente);
    }

    if (filtros?.search) {
        query = query.or(`titulo.ilike.%${filtros.search}%,conteudo.ilike.%${filtros.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Get reading counts for each circular
    const circulares: CircularProvincial[] = [];
    for (const circular of data || []) {
        const { count: leiturasCount } = await supabase
            .from('leituras_circulares_provinciais')
            .select('*', { count: 'exact', head: true })
            .eq('circular_id', circular.id);

        // Count pending municipal directorates
        const { count: totalDirecoes } = await supabase
            .from('direcoes_municipais')
            .select('*', { count: 'exact', head: true })
            .eq('provincia', provincia)
            .eq('ativo', true);

        const { count: direcoesLidas } = await supabase
            .from('leituras_circulares_provinciais')
            .select('*', { count: 'exact', head: true })
            .eq('circular_id', circular.id)
            .not('direcao_municipal_id', 'is', null);

        circulares.push({
            ...circular,
            leituras_count: leiturasCount || 0,
            direcoes_pendentes: (totalDirecoes || 0) - (direcoesLidas || 0),
            escolas_pendentes: 0 // TODO: Calculate school pending count
        });
    }

    return circulares;
}

/**
 * Fetch a single circular by ID
 */
export async function fetchCircularProvincial(circularId: string): Promise<CircularProvincial | null> {
    const { data, error } = await supabase
        .from('circulares_provinciais')
        .select('*')
        .eq('id', circularId)
        .maybeSingle();

    if (error) throw error;
    return data;
}

/**
 * Create a new provincial circular
 */
export async function createCircularProvincial(
    provincia: string,
    request: CreateCircularProvincialRequest
): Promise<CircularProvincial> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilizador não autenticado');

    const { data, error } = await supabase
        .from('circulares_provinciais')
        .insert({
            ...request,
            provincia,
            created_by: user.id,
            publicado: false
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update a provincial circular
 */
export async function updateCircularProvincial(
    circularId: string,
    updates: Partial<CreateCircularProvincialRequest>
): Promise<CircularProvincial> {
    const { data, error } = await supabase
        .from('circulares_provinciais')
        .update(updates)
        .eq('id', circularId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete a provincial circular
 */
export async function deleteCircularProvincial(circularId: string): Promise<void> {
    const { error } = await supabase
        .from('circulares_provinciais')
        .delete()
        .eq('id', circularId);

    if (error) throw error;
}

/**
 * Publish a provincial circular
 */
export async function publishCircularProvincial(circularId: string): Promise<CircularProvincial> {
    const { data, error } = await supabase
        .from('circulares_provinciais')
        .update({
            publicado: true,
            data_publicacao: new Date().toISOString()
        })
        .eq('id', circularId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Unpublish a provincial circular
 */
export async function unpublishCircularProvincial(circularId: string): Promise<CircularProvincial> {
    const { data, error } = await supabase
        .from('circulares_provinciais')
        .update({
            publicado: false
        })
        .eq('id', circularId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Fetch readings for a circular
 */
export async function fetchLeiturasCircular(
    circularId: string
): Promise<LeituraCircularProvincial[]> {
    const { data, error } = await supabase
        .from('leituras_circulares_provinciais')
        .select(`
            *,
            direcao_municipal:direcoes_municipais(id, nome, municipio),
            escola:escolas(id, nome, codigo_escola)
        `)
        .eq('circular_id', circularId)
        .order('lido_em', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Register a reading of a circular (for municipal directorates)
 */
export async function registrarLeituraDirecaoMunicipal(
    circularId: string,
    direcaoMunicipalId: string,
    nome: string,
    cargo?: string
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilizador não autenticado');

    const { error } = await supabase
        .from('leituras_circulares_provinciais')
        .upsert({
            circular_id: circularId,
            direcao_municipal_id: direcaoMunicipalId,
            lido_por: user.id,
            lido_por_nome: nome,
            lido_por_cargo: cargo,
            lido_em: new Date().toISOString()
        }, {
            onConflict: 'circular_id,direcao_municipal_id'
        });

    if (error) throw error;
}

/**
 * Register a reading of a circular (for schools)
 */
export async function registrarLeituraEscola(
    circularId: string,
    escolaId: string,
    nome: string,
    cargo?: string
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilizador não autenticado');

    const { error } = await supabase
        .from('leituras_circulares_provinciais')
        .upsert({
            circular_id: circularId,
            escola_id: escolaId,
            lido_por: user.id,
            lido_por_nome: nome,
            lido_por_cargo: cargo,
            lido_em: new Date().toISOString()
        }, {
            onConflict: 'circular_id,escola_id'
        });

    if (error) throw error;
}

/**
 * Get circular statistics
 */
export async function fetchEstatisticasCirculares(provincia: string): Promise<{
    total: number;
    publicadas: number;
    rascunhos: number;
    urgentes: number;
    por_tipo: Record<string, number>;
}> {
    const circulares = await fetchCircularesProvinciais(provincia);

    const stats = {
        total: circulares.length,
        publicadas: circulares.filter(c => c.publicado).length,
        rascunhos: circulares.filter(c => !c.publicado).length,
        urgentes: circulares.filter(c => c.urgente).length,
        por_tipo: {} as Record<string, number>
    };

    for (const circular of circulares) {
        if (!stats.por_tipo[circular.tipo]) {
            stats.por_tipo[circular.tipo] = 0;
        }
        stats.por_tipo[circular.tipo]++;
    }

    return stats;
}

/**
 * Fetch published circulars for municipal directorates/schools to view
 */
export async function fetchCircularesPublicadasProvincia(
    provincia: string
): Promise<CircularProvincial[]> {
    const { data, error } = await supabase
        .from('circulares_provinciais')
        .select('*')
        .eq('provincia', provincia)
        .eq('publicado', true)
        .order('data_publicacao', { ascending: false });

    if (error) throw error;
    return data || [];
}
