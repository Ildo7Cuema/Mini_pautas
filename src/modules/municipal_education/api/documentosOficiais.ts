/**
 * Documentos Oficiais API
 * Functions for generating official documents from templates
 */

import { supabase } from '../../../lib/supabaseClient';
import type {
    TipoDocumentoOficial,
    TemplateDocumento,
    DadosDocumentoOficial,
    DocumentoGerado
} from '../types';

const TEMPLATE_KEYS: Record<TipoDocumentoOficial, string> = {
    'declaracao_servico': 'template_declaracao_servico',
    'guia_marcha': 'template_guia_marcha',
    'ordem_servico': 'template_ordem_servico',
    'declaracao_bancaria': 'template_declaracao_bancaria'
};

/**
 * Fetch a document template
 */
export async function fetchTemplate(tipo: TipoDocumentoOficial): Promise<TemplateDocumento | null> {
    const chave = TEMPLATE_KEYS[tipo];

    const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', chave)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }

    return data?.valor as TemplateDocumento;
}

/**
 * Fetch all templates
 */
export async function fetchAllTemplates(): Promise<Record<TipoDocumentoOficial, TemplateDocumento | null>> {
    const templates: Record<TipoDocumentoOficial, TemplateDocumento | null> = {
        'declaracao_servico': null,
        'guia_marcha': null,
        'ordem_servico': null,
        'declaracao_bancaria': null
    };

    for (const tipo of Object.keys(TEMPLATE_KEYS) as TipoDocumentoOficial[]) {
        templates[tipo] = await fetchTemplate(tipo);
    }

    return templates;
}

/**
 * Replace placeholders in template text
 */
function replacePlaceholders(text: string, dados: DadosDocumentoOficial): string {
    let result = text;

    // Replace all {key} with corresponding value
    for (const [key, value] of Object.entries(dados)) {
        const placeholder = new RegExp(`\\{${key}\\}`, 'g');
        result = result.replace(placeholder, value || '');
    }

    return result;
}

/**
 * Generate a document from template
 */
export async function generateDocumento(
    tipo: TipoDocumentoOficial,
    dados: DadosDocumentoOficial,
    direcaoMunicipal: { nome: string; municipio: string; provincia: string }
): Promise<DocumentoGerado> {
    const template = await fetchTemplate(tipo);

    if (!template) {
        throw new Error(`Template não encontrado para: ${tipo}`);
    }

    // Validate required fields
    const camposFaltantes = template.campos_requeridos.filter(
        campo => !dados[campo as keyof DadosDocumentoOficial]
    );

    if (camposFaltantes.length > 0) {
        throw new Error(`Campos obrigatórios em falta: ${camposFaltantes.join(', ')}`);
    }

    // Build document content
    const partes: string[] = [];

    // Header
    partes.push('REPÚBLICA DE ANGOLA');
    partes.push('MINISTÉRIO DA EDUCAÇÃO');
    partes.push(`DIRECÇÃO MUNICIPAL DA EDUCAÇÃO DE ${direcaoMunicipal.municipio.toUpperCase()}`);
    partes.push(`PROVÍNCIA DE ${direcaoMunicipal.provincia.toUpperCase()}`);
    partes.push('');

    // Title
    partes.push(template.titulo);
    if (template.numero) {
        partes.push(replacePlaceholders(template.numero, dados));
    }
    partes.push('');

    // Body
    if (template.introducao) {
        partes.push(replacePlaceholders(template.introducao, dados));
    }
    partes.push(replacePlaceholders(template.corpo, dados));

    if (template.fundamentacao) {
        partes.push('');
        partes.push(replacePlaceholders(template.fundamentacao, dados));
    }

    if (template.observacoes) {
        partes.push('');
        partes.push(replacePlaceholders(template.observacoes, dados));
    }

    if (template.conclusao) {
        partes.push('');
        partes.push(replacePlaceholders(template.conclusao, dados));
    }

    // Footer
    partes.push('');
    partes.push(`${direcaoMunicipal.municipio}, ${formatDate(new Date())}`);
    partes.push('');
    partes.push(template.assinatura);
    partes.push('');
    partes.push(`_________________________`);
    partes.push(direcaoMunicipal.nome);

    return {
        tipo,
        titulo: template.titulo,
        conteudo: partes.join('\n'),
        data_geracao: new Date().toISOString(),
        gerado_por: direcaoMunicipal.nome,
        destinatario: dados.nome,
        escola: dados.escola
    };
}

/**
 * Format date in Portuguese
 */
function formatDate(date: Date): string {
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return `${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`;
}

/**
 * Get the display name for a document type
 */
export function getDocumentoDisplayName(tipo: TipoDocumentoOficial): string {
    const names: Record<TipoDocumentoOficial, string> = {
        'declaracao_servico': 'Declaração de Serviço',
        'guia_marcha': 'Guia de Marcha',
        'ordem_servico': 'Ordem de Serviço',
        'declaracao_bancaria': 'Declaração Bancária'
    };
    return names[tipo];
}

/**
 * Get required fields for a document type
 */
export async function getRequiredFields(tipo: TipoDocumentoOficial): Promise<string[]> {
    const template = await fetchTemplate(tipo);
    return template?.campos_requeridos || [];
}

/**
 * Update a template (SUPERADMIN only)
 */
export async function updateTemplate(
    tipo: TipoDocumentoOficial,
    template: TemplateDocumento
): Promise<void> {
    const chave = TEMPLATE_KEYS[tipo];

    const { error } = await supabase
        .from('configuracoes_sistema')
        .update({ valor: template })
        .eq('chave', chave);

    if (error) throw error;
}
