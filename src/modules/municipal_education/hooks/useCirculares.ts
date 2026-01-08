/**
 * useCirculares Hook
 * State management for municipal circulars
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import type { CircularMunicipal, LeituraCircular, CreateCircularRequest, TipoCircular } from '../types';
import {
    fetchCirculares,
    fetchCircular,
    createCircular,
    updateCircular,
    deleteCircular,
    fetchLeituras,
    fetchEscolasPendentes,
    fetchCircularesStats
} from '../api/circulares';

interface UseCircularesReturn {
    circulares: CircularMunicipal[];
    loading: boolean;
    error: string | null;
    stats: {
        total: number;
        circulares: number;
        avisos: number;
        comunicados: number;
        despachos: number;
        urgentes: number;
        este_mes: number;
    } | null;
    selectedCircular: CircularMunicipal | null;
    leituras: LeituraCircular[];
    escolasPendentes: { id: string; nome: string; codigo_escola: string }[];
    filtros: { tipo?: TipoCircular; urgente?: boolean };
    setFiltros: (filtros: { tipo?: TipoCircular; urgente?: boolean }) => void;
    refresh: () => Promise<void>;
    selectCircular: (circular: CircularMunicipal | null) => Promise<void>;
    criar: (request: CreateCircularRequest) => Promise<CircularMunicipal>;
    actualizar: (circularId: string, updates: Partial<CreateCircularRequest>) => Promise<void>;
    eliminar: (circularId: string) => Promise<void>;
}

export function useCirculares(): UseCircularesReturn {
    const { user } = useAuth();
    const [circulares, setCirculares] = useState<CircularMunicipal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<{
        total: number;
        circulares: number;
        avisos: number;
        comunicados: number;
        despachos: number;
        urgentes: number;
        este_mes: number;
    } | null>(null);
    const [selectedCircular, setSelectedCircular] = useState<CircularMunicipal | null>(null);
    const [leituras, setLeituras] = useState<LeituraCircular[]>([]);
    const [escolasPendentes, setEscolasPendentes] = useState<{ id: string; nome: string; codigo_escola: string }[]>([]);
    const [filtros, setFiltros] = useState<{ tipo?: TipoCircular; urgente?: boolean }>({});

    const municipio = user?.direcaoMunicipal?.municipio;
    const provincia = user?.direcaoMunicipal?.provincia;

    const refresh = useCallback(async () => {
        if (!municipio) return;

        setLoading(true);
        setError(null);

        try {
            const [circularesData, statsData] = await Promise.all([
                fetchCirculares(municipio, { ...filtros, publicado: true }),
                fetchCircularesStats(municipio)
            ]);

            setCirculares(circularesData);
            setStats(statsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar circulares');
        } finally {
            setLoading(false);
        }
    }, [municipio, filtros]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const selectCircular = useCallback(async (circular: CircularMunicipal | null) => {
        setSelectedCircular(circular);

        if (circular && municipio) {
            try {
                const [leiturasData, pendentesData] = await Promise.all([
                    fetchLeituras(circular.id),
                    fetchEscolasPendentes(circular.id, municipio)
                ]);
                setLeituras(leiturasData);
                setEscolasPendentes(pendentesData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erro ao carregar detalhes');
            }
        } else {
            setLeituras([]);
            setEscolasPendentes([]);
        }
    }, [municipio]);

    const criar = useCallback(async (request: CreateCircularRequest) => {
        if (!municipio || !provincia) {
            throw new Error('Município não configurado');
        }

        const nova = await createCircular(municipio, provincia, request);
        await refresh();
        return nova;
    }, [municipio, provincia, refresh]);

    const actualizar = useCallback(async (circularId: string, updates: Partial<CreateCircularRequest>) => {
        await updateCircular(circularId, updates);
        await refresh();
    }, [refresh]);

    const eliminar = useCallback(async (circularId: string) => {
        await deleteCircular(circularId);
        await refresh();
    }, [refresh]);

    return {
        circulares,
        loading,
        error,
        stats,
        selectedCircular,
        leituras,
        escolasPendentes,
        filtros,
        setFiltros,
        refresh,
        selectCircular,
        criar,
        actualizar,
        eliminar
    };
}
