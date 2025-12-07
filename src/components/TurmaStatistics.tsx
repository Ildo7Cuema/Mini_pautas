import React from 'react'

interface TurmaStatisticsProps {
    statistics: {
        total_alunos: number
        aprovados: number
        reprovados: number
        taxa_aprovacao: number
        media_turma: number
        nota_minima: number
        nota_maxima: number
        distribuicao: Record<string, number>
    }
}

export const TurmaStatistics: React.FC<TurmaStatisticsProps> = ({ statistics }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Students */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-600">Total de Alunos</p>
                        <p className="text-3xl font-bold text-slate-900 mt-2">{statistics.total_alunos}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Average Grade */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-600">Média da Turma</p>
                        <p className="text-3xl font-bold text-slate-900 mt-2">{statistics.media_turma.toFixed(2)}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Approved */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-600">Aprovados</p>
                        <p className="text-3xl font-bold text-green-600 mt-2">{statistics.aprovados}</p>
                        <p className="text-sm text-slate-500 mt-1">{statistics.taxa_aprovacao.toFixed(1)}%</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Failed */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-600">Reprovados</p>
                        <p className="text-3xl font-bold text-red-600 mt-2">{statistics.reprovados}</p>
                        <p className="text-sm text-slate-500 mt-1">{(100 - statistics.taxa_aprovacao).toFixed(1)}%</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Min/Max Grades */}
            <div className="bg-white rounded-lg shadow-md p-6 md:col-span-2">
                <p className="text-sm font-medium text-slate-600 mb-4">Intervalo de Notas</p>
                <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                        <p className="text-sm text-slate-500">Mínima</p>
                        <p className="text-2xl font-bold text-red-600 mt-1">{statistics.nota_minima.toFixed(2)}</p>
                    </div>
                    <div className="w-px h-12 bg-slate-200 mx-4"></div>
                    <div className="text-center flex-1">
                        <p className="text-sm text-slate-500">Máxima</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{statistics.nota_maxima.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Distribution */}
            <div className="bg-white rounded-lg shadow-md p-6 md:col-span-2">
                <p className="text-sm font-medium text-slate-600 mb-4">Distribuição de Classificações</p>
                <div className="space-y-3">
                    {Object.entries(statistics.distribuicao).map(([classificacao, count]) => {
                        const percentage = statistics.total_alunos > 0
                            ? (count / statistics.total_alunos) * 100
                            : 0

                        const colorClass =
                            classificacao === 'Excelente' ? 'bg-purple-500' :
                                classificacao === 'Bom' ? 'bg-blue-500' :
                                    classificacao === 'Suficiente' ? 'bg-yellow-500' :
                                        'bg-red-500'

                        return (
                            <div key={classificacao}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-slate-700">{classificacao}</span>
                                    <span className="text-slate-600 font-medium">{count} ({percentage.toFixed(1)}%)</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div
                                        className={`${colorClass} h-2 rounded-full transition-all duration-300`}
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
