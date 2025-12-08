import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { HeaderConfig, getOrgaoEducacao } from './headerConfigUtils'
import { imageUrlToBase64, getImageFormat } from './imageUtils'

interface TrimestreData {
    notas: Record<string, number>
    nota_final?: number  // Optional - only if NF component configured
}

interface MiniPautaData {
    turma: {
        nome: string
        ano_lectivo: number
        codigo_turma: string
        nivel_ensino?: string
    }
    disciplina: {
        nome: string
        codigo_disciplina: string
    }
    trimestre: number | 'all'
    nivel_ensino?: string
    classe?: string
    alunos: Array<{
        numero_processo: string
        nome_completo: string
        notas: Record<string, number>
        nota_final?: number  // Optional - only if NF component configured
        classificacao: string
        trimestres?: {
            1?: TrimestreData
            2?: TrimestreData
            3?: TrimestreData
        }
    }>
    componentes: Array<{
        codigo_componente: string
        nome: string
        peso_percentual: number
        trimestre?: number // Optional: which trimestre this component belongs to
        is_calculated?: boolean
    }>
    estatisticas: {
        total_alunos: number
        aprovados: number
        reprovados: number
        taxa_aprovacao: number
        media_turma: number
        nota_minima: number
        nota_maxima: number
    }
    escola?: {
        nome: string
        provincia: string
        municipio: string
    }
}

/**
 * Determines the RGB color for a grade based on educational level, class, and component type
 * Returns [R, G, B] array for jsPDF
 */
const getGradeColorRGB = (
    nota: number,
    nivelEnsino: string | undefined,
    classe: string | undefined,
    isCalculated: boolean
): [number, number, number] => {
    // Extract class number from classe string (e.g., "5ª Classe" -> 5)
    const classeNumber = classe ? parseInt(classe.match(/\d+/)?.[0] || '0') : 0

    // Ensino Primário (Primary Education)
    if (nivelEnsino?.toLowerCase().includes('primário') || nivelEnsino?.toLowerCase().includes('primario')) {
        // For 5ª and 6ª Classe
        if (classeNumber >= 5 && classeNumber <= 6) {
            // Calculated components (MFD, MF): negative 0-4.44, positive 4.45-10
            if (isCalculated) {
                return nota <= 4.44 ? [220, 38, 38] : [37, 99, 235] // red-600 : blue-600
            }
            // Regular components: negative 0-4.44, positive 4.45-10
            return nota <= 4.44 ? [220, 38, 38] : [37, 99, 235]
        }
        // For classes below 5ª Classe
        else if (classeNumber > 0 && classeNumber < 5) {
            // Only calculated components get negative color (0-4.44)
            if (isCalculated) {
                return nota <= 4.44 ? [220, 38, 38] : [37, 99, 235]
            }
            // Other fields remain blue
            return [37, 99, 235]
        }
    }

    // Ensino Secundário and Escolas Tecnicas (Secondary and Technical Schools)
    // Default behavior for other educational levels
    // Calculated components (MFD, MF): negative 0-9.44, positive 9.45-20
    if (isCalculated) {
        return nota <= 9.44 ? [220, 38, 38] : [37, 99, 235]
    }
    // Regular components: negative 0-9.99, positive 10-20
    return nota < 10 ? [220, 38, 38] : [37, 99, 235]
}

export async function generateMiniPautaPDF(data: MiniPautaData, headerConfig?: HeaderConfig | null): Promise<void> {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    let currentY = 15

    // Render configurable header
    if (headerConfig) {
        // Logo (if configured)
        if (headerConfig.logo_url) {
            try {
                // Convert image to Base64 for PDF rendering
                const base64Image = await imageUrlToBase64(headerConfig.logo_url)
                const imageFormat = getImageFormat(headerConfig.logo_url)

                // Calculate logo dimensions with better scaling
                // Default to smaller size (30mm max instead of 50mm)
                const maxLogoSize = 30 // Maximum size in mm
                const logoWidthPx = headerConfig.logo_width || 50
                const logoHeightPx = headerConfig.logo_height || 50

                // Better conversion: 1px ≈ 0.26mm (96 DPI standard)
                let logoWidth = logoWidthPx * 0.26
                let logoHeight = logoHeightPx * 0.26

                // Scale down if too large
                if (logoWidth > maxLogoSize || logoHeight > maxLogoSize) {
                    const scale = Math.min(maxLogoSize / logoWidth, maxLogoSize / logoHeight)
                    logoWidth *= scale
                    logoHeight *= scale
                }

                // Center the logo
                const logoX = (pageWidth - logoWidth) / 2

                doc.addImage(base64Image, imageFormat, logoX, currentY, logoWidth, logoHeight)
                currentY += logoHeight + 3 // Add spacing after logo
            } catch (err) {
                console.error('Error adding logo to PDF:', err)
                // Continue without logo if there's an error
            }
        }

        const fontSize = headerConfig.tamanho_fonte_outros || 10
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', 'normal')

        // República de Angola
        if (headerConfig.mostrar_republica && headerConfig.texto_republica) {
            doc.text(headerConfig.texto_republica, pageWidth / 2, currentY, { align: 'center' })
            currentY += fontSize * 0.5
        }

        // Governo Provincial
        if (headerConfig.mostrar_governo_provincial && headerConfig.provincia) {
            doc.text(`Governo Provincial da ${headerConfig.provincia}`, pageWidth / 2, currentY, { align: 'center' })
            currentY += fontSize * 0.5
        }

        // Órgão de Educação (based on nivel_ensino)
        if (headerConfig.mostrar_orgao_educacao && headerConfig.nivel_ensino) {
            const orgaoText = getOrgaoEducacao(
                headerConfig.nivel_ensino,
                headerConfig.provincia,
                headerConfig.municipio
            )
            doc.text(orgaoText, pageWidth / 2, currentY, { align: 'center' })
            currentY += fontSize * 0.5
        }

        // Nome da Escola
        doc.text(headerConfig.nome_escola, pageWidth / 2, currentY, { align: 'center' })
        currentY += fontSize * 0.7

        // MINI-PAUTA (larger font)
        const miniPautaFontSize = headerConfig.tamanho_fonte_mini_pauta || 16
        doc.setFontSize(miniPautaFontSize)
        doc.setFont('helvetica', 'bold')
        doc.text('MINI-PAUTA', pageWidth / 2, currentY, { align: 'center' })
        currentY += miniPautaFontSize * 0.6
    } else {
        // Default header (fallback)
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text('MINI-PAUTA', pageWidth / 2, currentY, { align: 'center' })
        currentY += 7

        // School info
        if (data.escola) {
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(data.escola.nome, pageWidth / 2, currentY, { align: 'center' })
            currentY += 5
            doc.text(`${data.escola.provincia} - ${data.escola.municipio}`, pageWidth / 2, currentY, { align: 'center' })
            currentY += 7
        } else {
            currentY += 7
        }
    }

    // Class and subject info
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Turma: ${data.turma.nome}`, 14, currentY + 5)
    doc.text(`Disciplina: ${data.disciplina.nome}`, 14, currentY + 11)
    doc.text(`Trimestre: ${data.trimestre === 'all' ? 'Todos' : data.trimestre + 'º'}`, 14, currentY + 17)
    doc.text(`Ano Lectivo: ${data.turma.ano_lectivo}`, pageWidth - 14, currentY + 5, { align: 'right' })

    const tableStartY = currentY + 23

    // Check if all-trimester mode
    const isAllTrimesters = data.trimestre === 'all' && data.alunos[0]?.trimestres

    let headers: string[]
    let tableData: any[][]

    if (isAllTrimesters) {
        // Get components for each trimestre
        const componentes1T = data.componentes.filter(c => c.trimestre === 1)
        const componentes2T = data.componentes.filter(c => c.trimestre === 2)
        const componentes3T = data.componentes.filter(c => c.trimestre === 3)

        // Headers for all-trimester layout (without Nº Processo)
        headers = [
            'Nº',
            'Nome',
            // 1º Trimestre
            ...componentes1T.map(c => c.codigo_componente),
            // 2º Trimestre
            ...componentes2T.map(c => c.codigo_componente),
            // 3º Trimestre
            ...componentes3T.map(c => c.codigo_componente)
        ]

        // Table data for all-trimester layout (without Nº Processo)
        tableData = data.alunos.map((aluno, index) => {
            const row = [
                (index + 1).toString(),
                aluno.nome_completo
            ]

            // 1º Trimestre
            const trimestre1 = aluno.trimestres?.[1]
            componentes1T.forEach(c => {
                const nota = trimestre1?.notas[c.codigo_componente]
                row.push(nota !== undefined ? nota.toFixed(1) : '-')
            })
            row.push(trimestre1?.nota_final ? trimestre1.nota_final.toFixed(1) : '-')

            // 2º Trimestre
            const trimestre2 = aluno.trimestres?.[2]
            componentes2T.forEach(c => {
                const nota = trimestre2?.notas[c.codigo_componente]
                row.push(nota !== undefined ? nota.toFixed(1) : '-')
            })
            row.push(trimestre2?.nota_final ? trimestre2.nota_final.toFixed(1) : '-')

            // 3º Trimestre
            const trimestre3 = aluno.trimestres?.[3]
            componentes3T.forEach(c => {
                const nota = trimestre3?.notas[c.codigo_componente]
                row.push(nota !== undefined ? nota.toFixed(1) : '-')
            })
            row.push(trimestre3?.nota_final ? trimestre3.nota_final.toFixed(1) : '-')

            return row
        })
    } else {
        // Headers for single-trimester layout (without Nº Processo)
        headers = [
            'Nº',
            'Nome do Aluno',
            ...data.componentes.map(c => `${c.codigo_componente}\n(${c.peso_percentual}%)`),
            'Nota Final',
            'Classificação'
        ]

        // Table data for single-trimester layout (without Nº Processo)
        tableData = data.alunos.map((aluno, index) => [
            (index + 1).toString(),
            aluno.nome_completo,
            ...data.componentes.map(c => {
                const nota = aluno.notas[c.codigo_componente]
                return nota !== undefined ? nota.toFixed(2) : '-'
            }),
            aluno.nota_final !== undefined ? aluno.nota_final.toFixed(2) : '-',
            aluno.classificacao
        ])
    }

    // Generate table
    if (isAllTrimesters) {
        // For all-trimester mode, we need two header rows
        const componentes1T = data.componentes.filter(c => c.trimestre === 1)
        const componentes2T = data.componentes.filter(c => c.trimestre === 2)
        const componentes3T = data.componentes.filter(c => c.trimestre === 3)

        // First header row: Trimester groups (without Nº Processo)
        const headerRow1 = [
            { content: 'Nº', rowSpan: 2 },
            { content: 'Nome', rowSpan: 2 },
            { content: '1º Trimestre', colSpan: componentes1T.length },
            { content: '2º Trimestre', colSpan: componentes2T.length },
            { content: '3º Trimestre', colSpan: componentes3T.length }
        ]

        // Second header row: Component names and MT
        const headerRow2 = [
            // 1º Trimestre components
            ...componentes1T.map(c => c.codigo_componente),
            // 2º Trimestre components
            ...componentes2T.map(c => c.codigo_componente),
            // 3º Trimestre components
            ...componentes3T.map(c => c.codigo_componente)
        ]

        autoTable(doc, {
            startY: tableStartY,
            head: [headerRow1, headerRow2],
            body: tableData,
            theme: 'grid',
            styles: {
                fontSize: 7,
                cellPadding: 1.5,
                overflow: 'linebreak'
            },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 8 },
                1: { halign: 'left', cellWidth: 40 }
            },
            didParseCell: (hookData: any) => {
                // Apply color and center alignment to grade cells
                if (hookData.section === 'body' && hookData.column.index >= 2) {
                    // Center align all grade columns
                    hookData.cell.styles.halign = 'center'

                    const cellValue = hookData.cell.raw
                    if (cellValue && cellValue !== '-') {
                        const nota = parseFloat(cellValue)
                        if (!isNaN(nota)) {
                            // Determine which component this column represents
                            const colIndex = hookData.column.index - 2 // Offset for Nº and Nome
                            const allComponents = [...componentes1T, ...componentes2T, ...componentes3T]
                            const component = allComponents[colIndex]

                            if (component) {
                                const color = getGradeColorRGB(
                                    nota,
                                    data.nivel_ensino,
                                    data.classe,
                                    component.is_calculated || false
                                )
                                hookData.cell.styles.textColor = color
                            }
                        }
                    }
                }
            },
            didDrawPage: (data) => {
                // Footer
                const pageCount = (doc as any).internal.getNumberOfPages()
                const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber

                doc.setFontSize(8)
                doc.setFont('helvetica', 'normal')
                doc.text(
                    `Página ${currentPage} de ${pageCount}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                )

                doc.text(
                    `Gerado em: ${new Date().toLocaleDateString('pt-PT')}`,
                    14,
                    pageHeight - 10
                )
            }
        })
    } else {
        // Single trimester mode - original table
        autoTable(doc, {
            startY: 53,
            head: [headers],
            body: tableData,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 2,
                overflow: 'linebreak'
            },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { halign: 'left', cellWidth: 60 },
                [headers.length - 2]: { halign: 'center', fontStyle: 'bold' },
                [headers.length - 1]: { halign: 'center' }
            },
            didParseCell: (hookData: any) => {
                // Apply color and center alignment to grade cells
                if (hookData.section === 'body' && hookData.column.index >= 2 && hookData.column.index < headers.length - 1) {
                    // Center align all grade and classification columns
                    hookData.cell.styles.halign = 'center'

                    // Apply color only to numeric grade cells (not classification)
                    if (hookData.column.index < headers.length - 2) {
                        const cellValue = hookData.cell.raw
                        if (cellValue && cellValue !== '-') {
                            const nota = parseFloat(cellValue)
                            if (!isNaN(nota)) {
                                // Determine which component this column represents
                                const componentIndex = hookData.column.index - 2 // Offset for Nº and Nome
                                const component = data.componentes[componentIndex]

                                if (component) {
                                    const color = getGradeColorRGB(
                                        nota,
                                        data.nivel_ensino,
                                        data.classe,
                                        component.is_calculated || false
                                    )
                                    hookData.cell.styles.textColor = color
                                }
                            }
                        }
                    }
                }
            },
            didDrawPage: (data) => {
                // Footer
                const pageCount = (doc as any).internal.getNumberOfPages()
                const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber

                doc.setFontSize(8)
                doc.setFont('helvetica', 'normal')
                doc.text(
                    `Página ${currentPage} de ${pageCount}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                )

                doc.text(
                    `Gerado em: ${new Date().toLocaleDateString('pt-PT')}`,
                    14,
                    pageHeight - 10
                )
            }
        })
    }

    // Statistics section
    const finalY = (doc as any).lastAutoTable.finalY + 10

    if (finalY + 30 < pageHeight) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('ESTATÍSTICAS DA TURMA', 14, finalY)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)

        const stats = [
            `Total de Alunos: ${data.estatisticas.total_alunos}`,
            `Aprovados: ${data.estatisticas.aprovados} (${data.estatisticas.taxa_aprovacao.toFixed(1)}%)`,
            `Reprovados: ${data.estatisticas.reprovados}`,
            `Média da Turma: ${data.estatisticas.media_turma.toFixed(2)}`,
            `Nota Mínima: ${data.estatisticas.nota_minima.toFixed(2)}`,
            `Nota Máxima: ${data.estatisticas.nota_maxima.toFixed(2)}`
        ]

        stats.forEach((stat, index) => {
            doc.text(stat, 14, finalY + 7 + (index * 5))
        })
    }

    // Signature section
    if (finalY + 60 < pageHeight) {
        const signY = finalY + 50
        doc.setFontSize(9)
        doc.text('_____________________________', 14, signY)
        doc.text('Professor(a)', 14, signY + 5)

        doc.text('_____________________________', pageWidth / 2, signY)
        doc.text('Diretor(a) Pedagógico(a)', pageWidth / 2, signY + 5)

        doc.text('_____________________________', pageWidth - 70, signY)
        doc.text('Diretor(a) da Escola', pageWidth - 70, signY + 5)
    }

    // Save PDF
    const trimestreStr = data.trimestre === 'all' ? 'todos' : `${data.trimestre}trim`
    const filename = `mini-pauta_${data.turma.codigo_turma}_${data.disciplina.codigo_disciplina}_${trimestreStr}.pdf`
    doc.save(filename)
}
