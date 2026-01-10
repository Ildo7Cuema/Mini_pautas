/**
 * Hook for generating provincial reports
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import {
    generateRelatorioConsolidado,
    generateRelatorioComparativoMunicipios,
    generateRelatorioDirecoesMunicipais,
    generateRelatorioEscolas,
    generateRelatorioPedagogico,
    downloadRelatorio
} from '../api/relatoriosProvinciais';
import type {
    RelatorioProvincial,
    RelatorioConsolidadoProvincia
} from '../types';

type TipoRelatorio = 'consolidado' | 'comparativo' | 'direcoes_municipais' | 'escolas' | 'pedagogico';

interface UseRelatoriosProvinciaisReturn {
    loading: boolean;
    loadingExport: boolean;
    error: string | null;

    // Report generation
    generateRelatorio: (tipo: TipoRelatorio, opcoes?: { trimestre?: 1 | 2 | 3 }) => Promise<RelatorioProvincial | RelatorioConsolidadoProvincia | null>;

    // Current report
    relatorioAtual: RelatorioProvincial | RelatorioConsolidadoProvincia | null;
    tipoAtual: TipoRelatorio | null;

    // Export
    exportar: (formato: 'csv' | 'json') => Promise<void>;

    // Clear
    limpar: () => void;

    // Portuguese aliases
    gerarRelatorioConsolidado: (anoLectivo?: string, trimestre?: 1 | 2 | 3) => Promise<RelatorioConsolidadoProvincia | null>;
    exportarRelatorioCSV: (relatorio: RelatorioConsolidadoProvincia) => Promise<void>;
    exportarRelatorioJSON: (relatorio: RelatorioConsolidadoProvincia) => Promise<void>;
}

export function useRelatoriosProvinciais(): UseRelatoriosProvinciaisReturn {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [relatorioAtual, setRelatorioAtual] = useState<RelatorioProvincial | RelatorioConsolidadoProvincia | null>(null);
    const [tipoAtual, setTipoAtual] = useState<TipoRelatorio | null>(null);

    // Get province from user profile
    const provincia = user?.direcaoProvincial?.provincia;

    const generateRelatorio = useCallback(async (
        tipo: TipoRelatorio,
        opcoes?: { trimestre?: 1 | 2 | 3 }
    ): Promise<RelatorioProvincial | RelatorioConsolidadoProvincia | null> => {
        if (!provincia) {
            setError('Província não definida');
            return null;
        }

        try {
            setLoading(true);
            setError(null);

            let relatorio: RelatorioProvincial | RelatorioConsolidadoProvincia;

            switch (tipo) {
                case 'consolidado':
                    relatorio = await generateRelatorioConsolidado(provincia);
                    break;
                case 'comparativo':
                    relatorio = await generateRelatorioComparativoMunicipios(provincia);
                    break;
                case 'direcoes_municipais':
                    relatorio = await generateRelatorioDirecoesMunicipais(provincia);
                    break;
                case 'escolas':
                    relatorio = await generateRelatorioEscolas(provincia);
                    break;
                case 'pedagogico':
                    relatorio = await generateRelatorioPedagogico(provincia, opcoes?.trimestre);
                    break;
                default:
                    throw new Error(`Tipo de relatório desconhecido: ${tipo}`);
            }

            setRelatorioAtual(relatorio);
            setTipoAtual(tipo);
            return relatorio;
        } catch (err) {
            console.error('Error generating report:', err);
            setError('Erro ao gerar relatório');
            return null;
        } finally {
            setLoading(false);
        }
    }, [provincia]);

    const exportar = useCallback(async (formato: 'csv' | 'json'): Promise<void> => {
        if (!provincia) {
            setError('Província não definida');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { filename, content, mimeType } = await downloadRelatorio(provincia, formato);

            // Create download link
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error exporting report:', err);
            setError('Erro ao exportar relatório');
        } finally {
            setLoading(false);
        }
    }, [provincia]);

    // Helper functions with Portuguese names for page compatibility
    const gerarRelatorioConsolidado = useCallback(async (
        _anoLectivo?: string,
        trimestre?: 1 | 2 | 3
    ): Promise<RelatorioConsolidadoProvincia | null> => {
        const result = await generateRelatorio('consolidado', { trimestre });
        return result as RelatorioConsolidadoProvincia | null;
    }, [generateRelatorio]);

    const exportarRelatorioCSV = useCallback(async (_relatorio: RelatorioConsolidadoProvincia): Promise<void> => {
        await exportar('csv');
    }, [exportar]);

    const exportarRelatorioJSON = useCallback(async (_relatorio: RelatorioConsolidadoProvincia): Promise<void> => {
        await exportar('json');
    }, [exportar]);

    const limpar = useCallback(() => {
        setRelatorioAtual(null);
        setTipoAtual(null);
        setError(null);
    }, []);

    return {
        loading,
        loadingExport: loading,
        error,
        generateRelatorio,
        relatorioAtual,
        tipoAtual,
        exportar,
        limpar,
        // Portuguese aliases for page compatibility
        gerarRelatorioConsolidado,
        exportarRelatorioCSV,
        exportarRelatorioJSON
    };
}
