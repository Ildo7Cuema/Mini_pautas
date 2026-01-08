/**
 * useRelatoriosMunicipais Hook
 * State management for municipal reports
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import type { EstatisticasMunicipioCompletas } from '../types';
import {
    fetchEstatisticasCompletas,
    generateRelatorioEscolas,
    generateRelatorioAprovacao,
    generateRelatorioFuncionarios,
    generateRelatorioSolicitacoes
} from '../api/relatorios';

interface UseRelatoriosMunicipaisReturn {
    estatisticas: EstatisticasMunicipioCompletas | null;
    loading: boolean;
    error: string | null;
    relatorioActual: any | null;
    tipoRelatorioActual: 'escolas' | 'aprovacao' | 'funcionarios' | 'solicitacoes' | null;
    loadEstatisticas: () => Promise<void>;
    generateRelatorio: (
        tipo: 'escolas' | 'aprovacao' | 'funcionarios' | 'solicitacoes',
        filtros?: { anoLectivo?: string; trimestre?: 1 | 2 | 3; dataInicio?: string; dataFim?: string }
    ) => Promise<any>;
    clearRelatorio: () => void;
}

export function useRelatoriosMunicipais(): UseRelatoriosMunicipaisReturn {
    const { user } = useAuth();
    const [estatisticas, setEstatisticas] = useState<EstatisticasMunicipioCompletas | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [relatorioActual, setRelatorioActual] = useState<any | null>(null);
    const [tipoRelatorioActual, setTipoRelatorioActual] = useState<'escolas' | 'aprovacao' | 'funcionarios' | 'solicitacoes' | null>(null);

    const municipio = user?.direcaoMunicipal?.municipio;

    const loadEstatisticas = useCallback(async () => {
        if (!municipio) return;

        setLoading(true);
        setError(null);

        try {
            const stats = await fetchEstatisticasCompletas(municipio);
            setEstatisticas(stats);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas');
        } finally {
            setLoading(false);
        }
    }, [municipio]);

    const generateRelatorio = useCallback(async (
        tipo: 'escolas' | 'aprovacao' | 'funcionarios' | 'solicitacoes',
        filtros?: { anoLectivo?: string; trimestre?: 1 | 2 | 3; dataInicio?: string; dataFim?: string }
    ) => {
        if (!municipio) {
            throw new Error('Município não configurado');
        }

        setLoading(true);
        setError(null);

        try {
            let relatorio;

            switch (tipo) {
                case 'escolas':
                    relatorio = await generateRelatorioEscolas(municipio);
                    break;
                case 'aprovacao':
                    relatorio = await generateRelatorioAprovacao(
                        municipio,
                        filtros?.anoLectivo,
                        filtros?.trimestre
                    );
                    break;
                case 'funcionarios':
                    relatorio = await generateRelatorioFuncionarios(municipio);
                    break;
                case 'solicitacoes':
                    relatorio = await generateRelatorioSolicitacoes(
                        municipio,
                        filtros?.dataInicio,
                        filtros?.dataFim
                    );
                    break;
            }

            setRelatorioActual(relatorio);
            setTipoRelatorioActual(tipo);
            return relatorio;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao gerar relatório');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [municipio]);

    const clearRelatorio = useCallback(() => {
        setRelatorioActual(null);
        setTipoRelatorioActual(null);
    }, []);

    return {
        estatisticas,
        loading,
        error,
        relatorioActual,
        tipoRelatorioActual,
        loadEstatisticas,
        generateRelatorio,
        clearRelatorio
    };
}
