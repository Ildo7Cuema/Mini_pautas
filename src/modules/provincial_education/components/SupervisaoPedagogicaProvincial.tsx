/**
 * Provincial Pedagogic Supervision Component
 * Display pedagogic indicators and comparisons between municipalities
 */

import React, { useState } from 'react';
import { Icons } from '../../../components/ui/Icons';
import { usePedagogicDataProvincial } from '../hooks/usePedagogicDataProvincial';

export const SupervisaoPedagogicaProvincial: React.FC = () => {
    const {
        indicadores,
        indicadoresPorMunicipio,
        comparativo,
        taxaAprovacao,
        loading,
        error,
        refresh,
        trimestre,
        setTrimestre
    } = usePedagogicDataProvincial();

    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">
                            Supervisão Pedagógica Provincial
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Indicadores pedagógicos e comparativos entre municípios
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Trimestre Filter */}
                        <select
                            value={trimestre || ''}
                            onChange={(e) => setTrimestre(e.target.value ? Number(e.target.value) as 1 | 2 | 3 : undefined)}
                            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Todos os Trimestres</option>
                            <option value="1">1º Trimestre</option>
                            <option value="2">2º Trimestre</option>
                            <option value="3">3º Trimestre</option>
                        </select>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Icons.Refresh className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Actualizar
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {/* Overall Provincial Stats */}
            {indicadores && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Icons.BarChart className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-gray-500 text-sm">Média Geral</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-800">{indicadores.media_geral.toFixed(1)}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Icons.TrendingUp className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="text-gray-500 text-sm">Taxa Aprovação</span>
                        </div>
                        <p className="text-3xl font-bold text-green-600">{indicadores.taxa_aprovacao.toFixed(1)}%</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Icons.AcademicCap className="w-5 h-5 text-purple-600" />
                            </div>
                            <span className="text-gray-500 text-sm">Total Alunos</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-800">{indicadores.total_alunos.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <Icons.Users className="w-5 h-5 text-indigo-600" />
                            </div>
                            <span className="text-gray-500 text-sm">Municípios</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-800">{indicadores.total_municipios}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Icons.Award className="w-5 h-5 text-orange-600" />
                            </div>
                            <span className="text-gray-500 text-sm">Escolas</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-800">{indicadores.total_escolas}</p>
                    </div>
                </div>
            )}

            {/* Classification Distribution */}
            {indicadores && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">Distribuição por Classificação</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-sm text-green-700 font-medium">Excelente (17-20)</p>
                            <p className="text-3xl font-bold text-green-600">{indicadores.notas_por_classificacao.excelente}</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-700 font-medium">Bom (14-16)</p>
                            <p className="text-3xl font-bold text-blue-600">{indicadores.notas_por_classificacao.bom}</p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                            <p className="text-sm text-yellow-700 font-medium">Suficiente (10-13)</p>
                            <p className="text-3xl font-bold text-yellow-600">{indicadores.notas_por_classificacao.suficiente}</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-sm text-red-700 font-medium">Insuficiente (&lt;10)</p>
                            <p className="text-3xl font-bold text-red-600">{indicadores.notas_por_classificacao.insuficiente}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Ranking by Municipality */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Top Performers */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Icons.Award className="w-5 h-5 text-amber-500" />
                        Ranking de Municípios
                    </h2>
                    <div className="space-y-3">
                        {comparativo.slice(0, 10).map((item, index) => (
                            <div
                                key={item.municipio}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${index === 0 ? 'bg-amber-100 text-amber-700' :
                                        index === 1 ? 'bg-gray-100 text-gray-600' :
                                            index === 2 ? 'bg-orange-100 text-orange-700' :
                                                'bg-gray-50 text-gray-500'
                                        }`}>
                                        {item.ranking}
                                    </span>
                                    <div>
                                        <p className="font-medium text-gray-800">{item.municipio}</p>
                                        <p className="text-xs text-gray-500">
                                            {item.total_escolas} escolas • {item.total_alunos} alunos
                                        </p>
                                    </div>
                                </div>
                                <span className="text-lg font-bold text-indigo-600">
                                    {item.media_aprovacao.toFixed(1)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Approval Rates */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Icons.TrendingUp className="w-5 h-5 text-green-500" />
                        Taxa de Aprovação por Município
                    </h2>
                    <div className="space-y-3">
                        {taxaAprovacao.slice(0, 10).map((item) => (
                            <div
                                key={item.municipio}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                                <span className="font-medium text-gray-800">{item.municipio}</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-32 bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${item.taxa_aprovacao >= 80 ? 'bg-green-500' :
                                                item.taxa_aprovacao >= 60 ? 'bg-yellow-500' :
                                                    'bg-red-500'
                                                }`}
                                            style={{ width: `${Math.min(item.taxa_aprovacao, 100)}%` }}
                                        ></div>
                                    </div>
                                    <span className={`font-bold ${item.taxa_aprovacao >= 80 ? 'text-green-600' :
                                        item.taxa_aprovacao >= 60 ? 'text-yellow-600' :
                                            'text-red-600'
                                        }`}>
                                        {item.taxa_aprovacao.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b">
                    <h2 className="text-xl font-semibold text-gray-800">Indicadores Detalhados por Município</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Município
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Escolas
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Professores
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Alunos
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Turmas
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Média
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Aprovação
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {indicadoresPorMunicipio.map(ind => (
                                <tr key={ind.municipio} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                        {ind.municipio}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                        {ind.total_escolas}
                                        <span className="text-gray-400 text-sm"> ({ind.escolas_activas} activas)</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                        {ind.total_professores}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                        {ind.total_alunos}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                        {ind.total_turmas}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`font-bold ${ind.media_geral >= 14 ? 'text-green-600' :
                                            ind.media_geral >= 10 ? 'text-yellow-600' :
                                                'text-red-600'
                                            }`}>
                                            {ind.media_geral.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${ind.taxa_aprovacao >= 80 ? 'bg-green-100 text-green-800' :
                                            ind.taxa_aprovacao >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                            {ind.taxa_aprovacao.toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SupervisaoPedagogicaProvincial;
