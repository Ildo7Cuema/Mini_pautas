/*
component-meta:
  name: GradeImportModal
  description: Modal for importing grades from CSV
  tokens: [--color-primary, --fs-md, min-h-touch]
  responsive: true
*/

import React, { useState, useRef } from 'react'
import { Card, CardBody, CardHeader } from './ui/Card'
import { Button } from './ui/Button'
import { Icons } from './ui/Icons'
import { Aluno } from '../types'
import { parseGradesFromCSV, ImportResult, GradeData } from '../utils/gradeUtils'

interface GradeImportModalProps {
    alunos: Aluno[]
    minScale: number
    maxScale: number
    componenteNome: string
    onImport: (data: GradeData[]) => void
    onClose: () => void
}

export const GradeImportModal: React.FC<GradeImportModalProps> = ({
    alunos,
    minScale,
    maxScale,
    componenteNome,
    onImport,
    onClose
}) => {
    const [importResult, setImportResult] = useState<ImportResult | null>(null)
    const [processing, setProcessing] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setProcessing(true)
        try {
            const text = await file.text()
            const result = parseGradesFromCSV(text, alunos, minScale, maxScale)
            setImportResult(result)
        } catch (error) {
            setImportResult({
                success: false,
                imported: 0,
                errors: [{ row: 0, field: 'file', message: 'Erro ao ler arquivo' }]
            })
        } finally {
            setProcessing(false)
        }
    }

    const handleConfirmImport = () => {
        if (importResult?.data) {
            onImport(importResult.data)
            onClose()
        }
    }

    const handleReset = () => {
        setImportResult(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center md:p-4 z-50 animate-fade-in">
            <Card className="w-full md:max-w-2xl md:rounded-lg rounded-t-2xl rounded-b-none md:rounded-b-lg animate-slide-up max-h-[90vh] overflow-y-auto">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Importar Notas</h3>
                            <p className="text-sm text-slate-600 mt-1">{componenteNome}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 min-h-touch min-w-touch flex items-center justify-center -mr-2"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </CardHeader>
                <CardBody className="space-y-4">
                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex gap-3">
                            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm text-blue-800">
                                <p className="font-semibold mb-1">Instruções:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>O arquivo deve estar no formato CSV</li>
                                    <li>Colunas: Número, Nome Completo, Número de Processo, Nota</li>
                                    <li>Notas devem estar entre {minScale} e {maxScale}</li>
                                    <li>Use o template exportado para garantir o formato correto</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* File Upload */}
                    {!importResult && (
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="csv-upload"
                            />
                            <label
                                htmlFor="csv-upload"
                                className="cursor-pointer flex flex-col items-center"
                            >
                                <svg className="w-16 h-16 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-lg font-semibold text-slate-700 mb-1">
                                    Clique para selecionar arquivo
                                </p>
                                <p className="text-sm text-slate-500">
                                    ou arraste e solte aqui
                                </p>
                                <p className="text-xs text-slate-400 mt-2">
                                    Formato: CSV
                                </p>
                            </label>
                        </div>
                    )}

                    {/* Processing */}
                    {processing && (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                            <p className="mt-4 text-slate-600">Processando arquivo...</p>
                        </div>
                    )}

                    {/* Results */}
                    {importResult && !processing && (
                        <div className="space-y-4">
                            {/* Success Summary */}
                            {importResult.success && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <Icons.Check className="text-green-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-semibold text-green-900">
                                                Arquivo processado com sucesso!
                                            </p>
                                            <p className="text-sm text-green-700 mt-1">
                                                {importResult.imported} {importResult.imported === 1 ? 'nota encontrada' : 'notas encontradas'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Errors */}
                            {importResult.errors.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="flex-1">
                                            <p className="font-semibold text-red-900 mb-2">
                                                {importResult.errors.length} {importResult.errors.length === 1 ? 'erro encontrado' : 'erros encontrados'}
                                            </p>
                                            <div className="max-h-48 overflow-y-auto space-y-2">
                                                {importResult.errors.map((error, index) => (
                                                    <div key={index} className="text-sm text-red-700 bg-white rounded p-2">
                                                        <span className="font-medium">Linha {error.row}:</span> {error.message}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Preview Data */}
                            {importResult.data && importResult.data.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 mb-2">
                                        Preview ({importResult.data.length} {importResult.data.length === 1 ? 'nota' : 'notas'})
                                    </h4>
                                    <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 sticky top-0">
                                                <tr>
                                                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Aluno</th>
                                                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Nº Processo</th>
                                                    <th className="text-right py-2 px-3 font-semibold text-slate-700">Nota</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importResult.data.map((item, index) => (
                                                    <tr key={index} className="border-t border-slate-100 hover:bg-slate-50">
                                                        <td className="py-2 px-3">{item.alunoNome}</td>
                                                        <td className="py-2 px-3 text-slate-600">{item.numeroProcesso}</td>
                                                        <td className="py-2 px-3 text-right font-semibold">{item.valor.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                        {importResult ? (
                            <>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleReset}
                                    className="flex-1"
                                >
                                    Tentar Novamente
                                </Button>
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={handleConfirmImport}
                                    disabled={!importResult.success || !importResult.data || importResult.data.length === 0}
                                    className="flex-1"
                                >
                                    Importar {importResult.imported} {importResult.imported === 1 ? 'Nota' : 'Notas'}
                                </Button>
                            </>
                        ) : (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                className="w-full"
                            >
                                Cancelar
                            </Button>
                        )}
                    </div>
                </CardBody>
            </Card>
        </div>
    )
}
