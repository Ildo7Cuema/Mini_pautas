/**
 * Hook for querying schools at provincial level (read-only)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import {
    fetchEscolasProvincia,
    fetchEscolasAgrupadasPorMunicipio,
    fetchEstatisticasEscolasProvincia,
    fetchMunicipiosProvincia,
    searchEscolasProvincia
} from '../api/escolasProvincialQuery';
import type { Escola } from '../../../types';
import type { FiltrosEscolasProvincia } from '../types';

interface UseEscolasProvincialReturn {
    escolas: Escola[];
    escolasAgrupadas: {
        municipio: string;
        escolas: Escola[];
        total: number;
        activas: number;
    }[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;

    // Filtering
    filtros: FiltrosEscolasProvincia;
    setFiltros: (filtros: FiltrosEscolasProvincia) => void;

    // Statistics
    estatisticas: {
        total_escolas: number;
        escolas_activas: number;
        escolas_bloqueadas: number;
        escolas_inactivas: number;
        total_por_municipio: Record<string, number>;
    };

    // Municipalities list
    municipios: string[];

    // Search
    search: (term: string) => Promise<Escola[]>;
}

export function useEscolasProvincial(): UseEscolasProvincialReturn {
    const { user } = useAuth();
    const [escolas, setEscolas] = useState<Escola[]>([]);
    const [escolasAgrupadas, setEscolasAgrupadas] = useState<{
        municipio: string;
        escolas: Escola[];
        total: number;
        activas: number;
    }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filtros, setFiltros] = useState<FiltrosEscolasProvincia>({});
    const [estatisticas, setEstatisticas] = useState({
        total_escolas: 0,
        escolas_activas: 0,
        escolas_bloqueadas: 0,
        escolas_inactivas: 0,
        total_por_municipio: {} as Record<string, number>
    });
    const [municipios, setMunicipios] = useState<string[]>([]);

    // Get province from user profile
    const provincia = user?.direcaoProvincial?.provincia;

    const loadEscolas = useCallback(async () => {
        if (!provincia) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const [escolasData, agrupadasData, statsData, municipiosData] = await Promise.all([
                fetchEscolasProvincia(provincia, filtros),
                fetchEscolasAgrupadasPorMunicipio(provincia),
                fetchEstatisticasEscolasProvincia(provincia),
                fetchMunicipiosProvincia(provincia)
            ]);

            setEscolas(escolasData);
            setEscolasAgrupadas(agrupadasData);
            setEstatisticas(statsData);
            setMunicipios(municipiosData);
        } catch (err) {
            console.error('Error loading schools:', err);
            setError('Erro ao carregar escolas');
        } finally {
            setLoading(false);
        }
    }, [provincia, filtros]);

    useEffect(() => {
        loadEscolas();
    }, [loadEscolas]);

    const search = useCallback(async (term: string): Promise<Escola[]> => {
        if (!provincia) return [];
        return await searchEscolasProvincia(provincia, term);
    }, [provincia]);

    // Memoized filtered schools
    const filteredEscolas = useMemo(() => {
        let filtered = escolas;

        if (filtros.municipio) {
            filtered = filtered.filter(e => e.municipio === filtros.municipio);
        }

        if (filtros.ativo !== undefined) {
            filtered = filtered.filter(e => e.ativo === filtros.ativo);
        }

        if (filtros.bloqueado !== undefined) {
            filtered = filtered.filter(e => e.bloqueado === filtros.bloqueado);
        }

        if (filtros.search) {
            const searchLower = filtros.search.toLowerCase();
            filtered = filtered.filter(e =>
                e.nome.toLowerCase().includes(searchLower) ||
                e.codigo_escola?.toLowerCase().includes(searchLower)
            );
        }

        return filtered;
    }, [escolas, filtros]);

    return {
        escolas: filteredEscolas,
        escolasAgrupadas,
        loading,
        error,
        refresh: loadEscolas,
        filtros,
        setFiltros,
        estatisticas,
        municipios,
        search
    };
}
