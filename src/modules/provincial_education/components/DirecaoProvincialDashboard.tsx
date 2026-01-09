/**
 * Provincial Education Dashboard
 * Main dashboard for the Provincial Education Direction
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icons } from '../../../components/ui/Icons';
import { useAuth } from '../../../contexts/AuthContext';
import { usePedagogicDataProvincial } from '../hooks/usePedagogicDataProvincial';
import { useDirecoesMunicipais } from '../hooks/useDirecoesMunicipais';
import { useCircularesProvinciais } from '../hooks/useCircularesProvinciais';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
    link?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle, link }) => {
    const Content = (
        <div className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${color} hover:shadow-xl transition-shadow`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 font-medium">{title}</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
                    {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-full bg-opacity-10 ${color.replace('border', 'bg')}`}>
                    {icon}
                </div>
            </div>
        </div>
    );

    if (link) {
        return <Link to={link}>{Content}</Link>;
    }
    return Content;
};

export const DirecaoProvincialDashboard: React.FC = () => {
    const { user } = useAuth();
    const { estatisticas, loading: loadingPedagogic, refresh: refreshPedagogic } = usePedagogicDataProvincial();
    const { direcoes, estatisticas: estatsDirecoes, loading: loadingDirecoes, refresh: refreshDirecoes } = useDirecoesMunicipais();
    const { estatisticas: estatsCirculares, loading: loadingCirculares } = useCircularesProvinciais();
    const [refreshing, setRefreshing] = useState(false);

    const provincia = user?.direcaoProvincial?.provincia || 'Desconhecida';
    const nomeDirector = user?.direcaoProvincial?.nome || 'Director Provincial';

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([refreshPedagogic(), refreshDirecoes()]);
        setRefreshing(false);
    };

    const loading = loadingPedagogic || loadingDirecoes || loadingCirculares;

    // Get recent history or alerts
    const direcoesInactivas = direcoes.filter(d => !d.ativo);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">
                            Dashboard Provincial
                        </h1>
                        <p className="text-gray-600 mt-1 flex items-center gap-2">
                            <Icons.LocationMarker className="w-4 h-4" />
                            <span>{provincia}</span>
                            <span className="text-gray-400">|</span>
                            <span>{nomeDirector}</span>
                        </p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        <Icons.Refresh className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard
                            title="Municípios"
                            value={estatisticas.total_municipios}
                            icon={<Icons.LocationMarker className="w-6 h-6 text-indigo-600" />}
                            color="border-indigo-600"
                            subtitle={`${estatsDirecoes.activas} direções activas`}
                        />
                        <StatCard
                            title="Direções Municipais"
                            value={estatisticas.total_direcoes_municipais}
                            icon={<Icons.Building className="w-6 h-6 text-blue-600" />}
                            color="border-blue-600"
                            link="/provincial-direcoes-municipais"
                            subtitle={`${estatsDirecoes.inactivas} inactivas`}
                        />
                        <StatCard
                            title="Escolas"
                            value={estatisticas.total_escolas}
                            icon={<Icons.School className="w-6 h-6 text-green-600" />}
                            color="border-green-600"
                            link="/provincial-escolas"
                            subtitle={`${estatisticas.escolas_activas} activas`}
                        />
                        <StatCard
                            title="Professores"
                            value={estatisticas.total_professores}
                            icon={<Icons.Users className="w-6 h-6 text-purple-600" />}
                            color="border-purple-600"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard
                            title="Alunos"
                            value={estatisticas.total_alunos}
                            icon={<Icons.AcademicCap className="w-6 h-6 text-orange-600" />}
                            color="border-orange-600"
                        />
                        <StatCard
                            title="Turmas"
                            value={estatisticas.total_turmas}
                            icon={<Icons.ClipboardList className="w-6 h-6 text-teal-600" />}
                            color="border-teal-600"
                        />
                        <StatCard
                            title="Circulares Activas"
                            value={estatsCirculares.publicadas}
                            icon={<Icons.DocumentText className="w-6 h-6 text-pink-600" />}
                            color="border-pink-600"
                            link="/provincial-circulares"
                            subtitle={`${estatsCirculares.rascunhos} rascunhos`}
                        />
                        <StatCard
                            title="Supervisão Pedagógica"
                            value="Ver"
                            icon={<Icons.TrendingUp className="w-6 h-6 text-amber-600" />}
                            color="border-amber-600"
                            link="/provincial-supervisao"
                        />
                    </div>

                    {/* Alerts and Quick Actions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Alerts */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <Icons.ExclamationCircle className="w-5 h-5 text-orange-500" />
                                Alertas
                            </h2>
                            {direcoesInactivas.length > 0 ? (
                                <div className="space-y-3">
                                    {direcoesInactivas.slice(0, 5).map(direcao => (
                                        <div
                                            key={direcao.id}
                                            className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100"
                                        >
                                            <div>
                                                <p className="font-medium text-gray-800">{direcao.nome}</p>
                                                <p className="text-sm text-gray-500">{direcao.municipio}</p>
                                            </div>
                                            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                                                Inactiva
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <Icons.ExclamationCircle className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                    <p>Nenhum alerta no momento</p>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">
                                Acções Rápidas
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <Link
                                    to="/provincial-direcoes-municipais"
                                    className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-colors"
                                >
                                    <Icons.Building className="w-5 h-5 text-blue-600" />
                                    <span className="font-medium text-gray-700">Gerir Direcções</span>
                                    <Icons.ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                                </Link>
                                <Link
                                    to="/provincial-escolas"
                                    className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-colors"
                                >
                                    <Icons.School className="w-5 h-5 text-green-600" />
                                    <span className="font-medium text-gray-700">Ver Escolas</span>
                                    <Icons.ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                                </Link>
                                <Link
                                    to="/provincial-circulares"
                                    className="flex items-center gap-3 p-4 bg-gradient-to-r from-pink-50 to-pink-100 rounded-lg hover:from-pink-100 hover:to-pink-200 transition-colors"
                                >
                                    <Icons.DocumentText className="w-5 h-5 text-pink-600" />
                                    <span className="font-medium text-gray-700">Nova Circular</span>
                                    <Icons.ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                                </Link>
                                <Link
                                    to="/provincial-relatorios"
                                    className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg hover:from-amber-100 hover:to-amber-200 transition-colors"
                                >
                                    <Icons.TrendingUp className="w-5 h-5 text-amber-600" />
                                    <span className="font-medium text-gray-700">Relatórios</span>
                                    <Icons.ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Municipal Directions Overview */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-800">
                                Direções Municipais
                            </h2>
                            <Link
                                to="/provincial-direcoes-municipais"
                                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                            >
                                Ver todas
                                <Icons.ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Município
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Director
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Escolas
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Estado
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {direcoes.slice(0, 5).map(direcao => (
                                        <tr key={direcao.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">{direcao.municipio}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-gray-900">{direcao.nome}</div>
                                                <div className="text-gray-500 text-sm">{direcao.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                                                {direcao.escolas_count}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${direcao.ativo
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {direcao.ativo ? 'Activa' : 'Inactiva'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default DirecaoProvincialDashboard;
