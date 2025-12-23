/**
 * @component SubscriptionPage
 * @description Modern mobile-first subscription page for schools
 */

import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
    checkLicenseStatus,
    fetchTransactions,
    fetchPrices,
    createPayment,
    updatePrice
} from '../utils/license'
import { PriceEditModal } from './PriceEditModal'
import type { LicenseStatus, TransacaoPagamento, PrecoLicenca, PlanoLicenca } from '../types'

export const SubscriptionPage: React.FC = () => {
    const { escolaProfile, profile } = useAuth()
    const isSuperAdmin = profile?.tipo_perfil === 'SUPERADMIN'
    const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null)
    const [transactions, setTransactions] = useState<TransacaoPagamento[]>([])
    const [prices, setPrices] = useState<PrecoLicenca[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Payment modal
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [selectedPlano, setSelectedPlano] = useState<PlanoLicenca>('anual')
    const [processing, setProcessing] = useState(false)
    const [paymentResult, setPaymentResult] = useState<{
        success: boolean
        payment_url?: string
        reference?: string
        message?: string
    } | null>(null)

    // Price editing (SUPERADMIN only)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingPrice, setEditingPrice] = useState<PrecoLicenca | null>(null)

    const escolaId = escolaProfile?.id

    useEffect(() => {
        if (escolaId) {
            loadData()
        }
    }, [escolaId])

    const loadData = async () => {
        if (!escolaId) return

        try {
            setLoading(true)
            setError(null)

            const [statusData, transData, pricesData] = await Promise.all([
                checkLicenseStatus(escolaId),
                fetchTransactions(escolaId),
                fetchPrices()
            ])

            setLicenseStatus(statusData)
            setTransactions(transData)
            setPrices(pricesData)
        } catch (err) {
            console.error('Error loading subscription data:', err)
            setError('Erro ao carregar dados da subscrição')
        } finally {
            setLoading(false)
        }
    }

    const handlePayment = async () => {
        if (!escolaId) return

        try {
            setProcessing(true)
            setPaymentResult(null)

            const result = await createPayment({
                escola_id: escolaId,
                plano: selectedPlano
            })

            setPaymentResult({
                success: result.success,
                payment_url: result.payment_url,
                reference: result.reference,
                message: result.success
                    ? 'Pagamento iniciado! Siga as instruções abaixo.'
                    : 'Erro ao processar pagamento'
            })

            if (result.payment_url) {
                window.open(result.payment_url, '_blank')
            }
        } catch (err) {
            setPaymentResult({
                success: false,
                message: 'Erro ao processar pagamento. Tente novamente.'
            })
        } finally {
            setProcessing(false)
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-AO', {
            style: 'currency',
            currency: 'AOA'
        }).format(value)
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-AO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    const getSelectedPrice = () => {
        return prices.find(p => p.plano === selectedPlano)
    }

    const getDaysProgress = () => {
        if (!licenseStatus?.licenca) return 0
        const totalDays = licenseStatus.plano === 'trimestral' ? 90 : licenseStatus.plano === 'semestral' ? 180 : 365
        const remaining = licenseStatus.dias_restantes
        return Math.max(0, Math.min(100, ((totalDays - remaining) / totalDays) * 100))
    }

    const getStatusConfig = () => {
        if (!licenseStatus?.licenca) {
            return { color: 'gray', icon: '📋', text: 'Sem Licença', bg: 'bg-gray-50', border: 'border-gray-200' }
        }
        if (licenseStatus.valid && licenseStatus.dias_restantes > 30) {
            return { color: 'green', icon: '✅', text: 'Activa', bg: 'bg-gradient-to-br from-green-50 to-emerald-50', border: 'border-green-200' }
        }
        if (licenseStatus.valid && licenseStatus.dias_restantes <= 30) {
            return { color: 'yellow', icon: '⚠️', text: 'A Expirar', bg: 'bg-gradient-to-br from-yellow-50 to-amber-50', border: 'border-yellow-300' }
        }
        if (licenseStatus.estado === 'suspensa') {
            return { color: 'orange', icon: '🚫', text: 'Suspensa', bg: 'bg-gradient-to-br from-orange-50 to-amber-50', border: 'border-orange-300' }
        }
        return { color: 'red', icon: '❌', text: 'Expirada', bg: 'bg-gradient-to-br from-red-50 to-rose-50', border: 'border-red-300' }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-neutral-600">A carregar subscrição...</p>
                </div>
            </div>
        )
    }

    const statusConfig = getStatusConfig()

    return (
        <div className="min-h-screen bg-neutral-50 pb-24 md:pb-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-6 md:px-8">
                <h1 className="text-2xl md:text-3xl font-bold">Minha Subscrição</h1>
                <p className="text-primary-100 mt-1 text-sm md:text-base">Gerir a licença de uso do EduGest Angola</p>
            </div>

            <div className="px-4 md:px-8 -mt-4 space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
                        <p className="text-red-800 text-sm">{error}</p>
                    </div>
                )}

                {/* License Status Hero Card */}
                <div className={`rounded-2xl shadow-lg overflow-hidden ${statusConfig.bg} border-2 ${statusConfig.border} animate-slide-up`}>
                    <div className="p-5 md:p-6">
                        {licenseStatus?.licenca ? (
                            <>
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <span className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Estado da Licença</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-2xl">{statusConfig.icon}</span>
                                            <span className={`text-xl font-bold text-${statusConfig.color}-700`}>
                                                {statusConfig.text}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-2 rounded-full bg-${statusConfig.color}-100 border border-${statusConfig.color}-200`}>
                                        <span className={`text-lg font-bold text-${statusConfig.color}-700 capitalize`}>
                                            {licenseStatus.plano}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs text-neutral-500 mb-1">
                                        <span>Progresso do plano</span>
                                        <span>{licenseStatus.dias_restantes} dias restantes</span>
                                    </div>
                                    <div className="h-2 bg-white rounded-full overflow-hidden shadow-inner">
                                        <div
                                            className={`h-full bg-gradient-to-r from-${statusConfig.color}-400 to-${statusConfig.color}-600 transition-all duration-500`}
                                            style={{ width: `${getDaysProgress()}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/60 rounded-xl p-3">
                                        <p className="text-xs text-neutral-500">Início</p>
                                        <p className="text-sm font-semibold text-neutral-800">
                                            {licenseStatus.licenca.data_inicio ? formatDate(licenseStatus.licenca.data_inicio) : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="bg-white/60 rounded-xl p-3">
                                        <p className="text-xs text-neutral-500">Expira em</p>
                                        <p className="text-sm font-semibold text-neutral-800">
                                            {licenseStatus.data_fim ? formatDate(licenseStatus.data_fim) : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {/* Renewal Alert */}
                                {licenseStatus.valid && licenseStatus.dias_restantes <= 30 && (
                                    <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-xl animate-pulse-soft">
                                        <p className="text-yellow-800 text-sm font-medium">
                                            ⚠️ Renove agora para evitar interrupções no serviço!
                                        </p>
                                    </div>
                                )}

                                {/* CTA Button */}
                                <button
                                    onClick={() => setShowPaymentModal(true)}
                                    className={`mt-4 w-full py-3 rounded-xl font-semibold text-white transition-all touch-feedback ${!licenseStatus.valid
                                            ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                                            : licenseStatus.dias_restantes <= 30
                                                ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700'
                                                : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700'
                                        }`}
                                >
                                    {!licenseStatus.valid ? '🔄 Renovar Licença' : licenseStatus.dias_restantes <= 30 ? '⏰ Renovar Agora' : '📋 Gerir Plano'}
                                </button>
                            </>
                        ) : (
                            <div className="text-center py-6">
                                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center">
                                    <span className="text-4xl">📋</span>
                                </div>
                                <h3 className="text-xl font-bold text-neutral-800 mb-2">Sem Licença Activa</h3>
                                <p className="text-neutral-600 mb-4">
                                    Adquira uma licença para desbloquear todas as funcionalidades.
                                </p>
                                <button
                                    onClick={() => setShowPaymentModal(true)}
                                    className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold touch-feedback hover:from-primary-600 hover:to-primary-700"
                                >
                                    ✨ Adquirir Licença
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Plan Comparison Cards */}
                <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-neutral-800">Planos Disponíveis</h2>
                        {isSuperAdmin && (
                            <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded-lg">
                                ✏️ Editar
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {prices.map((price, index) => (
                            <div
                                key={price.id}
                                onClick={() => setSelectedPlano(price.plano)}
                                className={`relative rounded-2xl p-5 cursor-pointer transition-all duration-300 touch-feedback ${selectedPlano === price.plano
                                        ? 'bg-gradient-to-br from-primary-50 to-blue-50 border-2 border-primary-400 shadow-lg scale-[1.02]'
                                        : 'bg-white border-2 border-neutral-200 hover:border-primary-200 hover:shadow-md'
                                    }`}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Popular Badge */}
                                {price.plano === 'anual' && (
                                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                                        <span className="px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-md">
                                            ⭐ POPULAR
                                        </span>
                                    </div>
                                )}

                                {/* SUPERADMIN Edit Button */}
                                {isSuperAdmin && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setEditingPrice(price)
                                            setShowEditModal(true)
                                        }}
                                        className="absolute top-3 right-3 p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                        title="Editar preço"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                )}

                                {/* Selected Indicator */}
                                {selectedPlano === price.plano && (
                                    <div className="absolute top-3 right-3">
                                        <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                )}

                                <h3 className="text-lg font-bold text-neutral-800 capitalize mt-2">{price.plano}</h3>
                                <p className="text-3xl font-extrabold text-primary-600 mt-2">
                                    {formatCurrency(price.valor)}
                                </p>

                                {price.desconto_percentual > 0 && (
                                    <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                        💰 {price.desconto_percentual}% desconto
                                    </span>
                                )}

                                <p className="text-sm text-neutral-500 mt-3">{price.descricao}</p>

                                <div className="mt-4 pt-4 border-t border-neutral-100">
                                    <ul className="space-y-2 text-sm text-neutral-600">
                                        <li className="flex items-center gap-2">
                                            <span className="text-green-500">✓</span> Acesso completo
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="text-green-500">✓</span> Suporte prioritário
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="text-green-500">✓</span> Actualizações gratuitas
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => setShowPaymentModal(true)}
                        className="mt-4 w-full md:w-auto px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold touch-feedback hover:from-primary-600 hover:to-primary-700 transition-all"
                    >
                        {licenseStatus?.valid ? '📋 Renovar com este plano' : '✨ Subscrever Agora'}
                    </button>
                </div>

                {/* Transaction History */}
                <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
                    <h2 className="text-lg font-bold text-neutral-800 mb-4">Histórico de Pagamentos</h2>

                    {transactions.length > 0 ? (
                        <>
                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-3">
                                {transactions.map((trans) => (
                                    <div key={trans.id} className="bg-white rounded-xl p-4 shadow-sm border border-neutral-100">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-sm text-neutral-500">{formatDate(trans.created_at)}</p>
                                                <p className="text-lg font-bold text-neutral-800">{formatCurrency(trans.valor)}</p>
                                            </div>
                                            <TransactionStatusBadge estado={trans.estado} />
                                        </div>
                                        <div className="flex justify-between text-sm text-neutral-500 pt-3 border-t border-neutral-100">
                                            <span className="capitalize">{trans.metodo_pagamento || trans.provider}</span>
                                            <span className="font-mono text-xs">{trans.provider_transaction_id || '-'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
                                <table className="min-w-full">
                                    <thead className="bg-neutral-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Data</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Valor</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Método</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Estado</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Referência</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        {transactions.map((trans) => (
                                            <tr key={trans.id} className="hover:bg-neutral-50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-neutral-800">{formatDate(trans.created_at)}</td>
                                                <td className="px-6 py-4 text-sm font-semibold text-neutral-800">{formatCurrency(trans.valor)}</td>
                                                <td className="px-6 py-4 text-sm text-neutral-600 capitalize">{trans.metodo_pagamento || trans.provider}</td>
                                                <td className="px-6 py-4"><TransactionStatusBadge estado={trans.estado} /></td>
                                                <td className="px-6 py-4 text-sm text-neutral-500 font-mono">{trans.provider_transaction_id || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white rounded-xl p-8 text-center border border-neutral-100">
                            <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
                                <span className="text-2xl">💳</span>
                            </div>
                            <p className="text-neutral-500">Nenhum pagamento encontrado</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Modal - Full Screen on Mobile */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-3xl p-6 md:mx-4 animate-slide-up max-h-[90vh] overflow-y-auto">
                        <div className="w-12 h-1 bg-neutral-300 rounded-full mx-auto mb-4 md:hidden" />

                        <h2 className="text-xl font-bold text-neutral-800 mb-6">
                            {licenseStatus?.valid ? '🔄 Renovar Licença' : '✨ Adquirir Licença'}
                        </h2>

                        {!paymentResult ? (
                            <>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        Plano Selecionado
                                    </label>
                                    <select
                                        value={selectedPlano}
                                        onChange={(e) => setSelectedPlano(e.target.value as PlanoLicenca)}
                                        className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                                    >
                                        {prices.map((price) => (
                                            <option key={price.id} value={price.plano}>
                                                {price.plano.charAt(0).toUpperCase() + price.plano.slice(1)} - {formatCurrency(price.valor)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-4 mb-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-neutral-600">Total a Pagar</span>
                                        <span className="text-2xl font-bold text-primary-600">
                                            {getSelectedPrice() ? formatCurrency(getSelectedPrice()!.valor) : '-'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowPaymentModal(false)}
                                        className="flex-1 px-4 py-3 border border-neutral-300 rounded-xl font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handlePayment}
                                        disabled={processing}
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold disabled:opacity-50 transition-all"
                                    >
                                        {processing ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Processando...
                                            </span>
                                        ) : '💳 Pagar Agora'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className={`p-4 rounded-xl mb-6 ${paymentResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                    <p className={`font-medium ${paymentResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                        {paymentResult.message}
                                    </p>

                                    {paymentResult.reference && (
                                        <div className="mt-4 p-3 bg-white rounded-lg border">
                                            <p className="text-xs text-neutral-500">Referência de Pagamento</p>
                                            <p className="text-lg font-mono font-bold text-neutral-800">{paymentResult.reference}</p>
                                        </div>
                                    )}

                                    {paymentResult.payment_url && (
                                        <a
                                            href={paymentResult.payment_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-4 block text-center px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold"
                                        >
                                            🔗 Abrir Página de Pagamento
                                        </a>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        setShowPaymentModal(false)
                                        setPaymentResult(null)
                                        loadData()
                                    }}
                                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                                >
                                    Fechar
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Price Edit Modal (SUPERADMIN only) */}
            <PriceEditModal
                price={editingPrice}
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false)
                    setEditingPrice(null)
                }}
                onSave={async (id, updates) => {
                    await updatePrice(id, updates)
                    const updatedPrices = await fetchPrices()
                    setPrices(updatedPrices)
                }}
            />
        </div>
    )
}

// Helper Components
const TransactionStatusBadge: React.FC<{ estado: string }> = ({ estado }) => {
    const config: Record<string, { bg: string, text: string, icon: string }> = {
        sucesso: { bg: 'bg-green-100', text: 'text-green-700', icon: '✓' },
        pendente: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '⏳' },
        processando: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '⚙️' },
        falha: { bg: 'bg-red-100', text: 'text-red-700', icon: '✗' },
        cancelado: { bg: 'bg-neutral-100', text: 'text-neutral-600', icon: '—' }
    }

    const { bg, text, icon } = config[estado] || config.cancelado

    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${bg} ${text} text-xs font-semibold rounded-full`}>
            <span>{icon}</span>
            {estado.charAt(0).toUpperCase() + estado.slice(1)}
        </span>
    )
}

export default SubscriptionPage
