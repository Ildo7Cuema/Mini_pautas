/**
 * @component LicenseExpiredMessage
 * @description Modal/message displayed when school license has expired
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'

interface LicenseExpiredMessageProps {
    motivo?: string
    escolaNome?: string
    dataExpiracao?: string
    onClose?: () => void
}

export const LicenseExpiredMessage: React.FC<LicenseExpiredMessageProps> = ({
    motivo,
    escolaNome,
    dataExpiracao,
    onClose
}) => {
    const navigate = useNavigate()

    const handleRenew = () => {
        navigate('/escola/subscricao')
        onClose?.()
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
                {/* Header with warning icon */}
                <div className="bg-red-600 p-6 text-white text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold">Licença Expirada</h2>
                    {escolaNome && (
                        <p className="mt-2 text-red-100">{escolaNome}</p>
                    )}
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="text-center mb-6">
                        <p className="text-gray-700">
                            O acesso às funcionalidades do EduGest Angola está temporariamente suspenso
                            devido à expiração da licença.
                        </p>

                        {dataExpiracao && (
                            <p className="mt-2 text-sm text-gray-500">
                                Data de expiração: {new Date(dataExpiracao).toLocaleDateString('pt-AO')}
                            </p>
                        )}

                        {motivo && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600">
                                    <strong>Motivo:</strong> {motivo}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-yellow-800 mb-2">
                            O que pode fazer:
                        </h3>
                        <ul className="text-sm text-yellow-700 space-y-1">
                            <li>• Renovar a licença através da página de subscrição</li>
                            <li>• Contactar o suporte para assistência</li>
                            <li>• Ver informações da sua conta</li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleRenew}
                            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                        >
                            Renovar Licença
                        </button>

                        <div className="text-center">
                            <a
                                href="mailto:support@edugest.ao"
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Precisa de ajuda? Contacte o suporte
                            </a>
                        </div>
                    </div>
                </div>

                {/* Footer with support info */}
                <div className="bg-gray-50 px-6 py-4 border-t">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Suporte: +244 XXX XXX XXX</span>
                        <span>support@edugest.ao</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * Inline banner version for displaying in dashboard
 */
export const LicenseExpiredBanner: React.FC<{
    diasRestantes?: number
    onRenew?: () => void
}> = ({ diasRestantes, onRenew }) => {
    const isExpired = diasRestantes !== undefined && diasRestantes < 0
    const isExpiring = diasRestantes !== undefined && diasRestantes >= 0 && diasRestantes <= 7

    if (!isExpired && !isExpiring) return null

    return (
        <div className={`rounded-lg p-4 mb-4 ${isExpired ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
            }`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{isExpired ? '🚫' : '⚠️'}</span>
                    <div>
                        <p className={`font-semibold ${isExpired ? 'text-red-800' : 'text-yellow-800'}`}>
                            {isExpired
                                ? 'Sua licença expirou'
                                : `Sua licença expira em ${diasRestantes} dias`}
                        </p>
                        <p className={`text-sm ${isExpired ? 'text-red-600' : 'text-yellow-600'}`}>
                            {isExpired
                                ? 'Renove agora para continuar usando o sistema'
                                : 'Renove para evitar interrupções'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onRenew}
                    className={`px-4 py-2 rounded-lg text-white font-semibold ${isExpired ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'
                        }`}
                >
                    Renovar
                </button>
            </div>
        </div>
    )
}

export default LicenseExpiredMessage
