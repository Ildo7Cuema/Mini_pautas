import jsPDF from 'jspdf'
import { HeaderConfig, getOrgaoEducacao } from './headerConfigUtils'
import { imageUrlToBase64, getImageFormat } from './imageUtils'
import { PagamentoPropina, EscolaProfile } from '../types'
import { formatarValor, getNomeMes } from './tuitionPayments'

/**
 * Renders the PDF header adapted for Receipts
 */
async function renderReceiptHeader(
    doc: jsPDF,
    headerConfig: HeaderConfig | null | undefined,
    escola: { nome: string; provincia: string; municipio: string } | undefined,
    pageWidth: number
): Promise<number> {
    let currentY = 15

    if (headerConfig) {
        // Logo (if configured)
        if (headerConfig.logo_url) {
            try {
                const base64Image = await imageUrlToBase64(headerConfig.logo_url)
                const imageFormat = getImageFormat(headerConfig.logo_url)

                const maxLogoSize = 30
                const logoWidthPx = headerConfig.logo_width || 50
                const logoHeightPx = headerConfig.logo_height || 50

                let logoWidth = logoWidthPx * 0.26
                let logoHeight = logoHeightPx * 0.26

                if (logoWidth > maxLogoSize || logoHeight > maxLogoSize) {
                    const scale = Math.min(maxLogoSize / logoWidth, maxLogoSize / logoHeight)
                    logoWidth *= scale
                    logoHeight *= scale
                }

                const logoX = (pageWidth - logoWidth) / 2
                doc.addImage(base64Image, imageFormat, logoX, currentY, logoWidth, logoHeight)
                currentY += logoHeight + 3
            } catch (err) {
                console.error('Error adding logo to PDF:', err)
            }
        }

        const fontSize = headerConfig.tamanho_fonte_outros || 10
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', 'normal')

        if (headerConfig.mostrar_republica && headerConfig.texto_republica) {
            doc.text(headerConfig.texto_republica, pageWidth / 2, currentY, { align: 'center' })
            currentY += fontSize * 0.5
        }

        if (headerConfig.mostrar_governo_provincial && headerConfig.provincia) {
            doc.text(`Governo Provincial da ${headerConfig.provincia}`, pageWidth / 2, currentY, { align: 'center' })
            currentY += fontSize * 0.5
        }

        if (headerConfig.mostrar_orgao_educacao && headerConfig.nivel_ensino) {
            const orgaoText = getOrgaoEducacao(
                headerConfig.nivel_ensino,
                headerConfig.provincia,
                headerConfig.municipio
            )
            doc.text(orgaoText, pageWidth / 2, currentY, { align: 'center' })
            currentY += fontSize * 0.5
        }

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(headerConfig.nome_escola, pageWidth / 2, currentY, { align: 'center' })
        currentY += fontSize * 0.8

    } else if (escola) {
        // Default header if no config
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text('REPÚBLICA DE ANGOLA', pageWidth / 2, currentY, { align: 'center' })
        currentY += 5
        doc.text(`GOVERNO PROVINCIAL DE ${escola.provincia.toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' })
        currentY += 5

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(escola.nome.toUpperCase(), pageWidth / 2, currentY, { align: 'center' })
        currentY += 8
    }

    doc.setLineWidth(0.5)
    doc.line(20, currentY, pageWidth - 20, currentY)
    currentY += 10

    return currentY
}

/**
 * Generate Receipt PDF
 */
export async function generateReceiptPDF(
    pagamento: PagamentoPropina,
    headerConfig: HeaderConfig | null,
    escola: EscolaProfile | undefined
): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15

    // 1. Header
    const escolaData = escola ? {
        nome: escola.nome,
        provincia: escola.provincia,
        municipio: escola.municipio
    } : undefined

    let currentY = await renderReceiptHeader(doc, headerConfig, escolaData, pageWidth)
    currentY += 5

    // Watermark ANULADO
    if (pagamento.estado === 'anulado') {
        doc.saveGraphicsState()
        doc.setTextColor(255, 200, 200) // Light red
        doc.setFontSize(40) // Reduced from 60
        doc.setFont('helvetica', 'bold')

        // Rotate text 45 degrees
        const textIdx = 'ANULADO'

        doc.text(textIdx, pageWidth / 2, pageHeight / 2, {
            angle: 45,
            align: 'center',
            renderingMode: 'fill'
        })

        doc.restoreGraphicsState()

        // Also add definitive text in red below the header
        doc.setTextColor(185, 28, 28) // darker red
        doc.setFontSize(10) // Reduced from 14
        doc.text('ESTE RECIBO ENCONTRA-SE ANULADO', pageWidth / 2, currentY + 5, { align: 'center' })
        currentY += 8
    }

    // 2. Title Section with Modern Box
    // Background strip for title
    doc.setFillColor(248, 250, 252) // Slate-50 equivalent
    doc.setDrawColor(226, 232, 240) // Slate-200
    doc.rect(0, currentY, pageWidth, 20, 'F')
    doc.line(0, currentY + 20, pageWidth, currentY + 20)

    currentY += 10
    doc.setFontSize(11) // Reduced from 14
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105) // Slate-600 (Softer than Slate-800)
    doc.text('COMPROVATIVO DE RECEBIMENTO DE PROPINA', pageWidth / 2, currentY, { align: 'center' })

    currentY += 20

    // 3. Status Bar & Receipt No (Two columns)

    // Receipt No Box (Right side)
    doc.setFillColor(236, 253, 245) // Emerald-50
    doc.setDrawColor(167, 243, 208) // Emerald-200
    doc.roundedRect(pageWidth - margin - 70, currentY - 5, 70, 12, 1, 1, 'FD')

    doc.setFontSize(10)
    doc.setTextColor(6, 95, 70) // Emerald-800
    doc.setFont('courier', 'bold') // Monospace for numbers
    doc.text(`RECIBO N.º: ${pagamento.numero_recibo}`, pageWidth - margin - 35, currentY + 3, { align: 'center' })

    currentY += 20

    // 4. Two Column Layout for Details
    const boxHeight = 70
    const colWidth = (pageWidth - (margin * 2) - 10) / 2

    // Draw Clean Panels
    doc.setDrawColor(226, 232, 240) // Slate-200
    doc.setFillColor(255, 255, 255)
    doc.setLineWidth(0.1)

    // Left Box (Student)
    doc.roundedRect(margin, currentY, colWidth, boxHeight, 2, 2, 'S')

    // Right Box (Payment)
    doc.roundedRect(margin + colWidth + 10, currentY, colWidth, boxHeight, 2, 2, 'S')

    // Headers inside boxes
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139) // Slate-500 uppercase

    doc.text('DADOS DO ALUNO', margin + 5, currentY + 8)
    doc.text('DETALHES DO PAGAMENTO', margin + colWidth + 15, currentY + 8)

    doc.setDrawColor(241, 245, 249) // Slate-100
    doc.line(margin, currentY + 12, margin + colWidth, currentY + 12)
    doc.line(margin + colWidth + 10, currentY + 12, pageWidth - margin, currentY + 12)

    // Content - Left Col
    let leftY = currentY + 22
    const leftX = margin + 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139) // Slate-500
    doc.text('Nome:', leftX, leftY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42) // Slate-900
    doc.text(pagamento.aluno?.nome_completo || 'N/A', leftX, leftY + 5)

    leftY += 16
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('N.º Processo:', leftX, leftY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(pagamento.aluno?.numero_processo || 'N/A', leftX, leftY + 5)

    // Add Turma placeholder
    leftY += 16
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('Turma/Ano:', leftX, leftY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    // We don't have turma info directly in PagamentoPropina except nested in aluno sometimes
    // Assuming generic or retrieved
    doc.text((pagamento.aluno as any)?.turmas?.nome || 'N/A', leftX, leftY + 5)

    // Content - Right Col
    let rightY = currentY + 22
    const rightX = margin + colWidth + 15

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('Mês Referente:', rightX, rightY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(`${getNomeMes(pagamento.mes_referencia)} ${pagamento.ano_referencia}`, rightX, rightY + 5)

    rightY += 16
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('Meio de Pagamento:', rightX, rightY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(pagamento.metodo_pagamento.toUpperCase(), rightX, rightY + 5)

    rightY += 16
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('Data:', rightX, rightY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(`${new Date(pagamento.data_pagamento).toLocaleDateString('pt-AO')} ${new Date(pagamento.data_pagamento).toLocaleTimeString('pt-AO')}`, rightX, rightY + 5)

    currentY += boxHeight + 8;

    // 5. Total Bar
    // 5. Total Bar - Softer Look
    (doc as any).setFillColor(241, 245, 249); // Slate-100 (Light background)
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 16, 2, 2, 'F')

    doc.setTextColor(71, 85, 105) // Slate-600 (Label)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('TOTAL PAGO', margin + 10, currentY + 11)

    doc.setFontSize(12) // Slightly smaller
    doc.setTextColor(15, 23, 42) // Slate-900 (Value)
    doc.text(formatarValor(pagamento.valor), pageWidth - margin - 10, currentY + 11, { align: 'right' })

    // Observation
    if (pagamento.observacao) {
        currentY += 25
        doc.setTextColor(100, 116, 139)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text('Observação:', margin, currentY)
        doc.setTextColor(15, 23, 42)
        doc.text(pagamento.observacao, margin + 25, currentY, { maxWidth: pageWidth - (margin * 2) - 25 })
    } else {
        currentY += 10
    }

    // Add Annulment Reason if exists
    if (pagamento.estado === 'anulado' && pagamento.motivo_anulacao) {
        currentY += 10;
        (doc as any).setFillColor(254, 226, 226); // bg-red-50
        (doc as any).setDrawColor(220, 50, 50); // red-600
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 25, 3, 3, 'FD')

        doc.setFontSize(8) // Reduced from 10
        doc.setTextColor(185, 28, 28) // text-red-700
        doc.setFont('helvetica', 'bold')
        doc.text('DETALHES DA ANULAÇÃO:', margin + 5, currentY + 7)

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(71, 85, 105) // Slate-600
        doc.text(`Motivo: ${pagamento.motivo_anulacao}`, margin + 5, currentY + 14)

        if (pagamento.data_anulacao) {
            const dataAnul = new Date(pagamento.data_anulacao).toLocaleDateString()
            const horaAnul = new Date(pagamento.data_anulacao).toLocaleTimeString()
            doc.text(`Data: ${dataAnul} às ${horaAnul}`, margin + 5, currentY + 20)
        }

        currentY += 30
    }

    // 6. AGT Compliance Footer
    const footerY = pageHeight - 45

    // Separator line
    doc.setDrawColor(203, 213, 225) // Slate-300
    doc.setLineWidth(0.5)
        ; (doc as any).setLineDash([1, 1], 0)
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)
        ; (doc as any).setLineDash([], 0)

    // Technical Details
    doc.setFont('courier', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139) // Slate-500

    const hashText = pagamento.hash || ''
    // Wrap hash if too long
    const hashLines = doc.splitTextToSize(`Hash: ${hashText}`, pageWidth - (margin * 2) - 40)
    doc.text(hashLines, margin, footerY)

    doc.text('(Os caracteres são os do Hash do documento)', margin, footerY + (hashLines.length * 3) + 2)

    if (pagamento.hash_control) {
        doc.setFont('courier', 'bold')
        doc.text(`Control: ${pagamento.hash_control}`, pageWidth - margin, footerY, { align: 'right' })
    }

    // System Certification
    const certText = pagamento.sistema_certificado || 'Processado por programa válido n31.1/AGT20'
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184) // Slate-400
    doc.text(certText, pageWidth / 2, footerY + 14, { align: 'center' })

    // Original/Date
    const printDate = new Date().toLocaleString('pt-AO')
    doc.text(`Emitido em: ${printDate} | Original`, pageWidth / 2, footerY + 18, { align: 'center' })

    // Save
    const filename = `Recibo_${pagamento.numero_recibo}.pdf`
    doc.save(filename)
}
