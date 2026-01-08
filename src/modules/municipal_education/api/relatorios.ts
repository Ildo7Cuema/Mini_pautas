/**
 * Relatórios API
 * Functions for generating consolidated reports for the municipality
 */

import { supabase } from '../../../lib/supabaseClient';
import type { EstatisticasMunicipioCompletas } from '../types';
import { fetchEscolasMunicipio, fetchEstatisticasEstados, getEstadoEscola } from './escolasManagement';
import { fetchIndicadoresMunicipio, fetchEstatisticasConsolidadas } from './pedagogicSupervision';
import { fetchFuncionariosStats } from './funcionariosQuery';
import { fetchCircularesStats } from './circulares';

/**
 * Fetch complete municipality statistics
 */
export async function fetchEstatisticasCompletas(
    municipio: string
): Promise<EstatisticasMunicipioCompletas> {
    // Get all data in parallel
    const [
        escolasEstados,
        pedagogicoConsolidado,
        funcionariosStats,
        circularesStats
    ] = await Promise.all([
        fetchEstatisticasEstados(municipio),
        fetchEstatisticasConsolidadas(municipio),
        fetchFuncionariosStats(municipio),
        fetchCircularesStats(municipio)
    ]);

    // Get pending solicitacoes count
    const escolas = await fetchEscolasMunicipio(municipio);
    const escolaIds = escolas.map(e => e.id);

    const { count: solicitacoes_pendentes } = await supabase
        .from('solicitacoes_documentos')
        .select('*', { count: 'exact', head: true })
        .in('escola_id', escolaIds)
        .in('estado', ['pendente', 'em_analise']);

    return {
        total_escolas: escolasEstados.total,
        escolas_activas: escolasEstados.activas,
        escolas_suspensas: escolasEstados.suspensas,
        escolas_bloqueadas: escolasEstados.bloqueadas,
        total_alunos: pedagogicoConsolidado.total_alunos,
        total_professores: funcionariosStats.professores,
        total_turmas: pedagogicoConsolidado.total_turmas,
        media_geral: pedagogicoConsolidado.media_municipal,
        taxa_aprovacao: pedagogicoConsolidado.taxa_aprovacao_municipal,
        taxa_reprovacao: 100 - pedagogicoConsolidado.taxa_aprovacao_municipal,
        solicitacoes_pendentes: solicitacoes_pendentes || 0,
        circulares_activas: circularesStats.total
    };
}

/**
 * Generate school-by-school report data
 */
export async function generateRelatorioEscolas(municipio: string): Promise<{
    titulo: string;
    data_geracao: string;
    municipio: string;
    escolas: Array<{
        nome: string;
        codigo: string;
        estado: string;
        professores: number;
        alunos: number;
        alunos_masculino: number;
        alunos_feminino: number;
        turmas: number;
        media: number;
        taxa_aprovacao: number;
    }>;
    resumo: {
        total: number;
        activas: number;
        suspensas: number;
        bloqueadas: number;
        total_alunos: number;
        total_masculino: number;
        total_feminino: number;
    };
}> {
    const escolas = await fetchEscolasMunicipio(municipio);
    const indicadores = await fetchIndicadoresMunicipio(municipio);
    const indicadoresMap = new Map(indicadores.map(i => [i.escola_id, i]));

    // Get gender breakdown for each school in parallel
    const genderCounts = await Promise.all(escolas.map(async (escola) => {
        const [{ count: masculino }, { count: feminino }] = await Promise.all([
            supabase
                .from('alunos')
                .select('*', { count: 'exact', head: true })
                .eq('escola_id', escola.id)
                .eq('genero', 'M'),
            supabase
                .from('alunos')
                .select('*', { count: 'exact', head: true })
                .eq('escola_id', escola.id)
                .eq('genero', 'F')
        ]);
        return { escola_id: escola.id, masculino: masculino || 0, feminino: feminino || 0 };
    }));

    const genderMap = new Map(genderCounts.map(g => [g.escola_id, g]));

    const escolasData = escolas.map(escola => {
        const indicador = indicadoresMap.get(escola.id);
        const gender = genderMap.get(escola.id);
        return {
            nome: escola.nome,
            codigo: escola.codigo_escola,
            estado: getEstadoEscola(escola),
            professores: indicador?.total_turmas || 0, // Would need separate count
            alunos: indicador?.total_alunos || 0,
            alunos_masculino: gender?.masculino || 0,
            alunos_feminino: gender?.feminino || 0,
            turmas: indicador?.total_turmas || 0,
            media: indicador?.media_geral || 0,
            taxa_aprovacao: indicador?.taxa_aprovacao || 0
        };
    });

    const estados = await fetchEstatisticasEstados(municipio);

    // Calculate totals
    const total_masculino = escolasData.reduce((sum, e) => sum + e.alunos_masculino, 0);
    const total_feminino = escolasData.reduce((sum, e) => sum + e.alunos_feminino, 0);
    const total_alunos = escolasData.reduce((sum, e) => sum + e.alunos, 0);

    return {
        titulo: 'Relatório de Escolas do Município',
        data_geracao: new Date().toISOString(),
        municipio,
        escolas: escolasData,
        resumo: {
            total: estados.total,
            activas: estados.activas,
            suspensas: estados.suspensas,
            bloqueadas: estados.bloqueadas,
            total_alunos,
            total_masculino,
            total_feminino
        }
    };
}

/**
 * Generate approval rates report
 */
export async function generateRelatorioAprovacao(
    municipio: string,
    anoLectivo?: string,
    trimestre?: 1 | 2 | 3
): Promise<{
    titulo: string;
    data_geracao: string;
    municipio: string;
    periodo: { ano_lectivo?: string; trimestre?: number };
    escolas: Array<{
        nome: string;
        escola_id: string;
        total_alunos: number;
        alunos_masculino: number;
        alunos_feminino: number;
        aprovados: number;
        reprovados: number;
        taxa_aprovacao: number;
        media: number;
        classificacao: {
            excelente: number;
            bom: number;
            suficiente: number;
            insuficiente: number;
        };
    }>;
    totais: {
        total_alunos: number;
        total_masculino: number;
        total_feminino: number;
        total_aprovados: number;
        total_reprovados: number;
        taxa_aprovacao_media: number;
        media_municipal: number;
    };
}> {
    const indicadores = await fetchIndicadoresMunicipio(municipio, anoLectivo, trimestre);

    // Get gender breakdown for each school in parallel
    const genderCounts = await Promise.all(indicadores.map(async (ind) => {
        const [{ count: masculino }, { count: feminino }] = await Promise.all([
            supabase
                .from('alunos')
                .select('*', { count: 'exact', head: true })
                .eq('escola_id', ind.escola_id)
                .eq('genero', 'M'),
            supabase
                .from('alunos')
                .select('*', { count: 'exact', head: true })
                .eq('escola_id', ind.escola_id)
                .eq('genero', 'F')
        ]);
        return { escola_id: ind.escola_id, masculino: masculino || 0, feminino: feminino || 0 };
    }));

    const genderMap = new Map(genderCounts.map(g => [g.escola_id, g]));

    const escolas = indicadores.map(i => {
        const gender = genderMap.get(i.escola_id);
        return {
            nome: i.escola_nome,
            escola_id: i.escola_id,
            total_alunos: i.total_alunos,
            alunos_masculino: gender?.masculino || 0,
            alunos_feminino: gender?.feminino || 0,
            aprovados: Math.round(i.total_alunos * i.taxa_aprovacao / 100),
            reprovados: Math.round(i.total_alunos * i.taxa_reprovacao / 100),
            taxa_aprovacao: i.taxa_aprovacao,
            media: i.media_geral,
            classificacao: i.notas_por_classificacao
        };
    });

    const total_alunos = indicadores.reduce((sum, i) => sum + i.total_alunos, 0);
    const soma_taxas = indicadores.reduce((sum, i) => sum + i.taxa_aprovacao, 0);
    const soma_medias = indicadores.reduce((sum, i) => sum + i.media_geral, 0);
    const count = indicadores.length || 1;

    // Calculate gender totals
    const total_masculino = escolas.reduce((sum, e) => sum + e.alunos_masculino, 0);
    const total_feminino = escolas.reduce((sum, e) => sum + e.alunos_feminino, 0);

    return {
        titulo: 'Relatório de Aproveitamento Escolar',
        data_geracao: new Date().toISOString(),
        municipio,
        periodo: { ano_lectivo: anoLectivo, trimestre },
        escolas,
        totais: {
            total_alunos,
            total_masculino,
            total_feminino,
            total_aprovados: escolas.reduce((sum, e) => sum + e.aprovados, 0),
            total_reprovados: escolas.reduce((sum, e) => sum + e.reprovados, 0),
            taxa_aprovacao_media: Math.round(soma_taxas / count),
            media_municipal: Math.round((soma_medias / count) * 10) / 10
        }
    };
}

/**
 * Generate staff report
 */
export async function generateRelatorioFuncionarios(municipio: string): Promise<{
    titulo: string;
    data_geracao: string;
    municipio: string;
    stats: {
        total: number;
        professores: number;
        secretarios: number;
        activos: number;
        inactivos: number;
    };
    por_escola: Array<{
        escola: string;
        professores: number;
        secretarios: number;
        total: number;
    }>;
}> {
    const stats = await fetchFuncionariosStats(municipio);

    // Need to get breakdown by escola
    const escolas = await fetchEscolasMunicipio(municipio);
    const por_escola: Array<{ escola: string; professores: number; secretarios: number; total: number }> = [];

    for (const escola of escolas) {
        const { count: profCount } = await supabase
            .from('professores')
            .select('*', { count: 'exact', head: true })
            .eq('escola_id', escola.id);

        const { count: secCount } = await supabase
            .from('secretarios')
            .select('*', { count: 'exact', head: true })
            .eq('escola_id', escola.id);

        por_escola.push({
            escola: escola.nome,
            professores: profCount || 0,
            secretarios: secCount || 0,
            total: (profCount || 0) + (secCount || 0)
        });
    }

    return {
        titulo: 'Relatório de Funcionários',
        data_geracao: new Date().toISOString(),
        municipio,
        stats: {
            total: stats.total,
            professores: stats.professores,
            secretarios: stats.secretarios,
            activos: stats.activos,
            inactivos: stats.inactivos
        },
        por_escola: por_escola.sort((a, b) => b.total - a.total)
    };
}

/**
 * Generate solicitacoes report
 */
export async function generateRelatorioSolicitacoes(
    municipio: string,
    dataInicio?: string,
    dataFim?: string
): Promise<{
    titulo: string;
    data_geracao: string;
    municipio: string;
    periodo: { inicio?: string; fim?: string };
    stats: {
        total: number;
        pendentes: number;
        em_analise: number;
        aprovadas: number;
        rejeitadas: number;
        concluidas: number;
    };
    por_tipo: Array<{ tipo: string; contagem: number }>;
    por_escola: Array<{ escola: string; contagem: number }>;
}> {
    // Get escola IDs
    const escolas = await fetchEscolasMunicipio(municipio);
    const escolaIds = escolas.map(e => e.id);
    const escolaNames = new Map(escolas.map(e => [e.id, e.nome]));

    if (escolaIds.length === 0) {
        return {
            titulo: 'Relatório de Solicitações',
            data_geracao: new Date().toISOString(),
            municipio,
            periodo: { inicio: dataInicio, fim: dataFim },
            stats: { total: 0, pendentes: 0, em_analise: 0, aprovadas: 0, rejeitadas: 0, concluidas: 0 },
            por_tipo: [],
            por_escola: []
        };
    }

    // Build query
    let query = supabase
        .from('solicitacoes_documentos')
        .select(`
            id,
            estado,
            escola_id,
            tipo_documento:tipos_documento(nome)
        `)
        .in('escola_id', escolaIds);

    if (dataInicio) {
        query = query.gte('created_at', dataInicio);
    }
    if (dataFim) {
        query = query.lte('created_at', dataFim);
    }

    const { data: solicitacoes } = await query;

    // Calculate stats
    const stats = {
        total: solicitacoes?.length || 0,
        pendentes: 0,
        em_analise: 0,
        aprovadas: 0,
        rejeitadas: 0,
        concluidas: 0
    };

    const tipoCount = new Map<string, number>();
    const escolaCount = new Map<string, number>();

    for (const sol of (solicitacoes || [])) {
        // State counts
        switch (sol.estado) {
            case 'pendente':
            case 'pendente_info':
                stats.pendentes++;
                break;
            case 'em_analise':
                stats.em_analise++;
                break;
            case 'aprovado':
                stats.aprovadas++;
                break;
            case 'rejeitado':
                stats.rejeitadas++;
                break;
            case 'concluido':
                stats.concluidas++;
                break;
        }

        // Type counts
        const tipoNome = (sol.tipo_documento as any)?.nome || 'Outro';
        tipoCount.set(tipoNome, (tipoCount.get(tipoNome) || 0) + 1);

        // Escola counts
        const escolaNome = escolaNames.get(sol.escola_id) || 'Desconhecida';
        escolaCount.set(escolaNome, (escolaCount.get(escolaNome) || 0) + 1);
    }

    return {
        titulo: 'Relatório de Solicitações',
        data_geracao: new Date().toISOString(),
        municipio,
        periodo: { inicio: dataInicio, fim: dataFim },
        stats,
        por_tipo: Array.from(tipoCount.entries())
            .map(([tipo, contagem]) => ({ tipo, contagem }))
            .sort((a, b) => b.contagem - a.contagem),
        por_escola: Array.from(escolaCount.entries())
            .map(([escola, contagem]) => ({ escola, contagem }))
            .sort((a, b) => b.contagem - a.contagem)
    };
}
