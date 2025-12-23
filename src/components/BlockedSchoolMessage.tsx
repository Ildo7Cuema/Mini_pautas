/**
 * @component BlockedSchoolMessage
 * @description Professional modal displayed when a user tries to access a blocked school
 */

import React, { useEffect } from 'react'

interface BlockedSchoolMessageProps {
    reason?: string
    type: 'blocked' | 'inactive'
    onClose: () => void
}

export const BlockedSchoolMessage: React.FC<BlockedSchoolMessageProps> = ({ reason, type, onClose }) => {
    useEffect(() => {
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [])

    const isBlocked = type === 'blocked'

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            {/* Modal Container */}
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
                {/* Header with gradient */}
                <div className={`${isBlocked ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-amber-600 to-amber-700'} px-8 py-6`}>
                    <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className="flex-shrink-0">
                            <div className={`h-16 w-16 rounded-full ${isBlocked ? 'bg-red-500/30' : 'bg-amber-500/30'} flex items-center justify-center backdrop-blur-sm border-2 ${isBlocked ? 'border-red-300' : 'border-amber-300'}`}>
                                {isBlocked ? (
                                    <svg className="h-9 w-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                ) : (
                                    <svg className="h-9 w-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                )}
                            </div>
                        </div>

                        {/* Title */}
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold text-white mb-1">
                                {isBlocked ? 'Acesso Bloqueado' : 'Acesso Temporariamente Indisponível'}
                            </h3>
                            <p className="text-red-100 text-sm">
                                EduGest Angola - Sistema de Gestão Escolar
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-8 py-6">
                    {/* Main Message */}
                    <div className="mb-6">
                        <div className={`${isBlocked ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'} border-l-4 rounded-r-lg p-4 mb-4`}>
                            <p className={`${isBlocked ? 'text-red-900' : 'text-amber-900'} font-semibold mb-2`}>
                                {isBlocked ? '🚫 Instituição Bloqueada' : '⏸️ Instituição Inactiva'}
                            </p>
                            <p className={`${isBlocked ? 'text-red-700' : 'text-amber-700'} text-sm leading-relaxed`}>
                                {reason || (isBlocked
                                    ? 'Esta instituição de ensino foi temporariamente bloqueada pelo administrador do sistema.'
                                    : 'Esta instituição de ensino encontra-se temporariamente inactiva.'
                                )}
                            </p>
                        </div>

                        {/* Additional Info */}
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <p className="text-slate-700 text-sm mb-3">
                                <strong>O que fazer agora?</strong>
                            </p>
                            <ul className="space-y-2 text-sm text-slate-600">
                                <li className="flex items-start gap-2">
                                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Contacte o administrador da sua instituição para mais informações</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <div className="flex-1">
                                        <p className="mb-1">Em caso de dúvidas, entre em contacto com o suporte do EduGest Angola</p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <strong className="text-blue-600">Tel.: +244 921 923 232</strong>
                                            <span className="text-slate-400">|</span>
                                            <a
                                                href="https://wa.me/244921923232"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-green-600 hover:text-green-700 font-medium transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                </svg>
                                                WhatsApp
                                            </a>
                                        </div>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        {/* Payment Button - Primary Action */}
                        {isBlocked && (
                            <button
                                onClick={() => window.location.href = '/pagamento-escola'}
                                className="w-full px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                Pagar Online
                            </button>
                        )}

                        {/* Close Button - Secondary Action */}
                        <button
                            onClick={onClose}
                            className={`w-full px-6 py-3 ${isBlocked ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white'} rounded-lg font-semibold transition-all duration-200`}
                        >
                            Entendido
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-8 py-4 border-t border-slate-200">
                    <p className="text-center text-xs text-slate-500">
                        © 2024 EduGest Angola - Todos os direitos reservados
                    </p>
                </div>
            </div>
        </div>
    )
}
