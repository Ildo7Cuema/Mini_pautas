/**
 * Relatórios Provinciais API
 * Functions for generating provincial reports
 */

import { supabase } from '../../../lib/supabaseClient';
import {
    fetchEstatisticasProvinciaRPC,
    fetchIndicadoresPorMunicipio,
    fetchComparativoMunicipios
} from './pedagogicSupervisionProvincial';
import { fetchDirecoesMunicipaisProvincia } from './direcoesMunicipaisManagement';
import { fetchEstatisticasEscolasProvincia } from './escolasProvincialQuery';
import type {
    RelatorioProvincial,
    RelatorioConsolidadoProvincia,
    EstatisticasProvincia
} from '../types';

/**
 * Generate a consolidated provincial report
 */
export async function generateRelatorioConsolidado(
    provincia: string
): Promise<RelatorioConsolidadoProvincia> {
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch all data in parallel
    const [estatisticas, comparativo, direcoes] = await Promise.all([
        fetchEstatisticasProvinciaRPC(provincia),
        fetchComparativoMunicipios(provincia),
        fetchDirecoesMunicipaisProvincia(provincia)
    ]);

    const now = new Date();
    const periodo = `${now.getFullYear()}`;

    // Transform to expected format
    return {
        provincia,
        periodo,
        data_geracao: now.toISOString(),
        estatisticas_gerais: {
            total_escolas: estatisticas.total_escolas,
            total_alunos: estatisticas.total_alunos,
            total_professores: estatisticas.total_professores,
            taxa_aprovacao_media: 0, // TODO: Calculate from pedagogic data
            escolas_inactivas: estatisticas.total_escolas - estatisticas.escolas_activas,
            escolas_bloqueadas: 0
        },
        dados_por_municipio: comparativo.map(m => ({
            municipio: m.municipio,
            total_escolas: m.total_escolas,
            total_alunos: m.total_alunos,
            taxa_aprovacao: m.media_aprovacao
        })),
        // Keep original fields for backward compatibility
        estatisticas: {
            ...estatisticas,
            media_geral: 0,
            taxa_aprovacao: 0,
            circulares_activas: 0
        },
        comparativo_municipios: comparativo,
        direcoes_municipais: direcoes
    };
}

/**
 * Generate a comparative report between municipalities
 */
export async function generateRelatorioComparativoMunicipios(
    provincia: string
): Promise<RelatorioProvincial> {
    const { data: { user } } = await supabase.auth.getUser();

    const comparativo = await fetchComparativoMunicipios(provincia);

    return {
        tipo: 'comparativo',
        provincia,
        periodo: {
            inicio: new Date().toISOString(),
            fim: new Date().toISOString()
        },
        dados: comparativo,
        generated_at: new Date().toISOString(),
        generated_by: user?.id || 'unknown'
    };
}

/**
 * Generate a municipal directorates report
 */
export async function generateRelatorioDirecoesMunicipais(
    provincia: string
): Promise<RelatorioProvincial> {
    const { data: { user } } = await supabase.auth.getUser();

    const direcoes = await fetchDirecoesMunicipaisProvincia(provincia);

    return {
        tipo: 'direcoes_municipais',
        provincia,
        periodo: {
            inicio: new Date().toISOString(),
            fim: new Date().toISOString()
        },
        dados: {
            direcoes,
            total: direcoes.length,
            activas: direcoes.filter(d => d.ativo).length,
            inactivas: direcoes.filter(d => !d.ativo).length
        },
        generated_at: new Date().toISOString(),
        generated_by: user?.id || 'unknown'
    };
}

/**
 * Generate a schools report
 */
export async function generateRelatorioEscolas(
    provincia: string
): Promise<RelatorioProvincial> {
    const { data: { user } } = await supabase.auth.getUser();

    const estatisticas = await fetchEstatisticasEscolasProvincia(provincia);

    return {
        tipo: 'escolas',
        provincia,
        periodo: {
            inicio: new Date().toISOString(),
            fim: new Date().toISOString()
        },
        dados: estatisticas,
        generated_at: new Date().toISOString(),
        generated_by: user?.id || 'unknown'
    };
}

/**
 * Generate a pedagogic report
 */
export async function generateRelatorioPedagogico(
    provincia: string,
    trimestre?: 1 | 2 | 3
): Promise<RelatorioProvincial> {
    const { data: { user } } = await supabase.auth.getUser();

    const indicadores = await fetchIndicadoresPorMunicipio(provincia);

    return {
        tipo: 'pedagogico',
        provincia,
        periodo: {
            inicio: new Date().toISOString(),
            fim: new Date().toISOString()
        },
        dados: {
            indicadores_por_municipio: indicadores,
            trimestre
        },
        generated_at: new Date().toISOString(),
        generated_by: user?.id || 'unknown'
    };
}

/**
 * Export report data to CSV format
 */
export function exportToCSV(data: unknown[], headers: string[]): string {
    if (!data || data.length === 0) return '';

    const rows = data.map(row => {
        return headers.map(header => {
            const value = (row as Record<string, unknown>)[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'string' && value.includes(',')) {
                return `"${value}"`;
            }
            return String(value);
        }).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}

/**
 * Prepare data for PDF export
 */
export function preparePDFData(relatorio: RelatorioConsolidadoProvincia): {
    titulo: string;
    subtitulo: string;
    secoes: { titulo: string; conteudo: string | unknown[] }[];
    rodape: string;
} {
    return {
        titulo: `Relatório Consolidado - ${relatorio.provincia}`,
        subtitulo: `Período: ${relatorio.periodo}`,
        secoes: [
            {
                titulo: 'Estatísticas Gerais',
                conteudo: [
                    { label: 'Total de Municípios', valor: relatorio.estatisticas.total_municipios },
                    { label: 'Direções Municipais', valor: relatorio.estatisticas.total_direcoes_municipais },
                    { label: 'Total de Escolas', valor: relatorio.estatisticas.total_escolas },
                    { label: 'Total de Professores', valor: relatorio.estatisticas.total_professores },
                    { label: 'Total de Alunos', valor: relatorio.estatisticas.total_alunos }
                ]
            },
            {
                titulo: 'Comparativo por Município',
                conteudo: relatorio.comparativo_municipios
            },
            {
                titulo: 'Direções Municipais',
                conteudo: relatorio.direcoes_municipais.map(d => ({
                    municipio: d.municipio,
                    director: d.nome,
                    escolas: d.escolas_count,
                    estado: d.ativo ? 'Activa' : 'Inactiva'
                }))
            }
        ],
        rodape: `Gerado em ${new Date().toLocaleDateString('pt-AO')} às ${new Date().toLocaleTimeString('pt-AO')}`
    };
}

/**
 * Generate downloadable report file
 */
export async function downloadRelatorio(
    provincia: string,
    formato: 'csv' | 'json'
): Promise<{ filename: string; content: string; mimeType: string }> {
    const relatorio = await generateRelatorioConsolidado(provincia);
    const timestamp = new Date().toISOString().split('T')[0];

    if (formato === 'csv') {
        // Export comparative data as CSV
        const csvContent = exportToCSV(
            relatorio.comparativo_municipios,
            ['municipio', 'total_escolas', 'total_alunos', 'total_professores', 'media_aprovacao', 'ranking']
        );
        return {
            filename: `relatorio_provincial_${provincia}_${timestamp}.csv`,
            content: csvContent,
            mimeType: 'text/csv;charset=utf-8;'
        };
    } else {
        return {
            filename: `relatorio_provincial_${provincia}_${timestamp}.json`,
            content: JSON.stringify(relatorio, null, 2),
            mimeType: 'application/json'
        };
    }
}
