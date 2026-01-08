import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Input } from './ui/Input'
import { Icons } from './ui/Icons'
import { createSolicitacao, fetchMySolicitacoes, fetchTiposDocumento } from '../utils/documentRequests'
import type { SolicitacaoDocumento, TipoDocumento, EstadoSolicitacao } from '../types'
import { formatDataSolicitacao, getEstadoLabel } from '../utils/solicitacoes'

export const ProfessorDocumentRequestsPage = () => {
    const { professorProfile, escolaProfile } = useAuth()
    const [activeTab, setActiveTab] = useState<'list' | 'new'>('list')
    const [loading, setLoading] = useState(false)
    const [solicitacoes, setSolicitacoes] = useState<SolicitacaoDocumento[]>([])
    const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([])
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Form State
    const [formData, setFormData] = useState({
        entidade_destino: 'DIRECAO_MUNICIPAL' as 'ESCOLA' | 'DIRECAO_MUNICIPAL',
        tipo_documento_id: '',
        assunto: '',
        descricao: '',
        urgente: false
    })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [docsData, typesData] = await Promise.all([
                fetchMySolicitacoes(),
                fetchTiposDocumento()
            ])
            setSolicitacoes(docsData)
            setTiposDocumento(typesData)
        } catch (err) {
            console.error('Error loading data:', err)
            setError('Erro ao carregar dados.')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!professorProfile?.escola_id) {
            setError('Erro: Escola não associada ao perfil.')
            return
        }

        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const selectedType = tiposDocumento.find(t => t.id === formData.tipo_documento_id)
            const assunto = selectedType ? selectedType.nome : formData.assunto || 'Solicitação de Documento'

            await createSolicitacao({
                escola_id: professorProfile.escola_id,
                tipo_documento_id: formData.tipo_documento_id,
                assunto: assunto,
                descricao: formData.descricao,
                urgente: formData.urgente,
                entidade_destino: formData.entidade_destino,
                dados_adicionais: {}
            })

            setSuccess('Solicitação enviada com sucesso!')
            setFormData({
                entidade_destino: 'DIRECAO_MUNICIPAL',
                tipo_documento_id: '',
                assunto: '',
                descricao: '',
                urgente: false
            })
            setActiveTab('list')
            loadData()
        } catch (err) {
            console.error('Error creating request:', err)
            setError('Erro ao enviar solicitação.')
        } finally {
            setLoading(false)
        }
    }

    const linkedEscolaName = professorProfile?.escola?.nome || 'Escola Vinculada'

    return (
        <div className="space-y-6 pb-24 md:pb-6 max-w-5xl mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Icons.ClipboardList className="w-8 h-8 text-indigo-600" />
                        Documentos
                    </h1>
                    <p className="text-slate-500">Solicite declarações e outros documentos oficiais.</p>
                </div>
                <button
                    onClick={() => setActiveTab(activeTab === 'list' ? 'new' : 'list')}
                    className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all shadow-md ${activeTab === 'list'
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-500/25'
                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                        }`}
                >
                    {activeTab === 'list' ? (
                        <>
                            <Icons.UserPlus className="w-5 h-5" /> {/* Using UserPlus as generic 'Add' icon if Plus not avail */}
                            <span>Nova Solicitação</span>
                        </>
                    ) : (
                        <>
                            <Icons.Check className="w-5 h-5 rotate-45 transform origin-center text-slate-400" /> {/* Hacky 'Back' via Xish icon or similar? using Check for now or generic text */}
                            <span>Ver Histórico</span>
                        </>
                    )}
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 animate-slide-down">
                    <Icons.Info className="w-5 h-5" />
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-3 animate-slide-down">
                    <Icons.Check className="w-5 h-5" />
                    {success}
                </div>
            )}

            {activeTab === 'new' ? (
                <Card className="animate-fade-in">
                    <CardHeader className="border-b border-slate-100 p-6">
                        <h2 className="text-lg font-semibold text-slate-900">Nova Solicitação</h2>
                    </CardHeader>
                    <CardBody className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Entity Selection */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-700">Para quem é o pedido?</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className={`
                                        relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all
                                        ${formData.entidade_destino === 'DIRECAO_MUNICIPAL'
                                            ? 'border-indigo-600 bg-indigo-50/50'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'}
                                    `}>
                                        <input
                                            type="radio"
                                            name="entidade"
                                            className="sr-only"
                                            checked={formData.entidade_destino === 'DIRECAO_MUNICIPAL'}
                                            onChange={() => setFormData({ ...formData, entidade_destino: 'DIRECAO_MUNICIPAL' })}
                                        />
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.entidade_destino === 'DIRECAO_MUNICIPAL' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                                <Icons.School className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900">Direcção Municipal</div>
                                                <div className="text-xs text-slate-500">Educação e Ensino</div>
                                            </div>
                                        </div>
                                        {formData.entidade_destino === 'DIRECAO_MUNICIPAL' && (
                                            <div className="absolute top-4 right-4 text-indigo-600">
                                                <Icons.Check className="w-5 h-5" />
                                            </div>
                                        )}
                                    </label>

                                    <label className={`
                                        relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all
                                        ${formData.entidade_destino === 'ESCOLA'
                                            ? 'border-indigo-600 bg-indigo-50/50'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'}
                                    `}>
                                        <input
                                            type="radio"
                                            name="entidade"
                                            className="sr-only"
                                            checked={formData.entidade_destino === 'ESCOLA'}
                                            onChange={() => setFormData({ ...formData, entidade_destino: 'ESCOLA' })}
                                        />
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.entidade_destino === 'ESCOLA' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                                <Icons.Home className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900">Escola</div>
                                                <div className="text-xs text-slate-500">{linkedEscolaName}</div>
                                            </div>
                                        </div>
                                        {formData.entidade_destino === 'ESCOLA' && (
                                            <div className="absolute top-4 right-4 text-indigo-600">
                                                <Icons.Check className="w-5 h-5" />
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>

                            {/* Document Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Documento</label>
                                <select
                                    value={formData.tipo_documento_id}
                                    onChange={(e) => setFormData({ ...formData, tipo_documento_id: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white transition-all"
                                    required
                                >
                                    <option value="">Selecione o documento...</option>
                                    {tiposDocumento.map(tipo => (
                                        <option key={tipo.id} value={tipo.id}>
                                            {tipo.nome} - {tipo.prazo_dias} dias úteis
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Observações / Detalhes</label>
                                <textarea
                                    value={formData.descricao}
                                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all min-h-[120px]"
                                    placeholder="Ex: Ref ao ano lectivo 2024/2025..."
                                />
                            </div>

                            {/* Urgency */}
                            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl border border-orange-100">
                                <input
                                    type="checkbox"
                                    id="urgente"
                                    checked={formData.urgente}
                                    onChange={(e) => setFormData({ ...formData, urgente: e.target.checked })}
                                    className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 border-gray-300"
                                />
                                <label htmlFor="urgente" className="text-sm font-medium text-orange-900 cursor-pointer">
                                    Marcar como Urgente
                                    <span className="block text-xs text-orange-700 font-normal">Pode exigir justificativa adicional</span>
                                </label>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('list')}
                                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-medium shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:shadow-none"
                                >
                                    {loading ? 'Enviando...' : 'Enviar Pedido'}
                                </button>
                            </div>
                        </form>
                    </CardBody>
                </Card>
            ) : (
                <div className="space-y-4">
                    {solicitacoes.length === 0 && !loading ? (
                        <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Icons.ClipboardList className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-1">Nenhum pedido encontrado</h3>
                            <p className="text-slate-500 mb-6">Você ainda não fez nenhuma solicitação de documento.</p>
                            <button
                                onClick={() => setActiveTab('new')}
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                            >
                                Criar Primeiro Pedido
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {solicitacoes.map((sol) => (
                                <SolicitacaoCard key={sol.id} solicitacao={sol} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function SolicitacaoCard({ solicitacao }: { solicitacao: SolicitacaoDocumento }) {
    const estado = getEstadoLabel(solicitacao.estado)
    const tipoName = solicitacao.tipo_documento?.nome || solicitacao.assunto

    return (
        <Card className="hover:shadow-md transition-all border border-slate-200">
            <CardBody className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${solicitacao.entidade_destino === 'ESCOLA' ? 'bg-indigo-100 text-indigo-600' : 'bg-purple-100 text-purple-600'}`}>
                            {solicitacao.entidade_destino === 'ESCOLA' ? <Icons.Home className="w-5 h-5" /> : <Icons.School className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900 leading-tight">{tipoName}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Para: {solicitacao.entidade_destino === 'ESCOLA' ? 'Escola' : 'Direcção Municipal'}
                            </p>
                        </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${estado.bgColor} ${estado.color}`}>
                        {estado.label}
                    </span>
                </div>

                <div className="space-y-3 mt-4">
                    {solicitacao.descricao && (
                        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            {solicitacao.descricao}
                        </p>
                    )}

                    {solicitacao.resposta_direcao && (
                        <div className="text-sm bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <span className="block text-xs font-bold text-blue-700 mb-1">Resposta:</span>
                            <span className="text-blue-800">{solicitacao.resposta_direcao}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                            <Icons.Check className="w-3.5 h-3.5" />
                            {formatDataSolicitacao(solicitacao.created_at)}
                        </div>
                        {solicitacao.urgente && (
                            <span className="flex items-center gap-1 text-red-600 font-medium">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                Urgente
                            </span>
                        )}
                    </div>
                </div>
            </CardBody>
        </Card>
    )
}
