/**
 * Provincial Schools Overview Component
 * Read-only view of all schools in the province
 */

import React, { useState } from 'react';
import { Icons } from '../../../components/ui/Icons';
import { useEscolasProvincial } from '../hooks/useEscolasProvincial';
import type { Escola } from '../../../types';
import { fetchEscolaDetalhesProvincial } from '../api/escolasProvincialQuery';

export const EscolasProvincialOverview: React.FC = () => {
    const {
        escolas,
        escolasAgrupadas,
        loading,
        error,
        filtros,
        setFiltros,
        estatisticas,
        municipios
    } = useEscolasProvincial();

    const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedEscola, setSelectedEscola] = useState<Escola | null>(null);
    const [escolaDetalhes, setEscolaDetalhes] = useState<{
        escola: Escola;
        total_professores: number;
        total_turmas: number;
        total_alunos: number;
    } | null>(null);
    const [loadingDetalhes, setLoadingDetalhes] = useState(false);

    const handleViewDetails = async (escola: Escola) => {
        setSelectedEscola(escola);
        setShowDetailsModal(true);
        setLoadingDetalhes(true);
        try {
            const detalhes = await fetchEscolaDetalhesProvincial(escola.id);
            setEscolaDetalhes(detalhes);
        } catch (err) {
            console.error('Error fetching school details:', err);
        } finally {
            setLoadingDetalhes(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800">
                    Consulta de Escolas
                </h1>
                <p className="text-gray-600 mt-1">
                    Visão geral das escolas da província (somente leitura)
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500">Total de Escolas</p>
                    <p className="text-2xl font-bold text-gray-800">{estatisticas.total_escolas}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500">Activas</p>
                    <p className="text-2xl font-bold text-green-600">{estatisticas.escolas_activas}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500">Bloqueadas</p>
                    <p className="text-2xl font-bold text-yellow-600">{estatisticas.escolas_bloqueadas}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500">Inactivas</p>
                    <p className="text-2xl font-bold text-red-600">{estatisticas.escolas_inactivas}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Pesquisar escolas..."
                                value={filtros.search || ''}
                                onChange={(e) => setFiltros({ ...filtros, search: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Municipality Filter */}
                    <select
                        value={filtros.municipio || ''}
                        onChange={(e) => setFiltros({ ...filtros, municipio: e.target.value || undefined })}
                        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Todos os municípios</option>
                        {municipios.map(mun => (
                            <option key={mun} value={mun}>{mun}</option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                        >
                            <Icons.Filter className="w-4 h-4" />
                            Estado
                            <Icons.ChevronDown className="w-4 h-4" />
                        </button>
                        {showFilterDropdown && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                                <button
                                    onClick={() => { setFiltros({ ...filtros, ativo: undefined, bloqueado: undefined }); setShowFilterDropdown(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50"
                                >
                                    Todas
                                </button>
                                <button
                                    onClick={() => { setFiltros({ ...filtros, ativo: true, bloqueado: false }); setShowFilterDropdown(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50"
                                >
                                    Activas
                                </button>
                                <button
                                    onClick={() => { setFiltros({ ...filtros, ativo: undefined, bloqueado: true }); setShowFilterDropdown(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50"
                                >
                                    Bloqueadas
                                </button>
                                <button
                                    onClick={() => { setFiltros({ ...filtros, ativo: false }); setShowFilterDropdown(false); }}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50"
                                >
                                    Inactivas
                                </button>
                            </div>
                        )}
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex border rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
                        >
                            Lista
                        </button>
                        <button
                            onClick={() => setViewMode('grouped')}
                            className={`px-4 py-2 ${viewMode === 'grouped' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
                        >
                            Agrupado
                        </button>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    <Icons.ExclamationCircle className="w-5 h-5 inline mr-2" />
                    {error}
                </div>
            )}

            {/* Content */}
            {viewMode === 'list' ? (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Escola
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Município
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Código
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acções
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {escolas.map(escola => (
                                <tr key={escola.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <Icons.School className="w-5 h-5 text-gray-400 mr-3" />
                                            <div className="font-medium text-gray-900">{escola.nome}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-gray-500">
                                            <Icons.LocationMarker className="w-4 h-4 mr-1" />
                                            {escola.municipio}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                        {escola.codigo_escola || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${escola.bloqueado
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : escola.ativo
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                            {escola.bloqueado ? 'Bloqueada' : escola.ativo ? 'Activa' : 'Inactiva'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleViewDetails(escola)}
                                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                            title="Ver detalhes"
                                        >
                                            <Icons.EyeOpen className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {escolas.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            Nenhuma escola encontrada
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {escolasAgrupadas.map(grupo => (
                        <div key={grupo.municipio} className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Icons.Building className="w-6 h-6 text-white" />
                                        <h3 className="text-xl font-semibold text-white">{grupo.municipio}</h3>
                                    </div>
                                    <div className="flex items-center gap-4 text-white text-sm">
                                        <span>{grupo.total} escolas</span>
                                        <span>|</span>
                                        <span>{grupo.activas} activas</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {grupo.escolas.map(escola => (
                                        <div
                                            key={escola.id}
                                            className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                                            onClick={() => handleViewDetails(escola)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="font-medium text-gray-900">{escola.nome}</h4>
                                                    <p className="text-sm text-gray-500">{escola.codigo_escola || 'Sem código'}</p>
                                                </div>
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${escola.bloqueado
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : escola.ativo
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {escola.bloqueado ? 'Bloq.' : escola.ativo ? 'Activa' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedEscola && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-xl font-semibold text-gray-800">
                                {selectedEscola.nome}
                            </h2>
                            <button
                                onClick={() => { setShowDetailsModal(false); setEscolaDetalhes(null); }}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <Icons.X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {loadingDetalhes ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : escolaDetalhes ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Município</p>
                                            <p className="font-medium">{escolaDetalhes.escola.municipio}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Província</p>
                                            <p className="font-medium">{escolaDetalhes.escola.provincia}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Código</p>
                                            <p className="font-medium">{escolaDetalhes.escola.codigo_escola || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Estado</p>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${escolaDetalhes.escola.bloqueado
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : escolaDetalhes.escola.ativo
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}>
                                                {escolaDetalhes.escola.bloqueado ? 'Bloqueada' : escolaDetalhes.escola.ativo ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="border-t pt-4">
                                        <h3 className="font-semibold text-gray-800 mb-3">Estatísticas</h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="bg-gray-50 rounded-lg p-4 text-center">
                                                <Icons.Users className="w-6 h-6 mx-auto text-blue-600 mb-2" />
                                                <p className="text-2xl font-bold text-gray-800">{escolaDetalhes.total_professores}</p>
                                                <p className="text-sm text-gray-500">Professores</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-4 text-center">
                                                <Icons.AcademicCap className="w-6 h-6 mx-auto text-green-600 mb-2" />
                                                <p className="text-2xl font-bold text-gray-800">{escolaDetalhes.total_alunos}</p>
                                                <p className="text-sm text-gray-500">Alunos</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-4 text-center">
                                                <Icons.Building className="w-6 h-6 mx-auto text-purple-600 mb-2" />
                                                <p className="text-2xl font-bold text-gray-800">{escolaDetalhes.total_turmas}</p>
                                                <p className="text-sm text-gray-500">Turmas</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 text-sm">
                                        <p>
                                            ℹ️ Esta é uma visão de consulta. A gestão directa desta escola é da responsabilidade
                                            da Direção Municipal de {escolaDetalhes.escola.municipio}.
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EscolasProvincialOverview;
