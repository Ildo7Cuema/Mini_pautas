/**
 * useEscolasManagement Hook
 * State management for school management functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import type { Escola } from '../../../types';
import type { EstadoEscola, HistoricoAdministrativoEscola } from '../types';
import {
    fetchEscolasMunicipio,
    fetchEscolaDetalhes,
    fetchHistoricoAdministrativo,
    fetchHistoricoMunicipio,
    fetchEstatisticasEstados,
    updateEstadoEscola,
    getEstadoEscola
} from '../api/escolasManagement';

interface UseEscolasManagementReturn {
    escolas: Escola[];
    loading: boolean;
    error: string | null;
    historico: HistoricoAdministrativoEscola[];
    estatisticasEstados: {
        activas: number;
        suspensas: number;
        bloqueadas: number;
        inactivas: number;
        total: number;
    } | null;
    selectedEscola: Escola | null;
    selectedEscolaDetalhes: {
        total_professores: number;
        total_turmas: number;
        total_alunos: number;
    } | null;
    refresh: () => Promise<void>;
    selectEscola: (escola: Escola | null) => void;
    loadEscolaDetalhes: (escolaId: string) => Promise<void>;
    loadHistoricoEscola: (escolaId: string) => Promise<void>;
    alterarEstado: (escolaId: string, novoEstado: EstadoEscola, motivo: string) => Promise<void>;
    getEstado: (escola: Escola) => EstadoEscola;
}

export function useEscolasManagement(): UseEscolasManagementReturn {
    const { user } = useAuth();
    const [escolas, setEscolas] = useState<Escola[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [historico, setHistorico] = useState<HistoricoAdministrativoEscola[]>([]);
    const [estatisticasEstados, setEstatisticasEstados] = useState<{
        activas: number;
        suspensas: number;
        bloqueadas: number;
        inactivas: number;
        total: number;
    } | null>(null);
    const [selectedEscola, setSelectedEscola] = useState<Escola | null>(null);
    const [selectedEscolaDetalhes, setSelectedEscolaDetalhes] = useState<{
        total_professores: number;
        total_turmas: number;
        total_alunos: number;
    } | null>(null);

    const municipio = user?.direcaoMunicipal?.municipio;

    const refresh = useCallback(async () => {
        if (!municipio) return;

        setLoading(true);
        setError(null);

        try {
            const [escolasData, historicoData, estadosData] = await Promise.all([
                fetchEscolasMunicipio(municipio),
                fetchHistoricoMunicipio(municipio, 20),
                fetchEstatisticasEstados(municipio)
            ]);

            setEscolas(escolasData);
            setHistorico(historicoData);
            setEstatisticasEstados(estadosData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar escolas');
        } finally {
            setLoading(false);
        }
    }, [municipio]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const selectEscola = useCallback((escola: Escola | null) => {
        setSelectedEscola(escola);
        setSelectedEscolaDetalhes(null);
    }, []);

    const loadEscolaDetalhes = useCallback(async (escolaId: string) => {
        try {
            const detalhes = await fetchEscolaDetalhes(escolaId);
            setSelectedEscola(detalhes.escola);
            setSelectedEscolaDetalhes({
                total_professores: detalhes.total_professores,
                total_turmas: detalhes.total_turmas,
                total_alunos: detalhes.total_alunos
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar detalhes');
        }
    }, []);

    const loadHistoricoEscola = useCallback(async (escolaId: string) => {
        try {
            const historicoEscola = await fetchHistoricoAdministrativo(escolaId);
            setHistorico(historicoEscola);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar histórico');
        }
    }, []);

    const alterarEstado = useCallback(async (
        escolaId: string,
        novoEstado: EstadoEscola,
        motivo: string
    ) => {
        try {
            await updateEstadoEscola(escolaId, novoEstado, motivo);
            await refresh();
        } catch (err) {
            throw err;
        }
    }, [refresh]);

    return {
        escolas,
        loading,
        error,
        historico,
        estatisticasEstados,
        selectedEscola,
        selectedEscolaDetalhes,
        refresh,
        selectEscola,
        loadEscolaDetalhes,
        loadHistoricoEscola,
        alterarEstado,
        getEstado: getEstadoEscola
    };
}
