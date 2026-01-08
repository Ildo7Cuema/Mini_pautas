/**
 * useFuncionarios Hook
 * State management for comprehensive staff queries with expanded categories
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import type {
    FuncionarioMunicipio,
    FiltrosFuncionarios,
    GrauAcademico
} from '../types';
import {
    fetchFuncionariosMunicipio,
    fetchFuncionariosEscola,
    fetchFuncionariosStats,
    searchFuncionarios
} from '../api/funcionariosQuery';

interface StaffStats {
    total: number;
    professores: number;
    secretarios: number;
    activos: number;
    inactivos: number;
    // New expanded stats
    direcao?: number;
    coordenacao?: number;
    apoio?: number;
    // By academic degree
    por_grau?: Record<GrauAcademico, number>;
    // By school
    por_escola: { escola_nome: string; total: number }[];
}

interface UseFuncionariosReturn {
    funcionarios: FuncionarioMunicipio[];
    loading: boolean;
    error: string | null;
    stats: StaffStats | null;
    filtros: FiltrosFuncionarios;
    setFiltros: (filtros: FiltrosFuncionarios) => void;
    refresh: () => Promise<void>;
    search: (query: string) => Promise<void>;
    loadFuncionariosEscola: (escolaId: string) => Promise<void>;
}

export function useFuncionarios(): UseFuncionariosReturn {
    const { user } = useAuth();
    const [funcionarios, setFuncionarios] = useState<FuncionarioMunicipio[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<StaffStats | null>(null);
    const [filtros, setFiltros] = useState<FiltrosFuncionarios>({});

    const municipio = user?.direcaoMunicipal?.municipio;

    const refresh = useCallback(async () => {
        if (!municipio) return;

        setLoading(true);
        setError(null);

        try {
            const [funcionariosData, statsData] = await Promise.all([
                fetchFuncionariosMunicipio(municipio, filtros),
                fetchFuncionariosStats(municipio)
            ]);

            setFuncionarios(funcionariosData);
            setStats(statsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar funcionários');
        } finally {
            setLoading(false);
        }
    }, [municipio, filtros]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const search = useCallback(async (query: string) => {
        if (!municipio) return;

        setLoading(true);
        try {
            const results = await searchFuncionarios(municipio, query);
            setFuncionarios(results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro na pesquisa');
        } finally {
            setLoading(false);
        }
    }, [municipio]);

    const loadFuncionariosEscola = useCallback(async (escolaId: string) => {
        try {
            const funcionariosEscola = await fetchFuncionariosEscola(escolaId);
            setFuncionarios(funcionariosEscola);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar funcionários');
        }
    }, []);

    return {
        funcionarios,
        loading,
        error,
        stats,
        filtros,
        setFiltros,
        refresh,
        search,
        loadFuncionariosEscola
    };
}
