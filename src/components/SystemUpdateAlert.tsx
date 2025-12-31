/*
component-meta:
  name: SystemUpdateAlert
  description: Modal para alertar usuários sobre nova versão do sistema
  tokens: [--color-primary, glassmorphism, animate-slide-up]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { useServiceWorkerUpdate } from '../hooks/useServiceWorkerUpdate'

export const SystemUpdateAlert: React.FC = () => {
    const { showUpdateAlert, updateServiceWorker, dismissUpdate } = useServiceWorkerUpdate()

    if (!showUpdateAlert) return null

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-[60] animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && dismissUpdate()}
        >
            <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-3xl rounded-b-none md:rounded-b-2xl shadow-2xl animate-slide-up overflow-hidden">
                {/* Drag Handle - Mobile Only */}
                <div className="md:hidden flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 bg-slate-300 rounded-full" />
                </div>

                {/* Header with Gradient */}
                <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 px-6 pt-6 pb-8 text-center relative overflow-hidden">
                    {/* Decorative circles */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

                    {/* Update Icon */}
                    <div className="relative inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg shadow-emerald-900/30 mb-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center">
                            <svg className="w-8 h-8 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-1 relative">
                        Nova Versão Disponível!
                    </h2>
                    <p className="text-emerald-100 text-sm relative">
                        EduGest Angola foi atualizado
                    </p>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
                        Atualização do Sistema
                    </h3>
                    <p className="text-sm text-slate-600 text-center mb-4 leading-relaxed">
                        Uma nova versão do EduGest Angola está disponível com melhorias e correções. Recomendamos atualizar agora para obter a melhor experiência.
                    </p>

                    {/* Update Benefits */}
                    <div className="space-y-2.5 mb-5">
                        <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                            <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-sm text-slate-700 font-medium">Novas funcionalidades</span>
                        </div>
                        <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className="text-sm text-slate-700 font-medium">Melhor performance</span>
                        </div>
                        <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <span className="text-sm text-slate-700 font-medium">Correções de segurança</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-4 md:px-6 pb-6 flex flex-col-reverse sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={dismissUpdate}
                        className="flex-1 px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all duration-200 touch-feedback min-h-touch"
                    >
                        Mais tarde
                    </button>

                    <button
                        type="button"
                        onClick={updateServiceWorker}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25 touch-feedback min-h-touch"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Atualizar Agora
                    </button>
                </div>
            </div>
        </div>
    )
}
