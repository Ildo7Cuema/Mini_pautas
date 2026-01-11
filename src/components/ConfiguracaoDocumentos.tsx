import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader } from './ui/Card'
import { RichTextEditor } from './ui/RichTextEditor'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { defaultTemplate, generatePDF, ANGOLA_EMBLEM_URL } from '../utils/documentGenerator'

// Mock types for now until we have full types file updated
interface ModeloDocumento {
    id: string
    nome: string
    tipo_documento_id: string
    conteudo_html: string
    cabecalho_config: any
    rodape_config: any
}

interface TipoDocumento {
    id: string
    nome: string
}

interface Notification {
    type: 'success' | 'error'
    title: string
    message: string
}

export const ConfiguracaoDocumentos = () => {
    const { direcaoMunicipalProfile } = useAuth()
    const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([])
    const [selectedTipo, setSelectedTipo] = useState<string>('')
    const [modelo, setModelo] = useState<any>(defaultTemplate)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [notification, setNotification] = useState<Notification | null>(null)

    useEffect(() => {
        loadTipos()
    }, [])

    const loadTipos = async () => {
        const { data } = await supabase.from('tipos_documento').select('*').eq('ativo', true)
        if (data) {
            setTiposDocumento(data)
            if (data.length > 0) setSelectedTipo(data[0].id)
        }
    }

    // Load existing model when type changes
    useEffect(() => {
        if (!selectedTipo || !direcaoMunicipalProfile) return
        loadModelo()
    }, [selectedTipo])

    const loadModelo = async () => {
        setLoading(true)
        try {
            const { data } = await supabase
                .from('modelos_documento')
                .select('*')
                .eq('tipo_documento_id', selectedTipo)
                .eq('municipio', direcaoMunicipalProfile?.municipio)
                .single()

            if (data) {
                setModelo({
                    conteudo_html: data.conteudo_html,
                    cabecalho: data.cabecalho_config,
                    rodape: data.rodape_config
                })
            } else {
                // Reset to default if no custom model exists
                setModelo(defaultTemplate)
            }
        } catch (error) {
            console.error('Error loading model:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!direcaoMunicipalProfile) return
        setSaving(true)
        try {
            // Upsert logic
            const { data: existing } = await supabase
                .from('modelos_documento')
                .select('id')
                .eq('tipo_documento_id', selectedTipo)
                .eq('municipio', direcaoMunicipalProfile.municipio)
                .single()

            const payload = {
                municipio: direcaoMunicipalProfile.municipio,
                tipo_documento_id: selectedTipo,
                nome: `Modelo - ${tiposDocumento.find(t => t.id === selectedTipo)?.nome}`,
                conteudo_html: modelo.conteudo_html,
                cabecalho_config: modelo.cabecalho,
                rodape_config: modelo.rodape
            }

            if (existing) {
                await supabase.from('modelos_documento').update(payload).eq('id', existing.id)
            } else {
                await supabase.from('modelos_documento').insert(payload)
            }
            setNotification({
                type: 'success',
                title: 'Modelo Salvo!',
                message: `O modelo para "${tiposDocumento.find(t => t.id === selectedTipo)?.nome}" foi salvo com sucesso.`
            })
        } catch (error) {
            console.error('Error saving:', error)
            setNotification({
                type: 'error',
                title: 'Erro ao Salvar',
                message: 'Não foi possível salvar o modelo. Tente novamente.'
            })
        } finally {
            setSaving(false)
        }
    }

    const handlePreview = async () => {
        // Mock data for preview
        const mockData = {
            funcionario: {
                nome: "João da Silva",
                cargo: "Professor do Ensino Primário",
                escola: "Escola Exemplo nº 123",
                numero_funcionario: "123456",
                genero: 'M' as const
            },
            documento: {
                tipo: tiposDocumento.find(t => t.id === selectedTipo)?.nome || "Declaração",
                assunto: "Preview",
                data_solicitacao: new Date().toISOString(),
                numero_protocolo: "PREVIEW-001"
            },
            direcao: {
                municipio: direcaoMunicipalProfile?.municipio || "Município Exemplo",
                provincia: direcaoMunicipalProfile?.provincia || "Província Exemplo",
                director_nome: direcaoMunicipalProfile?.nome || "Director Exemplo"
            }
        }

        const pdfBlob = await generatePDF(mockData, modelo)
        const url = URL.createObjectURL(pdfBlob)
        setPreviewUrl(url)
    }

    const insertVariable = (variable: string) => {
        setModelo({ ...modelo, conteudo_html: modelo.conteudo_html + variable })
    }

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Professional Notification Modal */}
            {notification && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-slide-up">
                        {/* Header with gradient */}
                        <div className={`px-6 py-8 text-center ${notification.type === 'success'
                            ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                            : 'bg-gradient-to-br from-red-500 to-rose-600'
                            }`}>
                            <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <span className="text-4xl">
                                    {notification.type === 'success' ? '✓' : '✕'}
                                </span>
                            </div>
                            <h3 className="text-2xl font-bold text-white">{notification.title}</h3>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-6 text-center">
                            <p className="text-gray-600 text-base leading-relaxed">
                                {notification.message}
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="px-6 pb-6">
                            <button
                                onClick={() => setNotification(null)}
                                className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] ${notification.type === 'success'
                                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700'
                                    : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                                    }`}
                            >
                                {notification.type === 'success' ? 'Continuar' : 'Tentar Novamente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Configuração de Documentos</h1>
                <div className="flex gap-2">
                    <button
                        onClick={handlePreview}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                    >
                        👁️ Visualizar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-all"
                    >
                        {saving ? 'Salvando...' : '💾 Salvar Modelo'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sidebar - Settings */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="p-4 border-b border-slate-100 font-semibold">
                            Tipo de Documento
                        </CardHeader>
                        <CardBody className="p-4">
                            <select
                                value={selectedTipo}
                                onChange={(e) => setSelectedTipo(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                            >
                                {tiposDocumento.map(t => (
                                    <option key={t.id} value={t.id}>{t.nome}</option>
                                ))}
                            </select>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader className="p-4 border-b border-slate-100 font-semibold">
                            🏛️ Cabeçalho & Logotipo
                        </CardHeader>
                        <CardBody className="p-4 space-y-4">
                            {/* Logo Section */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-600">Logotipo/Emblema</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={modelo.cabecalho.logo_url || ''}
                                        onChange={(e) => setModelo({
                                            ...modelo,
                                            cabecalho: { ...modelo.cabecalho, logo_url: e.target.value }
                                        })}
                                        className="flex-1 p-2 text-xs border border-slate-200 rounded-lg"
                                        placeholder="URL do logotipo..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setModelo({
                                            ...modelo,
                                            cabecalho: {
                                                ...modelo.cabecalho,
                                                logo_url: ANGOLA_EMBLEM_URL
                                            }
                                        })}
                                        className="px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors whitespace-nowrap"
                                        title="Usar emblema padrão da República de Angola"
                                    >
                                        🇦🇴 Emblema
                                    </button>
                                </div>
                                {modelo.cabecalho.logo_url && (
                                    <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                                        <img
                                            src={modelo.cabecalho.logo_url}
                                            alt="Logotipo"
                                            className="h-12 w-auto object-contain"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setModelo({
                                                ...modelo,
                                                cabecalho: { ...modelo.cabecalho, logo_url: '' }
                                            })}
                                            className="text-xs text-red-500 hover:text-red-700"
                                        >
                                            ✕ Remover
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Header Text */}
                            <div className="space-y-2 pt-3 border-t border-slate-100">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={modelo.cabecalho.mostrar}
                                        onChange={(e) => setModelo({ ...modelo, cabecalho: { ...modelo.cabecalho, mostrar: e.target.checked } })}
                                    />
                                    <span className="text-sm">Mostrar Texto do Cabeçalho</span>
                                </label>
                                {modelo.cabecalho.mostrar && (
                                    <textarea
                                        value={modelo.cabecalho.texto}
                                        onChange={(e) => setModelo({ ...modelo, cabecalho: { ...modelo.cabecalho, texto: e.target.value } })}
                                        className="w-full p-2 text-xs border rounded-lg h-24"
                                        placeholder="Texto do cabeçalho..."
                                    />
                                )}
                            </div>

                            <label className="flex items-center gap-2 pt-4 border-t border-slate-100">
                                <input
                                    type="checkbox"
                                    checked={modelo.rodape.mostrar}
                                    onChange={(e) => setModelo({ ...modelo, rodape: { ...modelo.rodape, mostrar: e.target.checked } })}
                                />
                                Mostrar Rodapé
                            </label>
                            {modelo.rodape.mostrar && (
                                <input
                                    type="text"
                                    value={modelo.rodape.texto}
                                    onChange={(e) => setModelo({ ...modelo, rodape: { ...modelo.rodape, texto: e.target.value } })}
                                    className="w-full p-2 text-xs border rounded"
                                    placeholder="Texto do rodapé"
                                />
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader className="p-4 border-b border-slate-100 font-semibold">
                            Variáveis Disponíveis
                        </CardHeader>
                        <CardBody className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                            <div>
                                <h4 className="text-xs font-semibold text-slate-500 mb-2">📋 Dados Básicos</h4>
                                <div className="flex flex-wrap gap-1">
                                    {['{{NOME_FUNCIONARIO}}', '{{CARGO}}', '{{ESCOLA}}', '{{NUMERO_FUNCIONARIO}}', '{{CATEGORIA_DOCENTE}}'].map(v => (
                                        <button key={v} onClick={() => insertVariable(v)} className="text-[10px] bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 text-blue-700 font-mono">{v}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-slate-500 mb-2">👤 Dados Pessoais</h4>
                                <div className="flex flex-wrap gap-1">
                                    {['{{DATA_NASCIMENTO}}', '{{NUMERO_BI}}', '{{NACIONALIDADE}}', '{{NATURALIDADE}}', '{{ESTADO_CIVIL}}', '{{NOME_PAI}}', '{{NOME_MAE}}'].map(v => (
                                        <button key={v} onClick={() => insertVariable(v)} className="text-[10px] bg-green-50 hover:bg-green-100 px-1.5 py-0.5 rounded border border-green-200 text-green-700 font-mono">{v}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-slate-500 mb-2">🏠 Endereço</h4>
                                <div className="flex flex-wrap gap-1">
                                    {['{{PROVINCIA_RESIDENCIA}}', '{{MUNICIPIO_RESIDENCIA}}', '{{BAIRRO_RESIDENCIA}}', '{{ENDERECO_COMPLETO}}'].map(v => (
                                        <button key={v} onClick={() => insertVariable(v)} className="text-[10px] bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 text-amber-700 font-mono">{v}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-slate-500 mb-2">🎓 Formação Académica</h4>
                                <div className="flex flex-wrap gap-1">
                                    {['{{GRAU_ACADEMICO}}', '{{AREA_FORMACAO}}', '{{INSTITUICAO_FORMACAO}}', '{{ANO_CONCLUSAO}}', '{{NUMERO_DIPLOMA}}'].map(v => (
                                        <button key={v} onClick={() => insertVariable(v)} className="text-[10px] bg-purple-50 hover:bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200 text-purple-700 font-mono">{v}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-slate-500 mb-2">💼 Dados Profissionais</h4>
                                <div className="flex flex-wrap gap-1">
                                    {['{{CATEGORIA_LABORAL}}', '{{DATA_INICIO_FUNCOES}}', '{{NUMERO_SEGURANCA_SOCIAL}}', '{{IBAN}}', '{{BANCO}}'].map(v => (
                                        <button key={v} onClick={() => insertVariable(v)} className="text-[10px] bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700 font-mono">{v}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-slate-500 mb-2">📝 Documento/Direcção</h4>
                                <div className="flex flex-wrap gap-1">
                                    {['{{TIPO_DOCUMENTO}}', '{{MUNICIPIO}}', '{{PROVINCIA}}', '{{NOME_DIRECTOR}}', '{{DATA_ATUAL}}'].map(v => (
                                        <button key={v} onClick={() => insertVariable(v)} className="text-[10px] bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded border border-slate-300 text-slate-700 font-mono">{v}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold text-slate-500 mb-2">⚡ Género (Sufixos)</h4>
                                <div className="flex flex-wrap gap-1">
                                    {['{{ARTIGO_DEFINIDO}}', '{{ARTIGO_A}}'].map(v => (
                                        <button key={v} onClick={() => insertVariable(v)} className="text-[10px] bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 text-rose-700 font-mono">{v}</button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">ARTIGO_DEFINIDO = "O/A", ARTIGO_A = "a" ou "" (para feminino/masculino)</p>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* Main - Editor */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="min-h-[600px] flex flex-col overflow-hidden">
                        <CardHeader className="p-4 border-b border-slate-100 flex justify-between items-center">
                            <span className="font-semibold">📝 Editor de Conteúdo</span>
                            <span className="text-xs text-slate-500">Use os botões para formatar o texto</span>
                        </CardHeader>
                        <CardBody className="flex-1 p-0 flex flex-col">
                            <RichTextEditor
                                value={modelo.conteudo_html}
                                onChange={(html) => setModelo({ ...modelo, conteudo_html: html })}
                                placeholder="Escreva o conteúdo do documento aqui..."
                            />
                        </CardBody>
                    </Card>

                    {previewUrl && (
                        <Card className="animate-slide-up">
                            <CardHeader className="p-4 border-b border-slate-100 flex justify-between">
                                <span className="font-semibold">Pré-visualização PDF</span>
                                <button onClick={() => setPreviewUrl(null)} className="text-slate-400 hover:text-red-500">✕ Fechar</button>
                            </CardHeader>
                            <CardBody className="p-4 bg-slate-100 flex justify-center">
                                <iframe src={previewUrl} className="w-full h-[600px] rounded shadow-lg bg-white" />
                            </CardBody>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
