/*
component-meta:
  name: PWAInstallPrompt
  description: Modal profissional para solicitar instalação do PWA EduGest Angola
  tokens: [--color-primary, glassmorphism, animate-slide-up]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { usePWAInstall } from '../hooks/usePWAInstall'

export const PWAInstallPrompt: React.FC = () => {
    const { isIOS, showPrompt, promptInstall, dismissPrompt, isInstallable } = usePWAInstall()

    if (!showPrompt) return null

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && dismissPrompt()}
        >
            <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-3xl rounded-b-none md:rounded-b-2xl shadow-2xl animate-slide-up overflow-hidden">
                {/* Drag Handle - Mobile Only */}
                <div className="md:hidden flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 bg-slate-300 rounded-full" />
                </div>

                {/* Header with Gradient */}
                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 pt-6 pb-8 text-center relative overflow-hidden">
                    {/* Decorative circles */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

                    {/* App Icon */}
                    <div className="relative inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg shadow-blue-900/30 mb-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-1 relative">
                        EduGest Angola
                    </h2>
                    <p className="text-blue-100 text-sm relative">
                        Sistema de Gestão Educacional
                    </p>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    <h3 className="text-lg font-bold text-slate-900 text-center mb-2">
                        Instalar o Aplicativo
                    </h3>
                    <p className="text-sm text-slate-600 text-center mb-4 leading-relaxed">
                        Instale o EduGest Angola no seu dispositivo para acesso rápido e offline às suas turmas e notas.
                    </p>

                    {/* Benefits */}
                    <div className="space-y-2.5 mb-5">
                        <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className="text-sm text-slate-700 font-medium">Acesso instantâneo</span>
                        </div>
                        <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span className="text-sm text-slate-700 font-medium">Ícone na tela inicial</span>
                        </div>
                        <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span className="text-sm text-slate-700 font-medium">Experiência nativa</span>
                        </div>
                    </div>

                    {/* iOS Instructions */}
                    {isIOS && (
                        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="text-sm text-amber-800 font-medium mb-2">
                                Como instalar no iPhone/iPad:
                            </p>
                            <ol className="text-sm text-amber-700 space-y-1.5 list-decimal list-inside">
                                <li>Toque no ícone de <strong>Compartilhar</strong> <span className="inline-block w-5 h-5 align-middle">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 inline text-amber-600">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                    </svg>
                                </span></li>
                                <li>Role para baixo e toque em <strong>"Adicionar à Tela Inicial"</strong></li>
                                <li>Confirme tocando em <strong>"Adicionar"</strong></li>
                            </ol>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-4 md:px-6 pb-6 flex flex-col-reverse sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={dismissPrompt}
                        className="flex-1 px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all duration-200 touch-feedback min-h-touch"
                    >
                        Agora não
                    </button>

                    {isIOS ? (
                        <button
                            type="button"
                            onClick={dismissPrompt}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 touch-feedback min-h-touch"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Entendi
                        </button>
                    ) : isInstallable ? (
                        <button
                            type="button"
                            onClick={promptInstall}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 touch-feedback min-h-touch"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Instalar
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={dismissPrompt}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 touch-feedback min-h-touch"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Continuar
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
