/*
component-meta:
  name: ReportsPage
  description: Page for generating reports and exporting data
  tokens: [--color-primary, --fs-md, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Button } from './ui/Button'
import { translateError } from '../utils/translations'

interface Turma {
    id: string
    nome: string
    ano_lectivo: string
}

export const ReportsPage: React.FC = () => {
    const [turmas, setTurmas] = useState<Turma[]>([])
    const [selectedTurma, setSelectedTurma] = useState<string>('')
    const [trimestre, setTrimestre] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    useEffect(() => {
        loadTurmas()
    }, [])

    const loadTurmas = async () => {
        try {
            const { data, error } = await supabase
                .from('turmas')
                .select('id, nome, ano_lectivo')
                .order('nome')

            if (error) throw error
            setTurmas(data || [])
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar turmas'
            setError(translateError(errorMessage))
        }
    }

    const handleGenerateReport = async () => {
        try {
            setLoading(true)
            setError(null)
            setSuccess(null)

            if (!selectedTurma) {
                setError('Selecione uma turma')
                return
            }

            // Call Edge Function to generate report
            const { data, error: functionError } = await supabase.functions.invoke('generate-mini-pauta', {
                body: {
                    turma_id: selectedTurma,
                    trimestre,
                },
            })

            if (functionError) throw functionError

            setSuccess('Relatório gerado com sucesso!')

            // Download the PDF if returned
            if (data?.pdf_url) {
                window.open(data.pdf_url, '_blank')
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar relatório'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    const handleExportCSV = async () => {
        try {
            setLoading(true)
            setError(null)

            if (!selectedTurma) {
                setError('Selecione uma turma')
                return
            }

            // Fetch data for CSV export
            const { data: alunos, error: alunosError } = await supabase
                .from('alunos')
                .select(`
          numero,
          nome,
          notas(componente_id, valor, trimestre)
        `)
                .eq('turma_id', selectedTurma)
                .order('numero')

            if (alunosError) throw alunosError

            // Create CSV content
            const csvContent = [
                ['Número', 'Nome', 'Componente', 'Nota', 'Trimestre'].join(','),
                ...(alunos?.flatMap(aluno =>
                    aluno.notas?.map((nota: any) =>
                        [aluno.numero, aluno.nome, nota.componente_id, nota.valor, nota.trimestre].join(',')
                    ) || []
                ) || [])
            ].join('\n')

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = `notas_${selectedTurma}_${trimestre}trim.csv`
            link.click()

            setSuccess('CSV exportado com sucesso!')
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao exportar CSV'
            setError(translateError(errorMessage))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">Relatórios e Mini-Pautas</h2>
                <p className="text-sm md:text-base text-slate-600 mt-1">Gere relatórios e exporte dados das turmas</p>
            </div>

            {/* Messages */}
            {error && (
                <div className="alert alert-error animate-slide-down">
                    <span className="text-sm">{error}</span>
                </div>
            )}
            {success && (
                <div className="alert alert-success animate-slide-down">
                    <span className="text-sm">{success}</span>
                </div>
            )}

            {/* Report Generation */}
            <Card>
                <CardHeader>
                    <h3 className="text-base md:text-lg font-semibold text-slate-900">Gerar Mini-Pauta</h3>
                </CardHeader>
                <CardBody>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div>
                                <label className="form-label">Turma</label>
                                <select
                                    value={selectedTurma}
                                    onChange={(e) => setSelectedTurma(e.target.value)}
                                    className="form-input min-h-touch"
                                >
                                    <option value="">Selecione uma turma</option>
                                    {turmas.map((turma) => (
                                        <option key={turma.id} value={turma.id}>
                                            {turma.nome} - {turma.ano_lectivo}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="form-label">Trimestre</label>
                                <select
                                    value={trimestre}
                                    onChange={(e) => setTrimestre(parseInt(e.target.value))}
                                    className="form-input min-h-touch"
                                >
                                    <option value={1}>1º Trimestre</option>
                                    <option value={2}>2º Trimestre</option>
                                    <option value={3}>3º Trimestre</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                variant="primary"
                                onClick={handleGenerateReport}
                                loading={loading}
                                disabled={!selectedTurma}
                                className="flex-1 sm:flex-none"
                                icon={
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                }
                            >
                                Gerar PDF
                            </Button>

                            <Button
                                variant="secondary"
                                onClick={handleExportCSV}
                                loading={loading}
                                disabled={!selectedTurma}
                                className="flex-1 sm:flex-none"
                                icon={
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                }
                            >
                                Exportar CSV
                            </Button>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Report Types - Horizontal scroll on mobile, grid on desktop */}
            <div className="flex md:grid md:grid-cols-3 gap-3 md:gap-6 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
                <Card className="hover:shadow-lg transition-shadow flex-shrink-0 w-48 md:w-auto">
                    <CardBody className="p-4 md:p-6 text-center">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mx-auto mb-2 md:mb-3">
                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h4 className="font-semibold text-slate-900 mb-1 text-sm md:text-base">Mini-Pauta Completa</h4>
                        <p className="text-xs md:text-sm text-slate-600 mb-2 md:mb-4">Relatório com todas as notas</p>
                        <p className="text-xs text-slate-500 hidden md:block">PDF formatado para impressão</p>
                    </CardBody>
                </Card>

                <Card className="hover:shadow-lg transition-shadow flex-shrink-0 w-48 md:w-auto">
                    <CardBody className="p-4 md:p-6 text-center">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600 mx-auto mb-2 md:mb-3">
                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h4 className="font-semibold text-slate-900 mb-1 text-sm md:text-base">Estatísticas</h4>
                        <p className="text-xs md:text-sm text-slate-600 mb-2 md:mb-4">Análise de desempenho</p>
                        <p className="text-xs text-slate-500 hidden md:block">Médias, aprovações e reprovações</p>
                    </CardBody>
                </Card>

                <Card className="hover:shadow-lg transition-shadow flex-shrink-0 w-48 md:w-auto">
                    <CardBody className="p-4 md:p-6 text-center">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mx-auto mb-2 md:mb-3">
                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h4 className="font-semibold text-slate-900 mb-1 text-sm md:text-base">Exportação CSV</h4>
                        <p className="text-xs md:text-sm text-slate-600 mb-2 md:mb-4">Dados brutos para análise</p>
                        <p className="text-xs text-slate-500 hidden md:block">Compatível com Excel e Sheets</p>
                    </CardBody>
                </Card>
            </div>
        </div>
    )
}
