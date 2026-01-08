/**
 * usePedagogicData Hook
 * State management for pedagogical supervision data
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import type { IndicadoresPedagogicos, PautaReadOnly } from '../types';
import {
    fetchIndicadoresMunicipio,
    fetchIndicadoresEscola,
    fetchPautasEscola,
    fetchEstatisticasConsolidadas
} from '../api/pedagogicSupervision';

interface UsePedagogicDataReturn {
    indicadores: IndicadoresPedagogicos[];
    loading: boolean;
    error: string | null;
    pautas: PautaReadOnly[];
    estatisticasConsolidadas: {
        total_escolas: number;
        total_turmas: number;
        total_alunos: number;
        media_municipal: number;
        taxa_aprovacao_municipal: number;
        melhor_escola: { nome: string; media: number } | null;
        pior_escola: { nome: string; media: number } | null;
    } | null;
    anoLectivo: string;
    trimestre: 1 | 2 | 3 | undefined;
    setAnoLectivo: (ano: string) => void;
    setTrimestre: (trimestre: 1 | 2 | 3 | undefined) => void;
    refresh: () => Promise<void>;
    loadPautasEscola: (escolaId: string) => Promise<void>;
    loadIndicadoresEscola: (escolaId: string, escolaNome: string) => Promise<IndicadoresPedagogicos>;
}

export function usePedagogicData(): UsePedagogicDataReturn {
    const { user } = useAuth();
    const [indicadores, setIndicadores] = useState<IndicadoresPedagogicos[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pautas, setPautas] = useState<PautaReadOnly[]>([]);
    const [estatisticasConsolidadas, setEstatisticasConsolidadas] = useState<{
        total_escolas: number;
        total_turmas: number;
        total_alunos: number;
        media_municipal: number;
        taxa_aprovacao_municipal: number;
        melhor_escola: { nome: string; media: number } | null;
        pior_escola: { nome: string; media: number } | null;
    } | null>(null);
    const [anoLectivo, setAnoLectivo] = useState<string>('2025/2026');
    const [trimestre, setTrimestre] = useState<1 | 2 | 3 | undefined>(undefined);

    const municipio = user?.direcaoMunicipal?.municipio;

    const refresh = useCallback(async () => {
        if (!municipio) return;

        setLoading(true);
        setError(null);

        try {
            const [indicadoresData, consolidadoData] = await Promise.all([
                fetchIndicadoresMunicipio(municipio, anoLectivo, trimestre),
                fetchEstatisticasConsolidadas(municipio)
            ]);

            setIndicadores(indicadoresData);
            setEstatisticasConsolidadas(consolidadoData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar dados pedagógicos');
        } finally {
            setLoading(false);
        }
    }, [municipio, anoLectivo, trimestre]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const loadPautasEscola = useCallback(async (escolaId: string) => {
        try {
            const pautasData = await fetchPautasEscola(escolaId, anoLectivo, trimestre);
            setPautas(pautasData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar pautas');
        }
    }, [anoLectivo, trimestre]);

    const loadIndicadoresEscola = useCallback(async (escolaId: string, escolaNome: string) => {
        return fetchIndicadoresEscola(escolaId, escolaNome, anoLectivo, trimestre);
    }, [anoLectivo, trimestre]);

    return {
        indicadores,
        loading,
        error,
        pautas,
        estatisticasConsolidadas,
        anoLectivo,
        trimestre,
        setAnoLectivo,
        setTrimestre,
        refresh,
        loadPautasEscola,
        loadIndicadoresEscola
    };
}
