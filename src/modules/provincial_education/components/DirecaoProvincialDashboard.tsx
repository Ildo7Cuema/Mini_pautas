/**
 * Provincial Education Dashboard
 * Main dashboard for the Provincial Education Direction
 * Mobile-first design with native app-like experience
 */

import React, { useState } from 'react';
import { Icons } from '../../../components/ui/Icons';
import { useAuth } from '../../../contexts/AuthContext';
import { usePedagogicDataProvincial } from '../hooks/usePedagogicDataProvincial';
import { useDirecoesMunicipais } from '../hooks/useDirecoesMunicipais';
import { useCircularesProvinciais } from '../hooks/useCircularesProvinciais';

interface DirecaoProvincialDashboardProps {
    onNavigate?: (page: string, params?: Record<string, any>) => void;
}

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    iconBg: string;
    subtitle?: string;
    onClick?: () => void;
}

// Mobile-first stat card with touch feedback
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, iconBg, subtitle, onClick }) => {
    return (
        <button
            onClick={onClick}
            disabled={!onClick}
            className={`
                w-full bg-white rounded-2xl p-4 sm:p-5 
                border border-slate-200/60 shadow-sm
                transition-all duration-200
                ${onClick
                    ? 'cursor-pointer hover:shadow-md hover:border-slate-300 active:scale-[0.98]'
                    : 'cursor-default'
                }
                text-left
            `}
        >
            <div className="flex items-center gap-3">
                <div className={`flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 leading-none">
                        {value}
                    </p>
                    <p className="text-sm text-slate-500 font-medium mt-0.5 truncate">
                        {title}
                    </p>
                    {subtitle && (
                        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
                    )}
                </div>
                {onClick && (
                    <Icons.ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                )}
            </div>
        </button>
    );
};

// Quick action button with touch feedback
interface QuickActionProps {
    label: string;
    icon: React.ReactNode;
    iconBg: string;
    onClick: () => void;
}

const QuickAction: React.FC<QuickActionProps> = ({ label, icon, iconBg, onClick }) => (
    <button
        onClick={onClick}
        className="
            flex flex-col items-center gap-2 p-4 
            bg-white rounded-2xl border border-slate-200/60
            transition-all duration-200
            hover:shadow-md hover:border-slate-300 
            active:scale-[0.96]
            min-h-[100px] min-w-[80px]
        "
    >
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
            {icon}
        </div>
        <span className="text-xs font-medium text-slate-700 text-center leading-tight">
            {label}
        </span>
    </button>
);

// Mobile direction card
interface DirectionCardProps {
    municipio: string;
    nome: string;
    email: string;
    escolas_count: number;
    ativo: boolean;
    onClick?: () => void;
}

const DirectionCard: React.FC<DirectionCardProps> = ({
    municipio, nome, escolas_count, ativo, onClick
}) => (
    <button
        onClick={onClick}
        className="
            w-full bg-white rounded-2xl p-4
            border border-slate-200/60 shadow-sm
            transition-all duration-200
            hover:shadow-md active:scale-[0.98]
            text-left
        "
    >
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Icons.Building className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{municipio}</p>
                    <p className="text-sm text-slate-500 truncate">{nome}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-medium text-slate-600">{escolas_count}</span>
                <span className={`
                    w-2.5 h-2.5 rounded-full
                    ${ativo ? 'bg-emerald-500' : 'bg-red-500'}
                `} />
            </div>
        </div>
    </button>
);

export const DirecaoProvincialDashboard: React.FC<DirecaoProvincialDashboardProps> = ({ onNavigate }) => {
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

    // Get alerts
    const direcoesInactivas = direcoes.filter(d => !d.ativo);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header - Mobile optimized */}
            <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
                            Dashboard
                        </h1>
                        <div className="flex items-center gap-2 mt-1 text-slate-500">
                            <Icons.LocationMarker className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm truncate">{provincia}</span>
                        </div>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex-shrink-0 p-3 bg-primary-600 text-white rounded-xl shadow-sm hover:bg-primary-700 active:scale-95 transition-all min-w-[48px] min-h-[48px] flex items-center justify-center"
                    >
                        <Icons.Refresh className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
                </div>
            ) : (
                <div className="px-4 pb-6 sm:px-6 space-y-6">
                    {/* Key Stats - 2x2 grid on mobile */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                        <StatCard
                            title="Municípios"
                            value={estatisticas.total_municipios}
                            icon={<Icons.LocationMarker className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />}
                            iconBg="bg-gradient-to-br from-indigo-50 to-indigo-100"
                        />
                        <StatCard
                            title="Direções"
                            value={estatisticas.total_direcoes_municipais}
                            icon={<Icons.Building className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />}
                            iconBg="bg-gradient-to-br from-blue-50 to-blue-100"
                            subtitle={`${estatsDirecoes.activas} activas`}
                            onClick={() => onNavigate?.('provincial-direcoes-municipais')}
                        />
                        <StatCard
                            title="Escolas"
                            value={estatisticas.total_escolas}
                            icon={<Icons.School className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />}
                            iconBg="bg-gradient-to-br from-emerald-50 to-emerald-100"
                            subtitle={`${estatisticas.escolas_activas} activas`}
                            onClick={() => onNavigate?.('provincial-escolas')}
                        />
                        <StatCard
                            title="Alunos"
                            value={estatisticas.total_alunos.toLocaleString()}
                            icon={<Icons.AcademicCap className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />}
                            iconBg="bg-gradient-to-br from-orange-50 to-orange-100"
                        />
                    </div>

                    {/* Secondary Stats - Horizontal scroll on mobile */}
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-4">
                        <StatCard
                            title="Professores"
                            value={estatisticas.total_professores.toLocaleString()}
                            icon={<Icons.Users className="w-5 h-5 text-purple-600" />}
                            iconBg="bg-gradient-to-br from-purple-50 to-purple-100"
                        />
                        <StatCard
                            title="Turmas"
                            value={estatisticas.total_turmas.toLocaleString()}
                            icon={<Icons.ClipboardList className="w-5 h-5 text-teal-600" />}
                            iconBg="bg-gradient-to-br from-teal-50 to-teal-100"
                        />
                        <StatCard
                            title="Circulares"
                            value={estatsCirculares.publicadas}
                            icon={<Icons.DocumentText className="w-5 h-5 text-pink-600" />}
                            iconBg="bg-gradient-to-br from-pink-50 to-pink-100"
                            subtitle={`${estatsCirculares.rascunhos} rascunhos`}
                            onClick={() => onNavigate?.('provincial-circulares')}
                        />
                    </div>

                    {/* Quick Actions - Horizontal scroll on mobile */}
                    <div>
                        <h2 className="text-base font-semibold text-slate-900 mb-3">
                            Acções Rápidas
                        </h2>
                        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 lg:grid-cols-5">
                            <QuickAction
                                label="Direções"
                                icon={<Icons.Building className="w-6 h-6 text-blue-600" />}
                                iconBg="bg-gradient-to-br from-blue-50 to-blue-100"
                                onClick={() => onNavigate?.('provincial-direcoes-municipais')}
                            />
                            <QuickAction
                                label="Escolas"
                                icon={<Icons.School className="w-6 h-6 text-emerald-600" />}
                                iconBg="bg-gradient-to-br from-emerald-50 to-emerald-100"
                                onClick={() => onNavigate?.('provincial-escolas')}
                            />
                            <QuickAction
                                label="Supervisão"
                                icon={<Icons.TrendingUp className="w-6 h-6 text-amber-600" />}
                                iconBg="bg-gradient-to-br from-amber-50 to-amber-100"
                                onClick={() => onNavigate?.('provincial-supervisao')}
                            />
                            <QuickAction
                                label="Circulares"
                                icon={<Icons.DocumentText className="w-6 h-6 text-pink-600" />}
                                iconBg="bg-gradient-to-br from-pink-50 to-pink-100"
                                onClick={() => onNavigate?.('provincial-circulares')}
                            />
                            <QuickAction
                                label="Relatórios"
                                icon={<Icons.BarChart className="w-6 h-6 text-indigo-600" />}
                                iconBg="bg-gradient-to-br from-indigo-50 to-indigo-100"
                                onClick={() => onNavigate?.('provincial-relatorios')}
                            />
                        </div>
                    </div>

                    {/* Alerts - Only show if there are any */}
                    {direcoesInactivas.length > 0 && (
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200/60">
                            <div className="flex items-center gap-2 mb-3">
                                <Icons.ExclamationCircle className="w-5 h-5 text-amber-600" />
                                <h2 className="text-base font-semibold text-slate-900">
                                    Alertas ({direcoesInactivas.length})
                                </h2>
                            </div>
                            <div className="space-y-2">
                                {direcoesInactivas.slice(0, 3).map(direcao => (
                                    <div
                                        key={direcao.id}
                                        className="flex items-center justify-between p-3 bg-white/70 rounded-xl"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-medium text-slate-800 truncate">{direcao.municipio}</p>
                                            <p className="text-sm text-slate-500 truncate">{direcao.nome}</p>
                                        </div>
                                        <span className="flex-shrink-0 px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full border border-red-200">
                                            Inactiva
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {direcoesInactivas.length > 3 && (
                                <button
                                    onClick={() => onNavigate?.('provincial-direcoes-municipais')}
                                    className="mt-3 text-sm font-medium text-amber-700 hover:text-amber-800"
                                >
                                    Ver mais {direcoesInactivas.length - 3} alertas →
                                </button>
                            )}
                        </div>
                    )}

                    {/* Directions List - Cards on mobile, table on desktop */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-base font-semibold text-slate-900">
                                Direções Municipais
                            </h2>
                            <button
                                onClick={() => onNavigate?.('provincial-direcoes-municipais')}
                                className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
                            >
                                Ver todas
                                <Icons.ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Mobile: Cards */}
                        <div className="space-y-3 md:hidden">
                            {direcoes.slice(0, 5).map(direcao => (
                                <DirectionCard
                                    key={direcao.id}
                                    municipio={direcao.municipio}
                                    nome={direcao.nome}
                                    email={direcao.email}
                                    escolas_count={direcao.escolas_count}
                                    ativo={direcao.ativo}
                                    onClick={() => onNavigate?.('provincial-direcoes-municipais')}
                                />
                            ))}
                        </div>

                        {/* Desktop: Table */}
                        <div className="hidden md:block bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Município
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Director
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Escolas
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Estado
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {direcoes.slice(0, 5).map(direcao => (
                                        <tr key={direcao.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <span className="font-medium text-slate-900">{direcao.municipio}</span>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <div>
                                                    <p className="text-slate-900">{direcao.nome}</p>
                                                    <p className="text-sm text-slate-500">{direcao.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-slate-700">
                                                {direcao.escolas_count}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <span className={`
                                                    inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                                                    ${direcao.ativo
                                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                        : 'bg-red-100 text-red-700 border border-red-200'
                                                    }
                                                `}>
                                                    {direcao.ativo ? 'Activa' : 'Inactiva'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DirecaoProvincialDashboard;
