import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import JSZip from 'jszip'
import { HeaderConfig, getOrgaoEducacao } from './headerConfigUtils'
import { imageUrlToBase64, getImageFormat } from './imageUtils'
import { GradeColorConfig, getGradeColorFromConfig, hexToRGB } from './gradeColorConfigUtils'

interface TrimestreData {
    notas: Record<string, number>
    nota_final?: number
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
        nota_final?: number
        classificacao: string
        trimestres?: {
            1?: TrimestreData
            2?: TrimestreData
            3?: TrimestreData
        }
    }>
    componentes: Array<{
        id: string  // Component ID for unique identification
        codigo_componente: string
        nome: string
        peso_percentual: number
        trimestre?: number
        is_calculated?: boolean
        disciplina_nome?: string
        disciplina_ordem?: number
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
 * Determines the RGB color for a grade based on configuration
 */
const getGradeColorRGB = (
    nota: number,
    nivelEnsino: string | undefined,
    classe: string | undefined,
    isCalculated: boolean,
    config: GradeColorConfig | null
): [number, number, number] => {
    const result = getGradeColorFromConfig(nota, nivelEnsino, classe, isCalculated, config)
    return hexToRGB(result.color)
}

/**
 * Renders the PDF header (logo, school info, etc.)
 */
async function renderPDFHeader(
    doc: jsPDF,
    data: MiniPautaData,
    headerConfig: HeaderConfig | null | undefined,
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

        doc.text(headerConfig.nome_escola, pageWidth / 2, currentY, { align: 'center' })
        currentY += fontSize * 0.7

        const miniPautaFontSize = headerConfig.tamanho_fonte_mini_pauta || 16
        doc.setFontSize(miniPautaFontSize)
        doc.setFont('helvetica', 'bold')
        doc.text('MINI-PAUTA', pageWidth / 2, currentY, { align: 'center' })
        currentY += miniPautaFontSize * 0.6
    } else {
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text('MINI-PAUTA', pageWidth / 2, currentY, { align: 'center' })
        currentY += 7

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

    return currentY
}

/**
 * Adds footer to PDF page
 */
function addPDFFooter(doc: jsPDF, pageWidth: number, pageHeight: number) {
    const pageCount = (doc as any).internal.getNumberOfPages()
    const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-PT')}`, 14, pageHeight - 10)
}

/**
 * Adds statistics section to PDF
 */
function addPDFStatistics(doc: jsPDF, data: MiniPautaData, finalY: number, pageHeight: number) {
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
}

/**
 * Adds signature section to PDF
 */
function addPDFSignatures(doc: jsPDF, finalY: number, pageWidth: number, pageHeight: number) {
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
}

// ============================================================================
// PRIMARY EDUCATION PDF GENERATION
// ============================================================================

interface DisciplineGroup {
    disciplina_nome: string
    ordem?: number
    componentes: Array<{ id: string; codigo_componente: string; is_calculated?: boolean }>
}

function groupComponentsByDiscipline(componentes: MiniPautaData['componentes'], trimestre: number): DisciplineGroup[] {
    const disciplineMap = new Map<string, DisciplineGroup>()

    componentes.forEach(comp => {
        if (comp.trimestre === trimestre || !comp.trimestre) {
            const disciplineName = comp.disciplina_nome || 'Sem Disciplina'

            if (!disciplineMap.has(disciplineName)) {
                disciplineMap.set(disciplineName, {
                    disciplina_nome: disciplineName,
                    ordem: comp.disciplina_ordem,
                    componentes: []
                })
            }

            disciplineMap.get(disciplineName)!.componentes.push({
                id: comp.id,
                codigo_componente: comp.codigo_componente,
                is_calculated: comp.is_calculated
            })
        }
    })

    return Array.from(disciplineMap.values()).sort((a, b) => {
        if (a.ordem !== undefined && b.ordem !== undefined) {
            return a.ordem - b.ordem
        }
        return a.disciplina_nome.localeCompare(b.disciplina_nome)
    })
}

/**
 * Generates PDF for Primary Education - All Disciplines format
 * Shows disciplines grouped at the top with their components below
 */
async function generatePrimaryEducationAllDisciplinesPDF(
    data: MiniPautaData,
    headerConfig: HeaderConfig | null | undefined,
    colorConfig: GradeColorConfig | null
): Promise<void> {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Render header
    let currentY = await renderPDFHeader(doc, data, headerConfig, pageWidth)

    // Class info (no discipline line for all-disciplines mode)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Turma: ${data.turma.nome}`, 14, currentY + 5)
    doc.text(`Trimestre: ${data.trimestre}º`, 14, currentY + 11)
    doc.text(`Ano Lectivo: ${data.turma.ano_lectivo}`, pageWidth - 14, currentY + 5, { align: 'right' })

    const tableStartY = currentY + 17

    // Group components by discipline
    const currentTrimestre = (data.trimestre === 'all' ? 1 : data.trimestre) as number
    const disciplineGroups = groupComponentsByDiscipline(data.componentes, currentTrimestre)

    // Build two-row header
    // Row 1: Nº (rowSpan 2), Nome (rowSpan 2), Discipline names (colSpan = num components)
    const headerRow1: any[] = [
        { content: 'Nº', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Nome do Aluno', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
    ]

    disciplineGroups.forEach((group) => {
        headerRow1.push({
            content: group.disciplina_nome,
            colSpan: group.componentes.length,
            styles: {
                halign: 'center',
                valign: 'middle',
                fontStyle: 'bold',
                fillColor: [21, 128, 61] // Darker green for discipline headers
            }
        })
    })

    // Row 2: Component codes only
    const headerRow2: any[] = []
    disciplineGroups.forEach(group => {
        group.componentes.forEach(comp => {
            headerRow2.push({
                content: comp.codigo_componente,
                styles: { halign: 'center', valign: 'middle' }
            })
        })
    })

    // Build table data
    const tableData = data.alunos.map((aluno, index) => {
        const row: any[] = [
            (index + 1).toString(),
            aluno.nome_completo
        ]

        disciplineGroups.forEach(group => {
            group.componentes.forEach(comp => {
                // Use component id for grade lookup to avoid conflicts
                const nota = aluno.notas[comp.id]
                row.push(nota !== undefined ? nota.toFixed(1) : '-')
            })
        })

        return row
    })

    // Generate table with autoTable
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
            fillColor: [22, 163, 74],  // Green for Primary Education
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
            if (hookData.section === 'body' && hookData.column.index >= 2) {
                hookData.cell.styles.halign = 'center'

                const cellValue = hookData.cell.raw
                if (cellValue && cellValue !== '-') {
                    const nota = parseFloat(cellValue)
                    if (!isNaN(nota)) {
                        const colIndex = hookData.column.index - 2
                        let currentIndex = 0
                        let component: any = null

                        for (const group of disciplineGroups) {
                            for (const comp of group.componentes) {
                                if (currentIndex === colIndex) {
                                    // Use id to find the correct component
                                    component = data.componentes.find(c => c.id === comp.id)
                                    break
                                }
                                currentIndex++
                            }
                            if (component) break
                        }

                        if (component) {
                            const color = getGradeColorRGB(
                                nota,
                                data.nivel_ensino,
                                data.classe,
                                component.is_calculated || false,
                                colorConfig
                            )
                            hookData.cell.styles.textColor = color
                        }
                    }
                }
            }
        },
        didDrawPage: () => addPDFFooter(doc, pageWidth, pageHeight)
    })

    // Statistics and signatures
    const finalY = (doc as any).lastAutoTable.finalY + 10
    addPDFStatistics(doc, data, finalY, pageHeight)
    addPDFSignatures(doc, finalY, pageWidth, pageHeight)

    // Save
    const filename = `mini-pauta_${data.turma.codigo_turma}_todas-disciplinas_${data.trimestre}trim.pdf`
    doc.save(filename)
}

/**
 * Generates PDF for Primary Education - Single Discipline format
 */
async function generatePrimaryEducationSingleDisciplinePDF(
    data: MiniPautaData,
    headerConfig: HeaderConfig | null | undefined,
    colorConfig: GradeColorConfig | null
): Promise<void> {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    let currentY = await renderPDFHeader(doc, data, headerConfig, pageWidth)

    // Class and subject info
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Turma: ${data.turma.nome}`, 14, currentY + 5)
    doc.text(`Disciplina: ${data.disciplina.nome}`, 14, currentY + 11)
    doc.text(`Trimestre: ${data.trimestre}º`, 14, currentY + 17)
    doc.text(`Ano Lectivo: ${data.turma.ano_lectivo}`, pageWidth - 14, currentY + 5, { align: 'right' })

    const tableStartY = currentY + 23

    // Simple headers
    const headers = [
        'Nº',
        'Nome do Aluno',
        ...data.componentes.map(c => `${c.codigo_componente}\n(${c.peso_percentual}%)`)
    ]

    // Table data
    const tableData = data.alunos.map((aluno, index) => [
        (index + 1).toString(),
        aluno.nome_completo,
        ...data.componentes.map(c => {
            const nota = aluno.notas[c.codigo_componente]
            return nota !== undefined ? nota.toFixed(1) : '-'
        })
    ])

    autoTable(doc, {
        startY: tableStartY,
        head: [headers],
        body: tableData,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 2,
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [22, 163, 74],  // Green for Primary Education
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'left', cellWidth: 60 }
        },
        didParseCell: (hookData: any) => {
            if (hookData.section === 'body' && hookData.column.index >= 2) {
                hookData.cell.styles.halign = 'center'

                const cellValue = hookData.cell.raw
                if (cellValue && cellValue !== '-') {
                    const nota = parseFloat(cellValue)
                    if (!isNaN(nota)) {
                        const componentIndex = hookData.column.index - 2
                        const component = data.componentes[componentIndex]

                        if (component) {
                            const color = getGradeColorRGB(
                                nota,
                                data.nivel_ensino,
                                data.classe,
                                component.is_calculated || false,
                                colorConfig
                            )
                            hookData.cell.styles.textColor = color
                        }
                    }
                }
            }
        },
        didDrawPage: () => addPDFFooter(doc, pageWidth, pageHeight)
    })

    const finalY = (doc as any).lastAutoTable.finalY + 10
    addPDFStatistics(doc, data, finalY, pageHeight)
    addPDFSignatures(doc, finalY, pageWidth, pageHeight)

    const trimestreStr = `${data.trimestre}trim`
    const filename = `mini-pauta_${data.turma.codigo_turma}_${data.disciplina.codigo_disciplina}_${trimestreStr}.pdf`
    doc.save(filename)
}

// ============================================================================
// SECONDARY EDUCATION PDF GENERATION
// ============================================================================

/**
 * Generates PDF for Secondary Education - All Trimesters format
 * Shows trimesters grouped at the top with their components below
 */
async function generateSecondaryEducationAllTrimestersPDF(
    data: MiniPautaData,
    headerConfig: HeaderConfig | null | undefined,
    colorConfig: GradeColorConfig | null
): Promise<void> {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    let currentY = await renderPDFHeader(doc, data, headerConfig, pageWidth)

    // Class and subject info
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Turma: ${data.turma.nome}`, 14, currentY + 5)
    doc.text(`Disciplina: ${data.disciplina.nome}`, 14, currentY + 11)
    doc.text(`Trimestre: Todos`, 14, currentY + 17)
    doc.text(`Ano Lectivo: ${data.turma.ano_lectivo}`, pageWidth - 14, currentY + 5, { align: 'right' })

    const tableStartY = currentY + 23

    // Get components for each trimestre
    const componentes1T = data.componentes.filter(c => c.trimestre === 1)
    const componentes2T = data.componentes.filter(c => c.trimestre === 2)
    const componentes3T = data.componentes.filter(c => c.trimestre === 3)

    // Build two-row header
    const headerRow1: any[] = [
        { content: 'Nº', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Nome do Aluno', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
    ]

    if (componentes1T.length > 0) {
        headerRow1.push({
            content: '1º Trimestre',
            colSpan: componentes1T.length,
            styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: [30, 64, 175] }
        })
    }
    if (componentes2T.length > 0) {
        headerRow1.push({
            content: '2º Trimestre',
            colSpan: componentes2T.length,
            styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: [30, 64, 175] }
        })
    }
    if (componentes3T.length > 0) {
        headerRow1.push({
            content: '3º Trimestre',
            colSpan: componentes3T.length,
            styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: [30, 64, 175] }
        })
    }

    // Second row: component codes
    const headerRow2: any[] = [
        ...componentes1T.map(c => ({ content: c.codigo_componente, styles: { halign: 'center' } })),
        ...componentes2T.map(c => ({ content: c.codigo_componente, styles: { halign: 'center' } })),
        ...componentes3T.map(c => ({ content: c.codigo_componente, styles: { halign: 'center' } }))
    ]

    // Build table data
    const tableData = data.alunos.map((aluno, index) => {
        const row: any[] = [
            (index + 1).toString(),
            aluno.nome_completo
        ]

        // 1º Trimestre
        const trimestre1 = aluno.trimestres?.[1]
        componentes1T.forEach(c => {
            const nota = trimestre1?.notas[c.codigo_componente]
            row.push(nota !== undefined ? nota.toFixed(1) : '-')
        })

        // 2º Trimestre
        const trimestre2 = aluno.trimestres?.[2]
        componentes2T.forEach(c => {
            const nota = trimestre2?.notas[c.codigo_componente]
            row.push(nota !== undefined ? nota.toFixed(1) : '-')
        })

        // 3º Trimestre
        const trimestre3 = aluno.trimestres?.[3]
        componentes3T.forEach(c => {
            const nota = trimestre3?.notas[c.codigo_componente]
            row.push(nota !== undefined ? nota.toFixed(1) : '-')
        })

        return row
    })

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
            fillColor: [41, 128, 185],  // Blue for Secondary Education
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
            if (hookData.section === 'body' && hookData.column.index >= 2) {
                hookData.cell.styles.halign = 'center'

                const cellValue = hookData.cell.raw
                if (cellValue && cellValue !== '-') {
                    const nota = parseFloat(cellValue)
                    if (!isNaN(nota)) {
                        const colIndex = hookData.column.index - 2
                        const allComponents = [...componentes1T, ...componentes2T, ...componentes3T]
                        const component = allComponents[colIndex]

                        if (component) {
                            const color = getGradeColorRGB(
                                nota,
                                data.nivel_ensino,
                                data.classe,
                                component.is_calculated || false,
                                colorConfig
                            )
                            hookData.cell.styles.textColor = color
                        }
                    }
                }
            }
        },
        didDrawPage: () => addPDFFooter(doc, pageWidth, pageHeight)
    })

    const finalY = (doc as any).lastAutoTable.finalY + 10
    addPDFStatistics(doc, data, finalY, pageHeight)
    addPDFSignatures(doc, finalY, pageWidth, pageHeight)

    const filename = `mini-pauta_${data.turma.codigo_turma}_${data.disciplina.codigo_disciplina}_todos.pdf`
    doc.save(filename)
}

/**
 * Generates PDF for Secondary Education - Single Trimester format
 */
async function generateSecondaryEducationSingleTrimesterPDF(
    data: MiniPautaData,
    headerConfig: HeaderConfig | null | undefined,
    colorConfig: GradeColorConfig | null
): Promise<void> {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    let currentY = await renderPDFHeader(doc, data, headerConfig, pageWidth)

    // Class and subject info
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Turma: ${data.turma.nome}`, 14, currentY + 5)
    doc.text(`Disciplina: ${data.disciplina.nome}`, 14, currentY + 11)
    doc.text(`Trimestre: ${data.trimestre}º`, 14, currentY + 17)
    doc.text(`Ano Lectivo: ${data.turma.ano_lectivo}`, pageWidth - 14, currentY + 5, { align: 'right' })

    const tableStartY = currentY + 23

    // Simple headers
    const headers = [
        'Nº',
        'Nome do Aluno',
        ...data.componentes.map(c => `${c.codigo_componente}\n(${c.peso_percentual}%)`)
    ]

    // Table data
    const tableData = data.alunos.map((aluno, index) => [
        (index + 1).toString(),
        aluno.nome_completo,
        ...data.componentes.map(c => {
            const nota = aluno.notas[c.codigo_componente]
            return nota !== undefined ? nota.toFixed(1) : '-'
        })
    ])

    autoTable(doc, {
        startY: tableStartY,
        head: [headers],
        body: tableData,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 2,
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [41, 128, 185],  // Blue for Secondary Education
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'left', cellWidth: 60 }
        },
        didParseCell: (hookData: any) => {
            if (hookData.section === 'body' && hookData.column.index >= 2) {
                hookData.cell.styles.halign = 'center'

                const cellValue = hookData.cell.raw
                if (cellValue && cellValue !== '-') {
                    const nota = parseFloat(cellValue)
                    if (!isNaN(nota)) {
                        const componentIndex = hookData.column.index - 2
                        const component = data.componentes[componentIndex]

                        if (component) {
                            const color = getGradeColorRGB(
                                nota,
                                data.nivel_ensino,
                                data.classe,
                                component.is_calculated || false,
                                colorConfig
                            )
                            hookData.cell.styles.textColor = color
                        }
                    }
                }
            }
        },
        didDrawPage: () => addPDFFooter(doc, pageWidth, pageHeight)
    })

    const finalY = (doc as any).lastAutoTable.finalY + 10
    addPDFStatistics(doc, data, finalY, pageHeight)
    addPDFSignatures(doc, finalY, pageWidth, pageHeight)

    const trimestreStr = `${data.trimestre}trim`
    const filename = `mini-pauta_${data.turma.codigo_turma}_${data.disciplina.codigo_disciplina}_${trimestreStr}.pdf`
    doc.save(filename)
}

// ============================================================================
// MAIN EXPORT FUNCTION - Routes to appropriate generator
// ============================================================================

/**
 * Main function to generate Mini-Pauta PDF
 * Routes to the appropriate generator based on education level and mode
 */
export async function generateMiniPautaPDF(
    data: MiniPautaData,
    headerConfig?: HeaderConfig | null,
    colorConfig: GradeColorConfig | null = null
): Promise<void> {
    // Check if Primary Education
    const isPrimaryEducation = data.nivel_ensino?.toLowerCase().includes('primário') ||
        data.nivel_ensino?.toLowerCase().includes('primario')

    // Check if all-trimester mode
    const isAllTrimesters = data.trimestre === 'all' && data.alunos[0]?.trimestres

    // Check if all disciplines mode (Primary Education only)
    const isAllDisciplines = data.componentes.length > 0 &&
        data.componentes.some(c => c.disciplina_nome) &&
        new Set(data.componentes.map(c => c.disciplina_nome)).size > 1

    console.log('[PDF] Education level:', isPrimaryEducation ? 'Primary' : 'Secondary')
    console.log('[PDF] Mode:', isAllTrimesters ? 'All Trimesters' : isAllDisciplines ? 'All Disciplines' : 'Single')

    if (isPrimaryEducation) {
        if (isAllDisciplines) {
            console.log('[PDF] Using: generatePrimaryEducationAllDisciplinesPDF')
            await generatePrimaryEducationAllDisciplinesPDF(data, headerConfig, colorConfig)
        } else {
            console.log('[PDF] Using: generatePrimaryEducationSingleDisciplinePDF')
            await generatePrimaryEducationSingleDisciplinePDF(data, headerConfig, colorConfig)
        }
    } else {
        if (isAllTrimesters) {
            console.log('[PDF] Using: generateSecondaryEducationAllTrimestersPDF')
            await generateSecondaryEducationAllTrimestersPDF(data, headerConfig, colorConfig)
        } else {
            console.log('[PDF] Using: generateSecondaryEducationSingleTrimesterPDF')
            await generateSecondaryEducationSingleTrimesterPDF(data, headerConfig, colorConfig)
        }
    }
}

// ============================================================================
// PAUTA-GERAL PDF GENERATION
// ============================================================================

interface ComponenteAvaliacaoPG {
    id: string
    codigo_componente: string
    nome: string
    peso_percentual: number
    trimestre: number
    is_calculated?: boolean
}

interface DisciplinaComComponentes {
    id: string
    nome: string
    codigo_disciplina: string
    ordem: number
    componentes: ComponenteAvaliacaoPG[]
}

interface PautaGeralData {
    turma: {
        nome: string
        ano_lectivo: number
        codigo_turma: string
        nivel_ensino: string
    }
    trimestre: number
    nivel_ensino?: string
    classe?: string
    alunos: Array<{
        numero_processo: string
        nome_completo: string
        notas_por_disciplina: Record<string, Record<string, number>>
    }>
    disciplinas: DisciplinaComComponentes[]
    estatisticas?: {
        por_disciplina: Record<string, any>
        geral: any
    }
    escola?: {
        nome: string
        provincia: string
        municipio: string
    }
}

/**
 * Generates PDF for Pauta-Geral (General Report by Class)
 * Shows all disciplines with their components in a grouped table format
 * Uses A3 landscape format to accommodate multiple disciplines
 */
export async function generatePautaGeralPDF(
    data: PautaGeralData,
    headerConfig: HeaderConfig | null | undefined,
    colorConfig: GradeColorConfig | null
): Promise<void> {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Render header
    let currentY = await renderPDFHeader(doc, data as any, headerConfig, pageWidth)

    // Class info
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Turma: ${data.turma.nome}`, 14, currentY + 5)
    doc.text(`Trimestre: ${data.trimestre}º`, 14, currentY + 11)
    doc.text(`Ano Lectivo: ${data.turma.ano_lectivo}`, pageWidth - 14, currentY + 5, { align: 'right' })

    const tableStartY = currentY + 17

    // Build two-row header
    // Row 1: Nº (rowSpan 2), Nome (rowSpan 2), Discipline names (colSpan = num components)
    const headerRow1: any[] = [
        { content: 'Nº', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Nome do Aluno', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
    ]

    data.disciplinas.forEach((disciplina) => {
        headerRow1.push({
            content: disciplina.nome,
            colSpan: disciplina.componentes.length,
            styles: {
                halign: 'center',
                valign: 'middle',
                fontStyle: 'bold',
                fillColor: [59, 130, 246] // Blue for discipline headers
            }
        })
    })

    // Row 2: Component codes only
    const headerRow2: any[] = []
    data.disciplinas.forEach(disciplina => {
        disciplina.componentes.forEach(comp => {
            headerRow2.push({
                content: comp.codigo_componente,
                styles: { halign: 'center', valign: 'middle' }
            })
        })
    })

    // Build table data
    const tableData = data.alunos.map((aluno, index) => {
        const row: any[] = [
            (index + 1).toString(),
            aluno.nome_completo
        ]

        data.disciplinas.forEach(disciplina => {
            const notasDisciplina = aluno.notas_por_disciplina[disciplina.id] || {}
            disciplina.componentes.forEach(comp => {
                const nota = notasDisciplina[comp.id]
                row.push(nota !== undefined ? nota.toFixed(1) : '-')
            })
        })

        return row
    })

    // Generate table with autoTable
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
            fillColor: [59, 130, 246],  // Blue
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
            if (hookData.section === 'body' && hookData.column.index >= 2) {
                hookData.cell.styles.halign = 'center'

                const cellValue = hookData.cell.raw
                if (cellValue && cellValue !== '-') {
                    const nota = parseFloat(cellValue)
                    if (!isNaN(nota)) {
                        const colIndex = hookData.column.index - 2
                        let currentIndex = 0
                        let component: any = null

                        for (const disciplina of data.disciplinas) {
                            for (const comp of disciplina.componentes) {
                                if (currentIndex === colIndex) {
                                    component = comp
                                    break
                                }
                                currentIndex++
                            }
                            if (component) break
                        }

                        if (component) {
                            const color = getGradeColorRGB(
                                nota,
                                data.nivel_ensino,
                                data.classe,
                                component.is_calculated || false,
                                colorConfig
                            )
                            hookData.cell.styles.textColor = color
                        }
                    }
                }
            }
        },
        didDrawPage: () => addPDFFooter(doc, pageWidth, pageHeight)
    })

    // Statistics and signatures
    const finalY = (doc as any).lastAutoTable.finalY + 10

    if (data.estatisticas) {
        if (finalY + 30 < pageHeight) {
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.text('ESTATÍSTICAS GERAIS', 14, finalY)

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9)

            const stats = [
                `Total de Alunos: ${data.estatisticas.geral.total_alunos}`,
                `Aprovados: ${data.estatisticas.geral.aprovados}`,
                `Reprovados: ${data.estatisticas.geral.reprovados}`,
                `Média Geral: ${data.estatisticas.geral.media_turma?.toFixed(2) || 'N/A'}`,
                `Nota Mínima: ${data.estatisticas.geral.nota_minima?.toFixed(2) || 'N/A'}`,
                `Nota Máxima: ${data.estatisticas.geral.nota_maxima?.toFixed(2) || 'N/A'}`
            ]

            stats.forEach((stat, index) => {
                doc.text(stat, 14, finalY + 7 + (index * 5))
            })
        }
    }

    addPDFSignatures(doc, finalY, pageWidth, pageHeight)

    // Save
}


// ============================================================================
// TERMO DE FREQUÊNCIA DO ALUNO PDF GENERATION
// ============================================================================

interface ComponenteNota {
    codigo: string
    nome: string
    nota: number | null
}

interface DisciplinaTermoFrequencia {
    id: string
    nome: string
    codigo_disciplina: string
    notas_trimestrais: {
        1: number | null
        2: number | null
        3: number | null
    }
    // Components separated by trimester - each trimester has its own list
    componentesPorTrimestre: {
        1: ComponenteNota[]
        2: ComponenteNota[]
        3: ComponenteNota[]
    }
    nota_final: number | null
    classificacao: string
    transita: boolean
}

interface TermoFrequenciaData {
    aluno: {
        numero_processo: string
        nome_completo: string
        data_nascimento?: string
        genero?: string
        nacionalidade?: string
        naturalidade?: string
        tipo_documento?: string
        numero_documento?: string
        nome_pai?: string
        nome_mae?: string
        nome_encarregado?: string
        parentesco_encarregado?: string
        telefone_encarregado?: string
        email_encarregado?: string
        profissao_encarregado?: string
        provincia?: string
        municipio?: string
        bairro?: string
        rua?: string
        endereco?: string
        ano_ingresso?: number
        escola_anterior?: string
        classe_anterior?: string
        observacoes_academicas?: string
    }
    turma: {
        nome: string
        ano_lectivo: number
        codigo_turma: string
        nivel_ensino: string
    }
    disciplinas: DisciplinaTermoFrequencia[]
    estatisticas: {
        media_geral: number
        total_disciplinas: number
        disciplinas_aprovadas: number
        disciplinas_reprovadas: number
        transita: boolean
    }
    escola?: {
        nome: string
        provincia: string
        municipio: string
    }
}

/**
 * Renders the PDF header for Termo de Frequência
 * Includes the student process number in red after the title
 */
async function renderTermoFrequenciaHeader(
    doc: jsPDF,
    data: TermoFrequenciaData,
    headerConfig: HeaderConfig | null | undefined,
    pageWidth: number
): Promise<number> {
    let currentY = 10

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

        doc.text(headerConfig.nome_escola, pageWidth / 2, currentY, { align: 'center' })
        currentY += fontSize * 0.7

        // Title with process number in red
        const termoFontSize = headerConfig.tamanho_fonte_mini_pauta || 14
        doc.setFontSize(termoFontSize)
        doc.setFont('helvetica', 'bold')

        const titleText = 'TERMO DE FREQUÊNCIA DO ALUNO Nº '
        const titleWidth = doc.getTextWidth(titleText)
        const processNumber = data.aluno.numero_processo
        const processWidth = doc.getTextWidth(processNumber)
        const totalWidth = titleWidth + processWidth
        const startX = (pageWidth - totalWidth) / 2

        doc.setTextColor(0, 0, 0)
        doc.text(titleText, startX, currentY)
        doc.setTextColor(220, 38, 38) // Red color
        doc.text(processNumber, startX + titleWidth, currentY)
        doc.setTextColor(0, 0, 0) // Reset to black

        currentY += termoFontSize * 0.6
    } else {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')

        const titleText = 'TERMO DE FREQUÊNCIA DO ALUNO Nº '
        const titleWidth = doc.getTextWidth(titleText)
        const processNumber = data.aluno.numero_processo
        const processWidth = doc.getTextWidth(processNumber)
        const totalWidth = titleWidth + processWidth
        const startX = (pageWidth - totalWidth) / 2

        doc.setTextColor(0, 0, 0)
        doc.text(titleText, startX, currentY)
        doc.setTextColor(220, 38, 38) // Red color
        doc.text(processNumber, startX + titleWidth, currentY)
        doc.setTextColor(0, 0, 0) // Reset to black

        currentY += 7

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

    return currentY
}

/**
 * Renders student information section in a 4-column layout
 * Displays all student information organized in rows with 4 columns each
 */
function renderStudentInfo(
    doc: jsPDF,
    data: TermoFrequenciaData,
    startY: number,
    pageWidth: number
): number {
    let currentY = startY

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMAÇÕES DO ALUNO', 14, currentY)
    currentY += 5

    // Helper to format gender
    const formatGender = (g?: string) => {
        if (!g) return ''
        return g === 'M' ? 'Masculino' : 'Feminino'
    }

    // Build address string
    const buildAddress = () => {
        const parts = [
            data.aluno.rua,
            data.aluno.bairro,
            data.aluno.municipio,
            data.aluno.provincia
        ].filter(Boolean)
        return parts.length > 0 ? parts.join(', ') : (data.aluno.endereco || '')
    }

    // Prepare rows for student info table (4 columns per row)
    // Each cell contains label + value
    const createCell = (label: string, value: string | number | undefined | null) => {
        if (value === undefined || value === null || value === '') return null
        return { label, value: String(value) }
    }

    // Row 1: Basic identification
    const row1 = [
        createCell('Nome Completo', data.aluno.nome_completo),
        createCell('Nº Processo', data.aluno.numero_processo),
        createCell('Turma', data.turma.nome),
        createCell('Ano Lectivo', data.turma.ano_lectivo),
    ]

    // Row 2: Personal data
    const row2 = [
        createCell('Data Nascimento', data.aluno.data_nascimento),
        createCell('Género', formatGender(data.aluno.genero)),
        createCell('Nacionalidade', data.aluno.nacionalidade),
        createCell('Naturalidade', data.aluno.naturalidade),
    ]

    // Row 3: Document and parents
    const docInfo = data.aluno.tipo_documento && data.aluno.numero_documento
        ? `${data.aluno.tipo_documento}: ${data.aluno.numero_documento}`
        : data.aluno.numero_documento
    const row3 = [
        createCell('Documento', docInfo),
        createCell('Nome do Pai', data.aluno.nome_pai),
        createCell('Nome da Mãe', data.aluno.nome_mae),
        createCell('Encarregado', data.aluno.nome_encarregado),
    ]

    // Row 4: Guardian details and address
    const row4 = [
        createCell('Parentesco', data.aluno.parentesco_encarregado),
        createCell('Telefone', data.aluno.telefone_encarregado),
        createCell('Profissão Enc.', data.aluno.profissao_encarregado),
        createCell('Morada', buildAddress()),
    ]

    // Render using autoTable for consistent styling
    const colWidth = (pageWidth - 28) / 4
    const tableData: any[][] = []

    const processRow = (row: (ReturnType<typeof createCell>)[]) => {
        const tableRow: any[] = []
        row.forEach(cell => {
            if (cell) {
                tableRow.push({
                    content: `${cell.label}: ${cell.value}`,
                    styles: { fontSize: 8, cellPadding: 2 }
                })
            } else {
                tableRow.push({ content: '', styles: { cellPadding: 2 } })
            }
        })
        return tableRow
    }

    tableData.push(processRow(row1))
    tableData.push(processRow(row2))
    tableData.push(processRow(row3))
    tableData.push(processRow(row4))

    autoTable(doc, {
        startY: currentY,
        body: tableData,
        theme: 'plain',
        styles: {
            fontSize: 8,
            cellPadding: 1,
            lineColor: [230, 230, 230],
            lineWidth: 0.05,
        },
        columnStyles: {
            0: { cellWidth: colWidth },
            1: { cellWidth: colWidth },
            2: { cellWidth: colWidth },
            3: { cellWidth: colWidth },
        },
        margin: { left: 14, right: 14 },
    })

    return (doc as any).lastAutoTable.finalY + 3
}

/**
 * Generates PDF for Termo de Frequência do Aluno
 * Shows student information and academic performance across all disciplines and trimesters
 * Uses landscape orientation to accommodate component columns
 */
export async function generateTermoFrequenciaPDF(
    data: TermoFrequenciaData,
    headerConfig: HeaderConfig | null | undefined,
    colorConfig: GradeColorConfig | null
): Promise<void> {
    // Use landscape orientation for better component display
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Render header
    let currentY = await renderTermoFrequenciaHeader(doc, data, headerConfig, pageWidth)

    // Render student information
    currentY = renderStudentInfo(doc, data, currentY + 3, pageWidth)

    // Academic Performance Section
    currentY += 5  // Add space above to separate from previous table
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('DESEMPENHO ACADÉMICO', pageWidth / 2, currentY, { align: 'center' })
    currentY += 3  // Minimal space below to bring table very close

    // Calculate unified component structure across ALL disciplines
    const componentCodesByTrimester: { 1: Map<string, ComponenteNota>; 2: Map<string, ComponenteNota>; 3: Map<string, ComponenteNota> } = {
        1: new Map(),
        2: new Map(),
        3: new Map()
    }

    data.disciplinas.forEach(disciplina => {
        if (disciplina.componentesPorTrimestre) {
            ([1, 2, 3] as const).forEach(t => {
                disciplina.componentesPorTrimestre[t].forEach(comp => {
                    if (!componentCodesByTrimester[t].has(comp.codigo)) {
                        componentCodesByTrimester[t].set(comp.codigo, comp)
                    }
                })
            })
        }
    })

    const componentsT1 = Array.from(componentCodesByTrimester[1].values())
    const componentsT2 = Array.from(componentCodesByTrimester[2].values())
    const componentsT3 = Array.from(componentCodesByTrimester[3].values())

    const hasAnyComponents = componentsT1.length > 0 || componentsT2.length > 0 || componentsT3.length > 0

    // Helper function to get nota for a specific component
    const getNotaForComponent = (disciplina: DisciplinaTermoFrequencia, trimestre: 1 | 2 | 3, codigo: string): string => {
        if (!disciplina.componentesPorTrimestre) return '-'
        const comp = disciplina.componentesPorTrimestre[trimestre].find(c => c.codigo === codigo)
        return comp?.nota !== null && comp?.nota !== undefined ? comp.nota.toFixed(1) : '-'
    }

    if (hasAnyComponents) {
        // Build two-row header for component-based display
        const headerRow1: any[] = [
            { content: 'Nº', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'DISCIPLINAS', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
        ]

        // Add trimester headers with colSpan
        if (componentsT1.length > 0) {
            headerRow1.push({
                content: '1º TRIMESTRE',
                colSpan: componentsT1.length,
                styles: { halign: 'center', valign: 'middle', fillColor: [59, 130, 246] }
            })
        }
        if (componentsT2.length > 0) {
            headerRow1.push({
                content: '2º TRIMESTRE',
                colSpan: componentsT2.length,
                styles: { halign: 'center', valign: 'middle', fillColor: [59, 130, 246] }
            })
        }
        if (componentsT3.length > 0) {
            headerRow1.push({
                content: '3º TRIMESTRE',
                colSpan: componentsT3.length,
                styles: { halign: 'center', valign: 'middle', fillColor: [59, 130, 246] }
            })
        }

        headerRow1.push({ content: 'MÉDIA FINAL', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } })
        headerRow1.push({ content: 'OBSERVAÇÃO', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } })

        // Second row: component codes
        const headerRow2: any[] = []
        componentsT1.forEach(comp => {
            headerRow2.push({ content: comp.codigo, styles: { halign: 'center', valign: 'middle', fontSize: 7 } })
        })
        componentsT2.forEach(comp => {
            headerRow2.push({ content: comp.codigo, styles: { halign: 'center', valign: 'middle', fontSize: 7 } })
        })
        componentsT3.forEach(comp => {
            headerRow2.push({ content: comp.codigo, styles: { halign: 'center', valign: 'middle', fontSize: 7 } })
        })

        // Build table data
        const tableData: any[] = []
        data.disciplinas.forEach((disciplina, index) => {
            const row: any[] = [
                (index + 1).toString(),
                disciplina.nome
            ]

            // Add component values for each trimester
            componentsT1.forEach(comp => {
                row.push(getNotaForComponent(disciplina, 1, comp.codigo))
            })
            componentsT2.forEach(comp => {
                row.push(getNotaForComponent(disciplina, 2, comp.codigo))
            })
            componentsT3.forEach(comp => {
                row.push(getNotaForComponent(disciplina, 3, comp.codigo))
            })

            row.push(disciplina.nota_final !== null ? disciplina.nota_final.toFixed(1) : '-')
            row.push(disciplina.transita ? 'Transita' : 'Não Transita')

            tableData.push(row)
        })

        // Calculate column widths dynamically
        const totalComponents = componentsT1.length + componentsT2.length + componentsT3.length
        const fixedWidth = 10 + 50 + 20 + 28 // Nº + Disciplina + Média Final + Observação
        const availableWidth = pageWidth - 28 - fixedWidth // margins
        const componentColWidth = Math.min(15, availableWidth / totalComponents)

        const columnStyles: any = {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'left', cellWidth: 50 }
        }

        let colIndex = 2
        for (let i = 0; i < totalComponents; i++) {
            columnStyles[colIndex++] = { halign: 'center', cellWidth: componentColWidth }
        }
        columnStyles[colIndex++] = { halign: 'center', cellWidth: 20 }
        columnStyles[colIndex] = { halign: 'center', cellWidth: 28 }

        // Generate table
        autoTable(doc, {
            startY: currentY,
            head: [headerRow1, headerRow2],
            body: tableData,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 1,
                overflow: 'linebreak'
            },
            headStyles: {
                fillColor: [59, 130, 246],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle'
            },
            columnStyles,
            didParseCell: (hookData: any) => {
                if (hookData.section === 'body') {
                    const colIdx = hookData.column.index
                    const totalCols = 2 + totalComponents + 2 // Nº + Disc + components + MF + Obs

                    // Color code grade values (component columns and média final)
                    if (colIdx >= 2 && colIdx < totalCols - 1) {
                        const cellValue = hookData.cell.raw
                        if (cellValue && cellValue !== '-') {
                            const nota = parseFloat(cellValue)
                            if (!isNaN(nota)) {
                                const color = getGradeColorRGB(
                                    nota,
                                    data.turma.nivel_ensino,
                                    undefined,
                                    false,
                                    colorConfig
                                )
                                hookData.cell.styles.textColor = color
                                hookData.cell.styles.fontStyle = 'bold'
                            }
                        }
                    }

                    // Color code observation column (last column)
                    if (colIdx === totalCols - 1 && hookData.cell.raw) {
                        if (hookData.cell.raw.includes('Transita') && !hookData.cell.raw.includes('Não')) {
                            hookData.cell.styles.textColor = [34, 197, 94]
                            hookData.cell.styles.fontStyle = 'bold'
                        } else if (hookData.cell.raw.includes('Não')) {
                            hookData.cell.styles.textColor = [239, 68, 68]
                            hookData.cell.styles.fontStyle = 'bold'
                        }
                    }
                }
            },
            didDrawPage: () => addPDFFooter(doc, pageWidth, pageHeight)
        })
    } else {
        // Fallback to simple trimester totals if no components
        const headers = ['Nº', 'Disciplina', '1º Trim', '2º Trim', '3º Trim', 'Média Final', 'Observação']

        const tableData: any[] = data.disciplinas.map((disciplina, index) => [
            (index + 1).toString(),
            disciplina.nome,
            disciplina.notas_trimestrais[1] !== null ? disciplina.notas_trimestrais[1].toFixed(1) : '-',
            disciplina.notas_trimestrais[2] !== null ? disciplina.notas_trimestrais[2].toFixed(1) : '-',
            disciplina.notas_trimestrais[3] !== null ? disciplina.notas_trimestrais[3].toFixed(1) : '-',
            disciplina.nota_final !== null ? disciplina.nota_final.toFixed(1) : '-',
            disciplina.transita ? 'Transita' : 'Não Transita'
        ])

        autoTable(doc, {
            startY: currentY,
            head: [headers],
            body: tableData,
            theme: 'grid',
            styles: {
                fontSize: 9,
                cellPadding: 3,
                overflow: 'linebreak'
            },
            headStyles: {
                fillColor: [59, 130, 246],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { halign: 'left', cellWidth: 80 },
                2: { halign: 'center', cellWidth: 25 },
                3: { halign: 'center', cellWidth: 25 },
                4: { halign: 'center', cellWidth: 25 },
                5: { halign: 'center', cellWidth: 25 },
                6: { halign: 'center', cellWidth: 35 }
            },
            didParseCell: (hookData: any) => {
                if (hookData.section === 'body' && hookData.column.index >= 2 && hookData.column.index <= 5) {
                    const cellValue = hookData.cell.raw
                    if (cellValue && cellValue !== '-') {
                        const nota = parseFloat(cellValue)
                        if (!isNaN(nota)) {
                            const color = getGradeColorRGB(nota, data.turma.nivel_ensino, undefined, false, colorConfig)
                            hookData.cell.styles.textColor = color
                            hookData.cell.styles.fontStyle = 'bold'
                        }
                    }
                }
                if (hookData.section === 'body' && hookData.column.index === 6 && hookData.cell.raw) {
                    if (hookData.cell.raw.includes('Transita') && !hookData.cell.raw.includes('Não')) {
                        hookData.cell.styles.textColor = [34, 197, 94]
                        hookData.cell.styles.fontStyle = 'bold'
                    } else if (hookData.cell.raw.includes('Não')) {
                        hookData.cell.styles.textColor = [239, 68, 68]
                        hookData.cell.styles.fontStyle = 'bold'
                    }
                }
            },
            didDrawPage: () => addPDFFooter(doc, pageWidth, pageHeight)
        })
    }

    // Overall Statistics - Compact version
    const finalY = (doc as any).lastAutoTable.finalY + 8

    // Statistics in smaller font, inline format
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('ESTATÍSTICAS:', 14, finalY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const statsText = `Total: ${data.estatisticas.total_disciplinas} | Aprov.: ${data.estatisticas.disciplinas_aprovadas} | Reprov.: ${data.estatisticas.disciplinas_reprovadas} | Média Geral: ${data.estatisticas.media_geral.toFixed(2)}`
    doc.text(statsText, 45, finalY)

    // Final observation - positioned to the right
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')

    const obsY = finalY
    if (data.estatisticas.transita) {
        doc.setTextColor(34, 197, 94)  // Green
        doc.text('OBSERVAÇÃO: TRANSITA', pageWidth - 14, obsY, { align: 'right' })
    } else {
        doc.setTextColor(239, 68, 68)  // Red
        doc.text('OBSERVAÇÃO: NÃO TRANSITA', pageWidth - 14, obsY, { align: 'right' })
    }
    doc.setTextColor(0, 0, 0)  // Reset to black

    // Signatures section
    const signY = finalY + 25
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    // Three signature boxes
    const signWidth = (pageWidth - 56) / 3
    const signX1 = 14
    const signX2 = 14 + signWidth + 14
    const signX3 = 14 + (signWidth + 14) * 2

    // Signature lines
    doc.setDrawColor(100, 100, 100)
    doc.line(signX1, signY, signX1 + signWidth, signY)
    doc.line(signX2, signY, signX2 + signWidth, signY)
    doc.line(signX3, signY, signX3 + signWidth, signY)

    // Labels
    doc.setFontSize(8)
    doc.text('O(A) Director(a) de Turma', signX1 + signWidth / 2, signY + 4, { align: 'center' })
    doc.text('O(A) Director(a) Pedagógico(a)', signX2 + signWidth / 2, signY + 4, { align: 'center' })
    doc.text('O(A) Director(a) Geral', signX3 + signWidth / 2, signY + 4, { align: 'center' })

    // Save
    const filename = `termo-frequencia_${data.aluno.numero_processo}_${data.turma.ano_lectivo}.pdf`
    doc.save(filename)
}

/**
 * Generates Termo de Frequência PDF as Blob (for batch processing)
 * Same as generateTermoFrequenciaPDF but returns Blob instead of downloading
 * Uses landscape orientation to accommodate component columns
 */
export async function generateTermoFrequenciaPDFBlob(
    data: TermoFrequenciaData,
    headerConfig: HeaderConfig | null | undefined,
    colorConfig: GradeColorConfig | null
): Promise<Blob> {
    // Use landscape orientation for better component display
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Render header
    let currentY = await renderTermoFrequenciaHeader(doc, data, headerConfig, pageWidth)

    // Render student information
    currentY = renderStudentInfo(doc, data, currentY + 3, pageWidth)

    currentY += 5  // Add space above to separate from previous table
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('DESEMPENHO ACADÉMICO', pageWidth / 2, currentY, { align: 'center' })
    currentY += 3  // Minimal space below to bring table very close

    // Calculate unified component structure across ALL disciplines
    const componentCodesByTrimester: { 1: Map<string, ComponenteNota>; 2: Map<string, ComponenteNota>; 3: Map<string, ComponenteNota> } = {
        1: new Map(),
        2: new Map(),
        3: new Map()
    }

    data.disciplinas.forEach(disciplina => {
        if (disciplina.componentesPorTrimestre) {
            ([1, 2, 3] as const).forEach(t => {
                disciplina.componentesPorTrimestre[t].forEach(comp => {
                    if (!componentCodesByTrimester[t].has(comp.codigo)) {
                        componentCodesByTrimester[t].set(comp.codigo, comp)
                    }
                })
            })
        }
    })

    const componentsT1 = Array.from(componentCodesByTrimester[1].values())
    const componentsT2 = Array.from(componentCodesByTrimester[2].values())
    const componentsT3 = Array.from(componentCodesByTrimester[3].values())

    const hasAnyComponents = componentsT1.length > 0 || componentsT2.length > 0 || componentsT3.length > 0

    // Helper function to get nota for a specific component
    const getNotaForComponent = (disciplina: DisciplinaTermoFrequencia, trimestre: 1 | 2 | 3, codigo: string): string => {
        if (!disciplina.componentesPorTrimestre) return '-'
        const comp = disciplina.componentesPorTrimestre[trimestre].find(c => c.codigo === codigo)
        return comp?.nota !== null && comp?.nota !== undefined ? comp.nota.toFixed(1) : '-'
    }

    if (hasAnyComponents) {
        // Build two-row header for component-based display
        const headerRow1: any[] = [
            { content: 'Nº', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'DISCIPLINAS', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
        ]

        // Add trimester headers with colSpan
        if (componentsT1.length > 0) {
            headerRow1.push({
                content: '1º TRIMESTRE',
                colSpan: componentsT1.length,
                styles: { halign: 'center', valign: 'middle', fillColor: [59, 130, 246] }
            })
        }
        if (componentsT2.length > 0) {
            headerRow1.push({
                content: '2º TRIMESTRE',
                colSpan: componentsT2.length,
                styles: { halign: 'center', valign: 'middle', fillColor: [59, 130, 246] }
            })
        }
        if (componentsT3.length > 0) {
            headerRow1.push({
                content: '3º TRIMESTRE',
                colSpan: componentsT3.length,
                styles: { halign: 'center', valign: 'middle', fillColor: [59, 130, 246] }
            })
        }

        headerRow1.push({ content: 'MÉDIA FINAL', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } })
        headerRow1.push({ content: 'OBSERVAÇÃO', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } })

        // Second row: component codes
        const headerRow2: any[] = []
        componentsT1.forEach(comp => {
            headerRow2.push({ content: comp.codigo, styles: { halign: 'center', valign: 'middle', fontSize: 7 } })
        })
        componentsT2.forEach(comp => {
            headerRow2.push({ content: comp.codigo, styles: { halign: 'center', valign: 'middle', fontSize: 7 } })
        })
        componentsT3.forEach(comp => {
            headerRow2.push({ content: comp.codigo, styles: { halign: 'center', valign: 'middle', fontSize: 7 } })
        })

        // Build table data
        const tableData: any[] = []
        data.disciplinas.forEach((disciplina, index) => {
            const row: any[] = [
                (index + 1).toString(),
                disciplina.nome
            ]

            // Add component values for each trimester
            componentsT1.forEach(comp => {
                row.push(getNotaForComponent(disciplina, 1, comp.codigo))
            })
            componentsT2.forEach(comp => {
                row.push(getNotaForComponent(disciplina, 2, comp.codigo))
            })
            componentsT3.forEach(comp => {
                row.push(getNotaForComponent(disciplina, 3, comp.codigo))
            })

            row.push(disciplina.nota_final !== null ? disciplina.nota_final.toFixed(1) : '-')
            row.push(disciplina.transita ? 'Transita' : 'Não Transita')

            tableData.push(row)
        })

        // Calculate column widths dynamically
        const totalComponents = componentsT1.length + componentsT2.length + componentsT3.length
        const fixedWidth = 10 + 50 + 20 + 28 // Nº + Disciplina + Média Final + Observação
        const availableWidth = pageWidth - 28 - fixedWidth // margins
        const componentColWidth = Math.min(15, availableWidth / totalComponents)

        const columnStyles: any = {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'left', cellWidth: 50 }
        }

        let colIndex = 2
        for (let i = 0; i < totalComponents; i++) {
            columnStyles[colIndex++] = { halign: 'center', cellWidth: componentColWidth }
        }
        columnStyles[colIndex++] = { halign: 'center', cellWidth: 20 }
        columnStyles[colIndex] = { halign: 'center', cellWidth: 28 }

        // Generate table
        autoTable(doc, {
            startY: currentY,
            head: [headerRow1, headerRow2],
            body: tableData,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 1,
                overflow: 'linebreak'
            },
            headStyles: {
                fillColor: [59, 130, 246],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle'
            },
            columnStyles,
            didParseCell: (hookData: any) => {
                if (hookData.section === 'body') {
                    const colIdx = hookData.column.index
                    const totalCols = 2 + totalComponents + 2 // Nº + Disc + components + MF + Obs

                    // Color code grade values (component columns and média final)
                    if (colIdx >= 2 && colIdx < totalCols - 1) {
                        const cellValue = hookData.cell.raw
                        if (cellValue && cellValue !== '-') {
                            const nota = parseFloat(cellValue)
                            if (!isNaN(nota)) {
                                const color = getGradeColorRGB(
                                    nota,
                                    data.turma.nivel_ensino,
                                    undefined,
                                    false,
                                    colorConfig
                                )
                                hookData.cell.styles.textColor = color
                                hookData.cell.styles.fontStyle = 'bold'
                            }
                        }
                    }

                    // Color code observation column (last column)
                    if (colIdx === totalCols - 1 && hookData.cell.raw) {
                        if (hookData.cell.raw.includes('Transita') && !hookData.cell.raw.includes('Não')) {
                            hookData.cell.styles.textColor = [34, 197, 94]
                            hookData.cell.styles.fontStyle = 'bold'
                        } else if (hookData.cell.raw.includes('Não')) {
                            hookData.cell.styles.textColor = [239, 68, 68]
                            hookData.cell.styles.fontStyle = 'bold'
                        }
                    }
                }
            },
            didDrawPage: () => addPDFFooter(doc, pageWidth, pageHeight)
        })
    } else {
        // Fallback to simple trimester totals if no components
        const headers = ['Nº', 'Disciplina', '1º Trim', '2º Trim', '3º Trim', 'Média Final', 'Observação']

        const tableData: any[] = data.disciplinas.map((disciplina, index) => [
            (index + 1).toString(),
            disciplina.nome,
            disciplina.notas_trimestrais[1] !== null ? disciplina.notas_trimestrais[1].toFixed(1) : '-',
            disciplina.notas_trimestrais[2] !== null ? disciplina.notas_trimestrais[2].toFixed(1) : '-',
            disciplina.notas_trimestrais[3] !== null ? disciplina.notas_trimestrais[3].toFixed(1) : '-',
            disciplina.nota_final !== null ? disciplina.nota_final.toFixed(1) : '-',
            disciplina.transita ? 'Transita' : 'Não Transita'
        ])

        autoTable(doc, {
            startY: currentY,
            head: [headers],
            body: tableData,
            theme: 'grid',
            styles: {
                fontSize: 9,
                cellPadding: 3,
                overflow: 'linebreak'
            },
            headStyles: {
                fillColor: [59, 130, 246],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { halign: 'left', cellWidth: 80 },
                2: { halign: 'center', cellWidth: 25 },
                3: { halign: 'center', cellWidth: 25 },
                4: { halign: 'center', cellWidth: 25 },
                5: { halign: 'center', cellWidth: 25 },
                6: { halign: 'center', cellWidth: 35 }
            },
            didParseCell: (hookData: any) => {
                if (hookData.section === 'body' && hookData.column.index >= 2 && hookData.column.index <= 5) {
                    const cellValue = hookData.cell.raw
                    if (cellValue && cellValue !== '-') {
                        const nota = parseFloat(cellValue)
                        if (!isNaN(nota)) {
                            const color = getGradeColorRGB(nota, data.turma.nivel_ensino, undefined, false, colorConfig)
                            hookData.cell.styles.textColor = color
                            hookData.cell.styles.fontStyle = 'bold'
                        }
                    }
                }
                if (hookData.section === 'body' && hookData.column.index === 6 && hookData.cell.raw) {
                    if (hookData.cell.raw.includes('Transita') && !hookData.cell.raw.includes('Não')) {
                        hookData.cell.styles.textColor = [34, 197, 94]
                        hookData.cell.styles.fontStyle = 'bold'
                    } else if (hookData.cell.raw.includes('Não')) {
                        hookData.cell.styles.textColor = [239, 68, 68]
                        hookData.cell.styles.fontStyle = 'bold'
                    }
                }
            },
            didDrawPage: () => addPDFFooter(doc, pageWidth, pageHeight)
        })
    }

    // Overall Statistics - Compact version
    const finalY = (doc as any).lastAutoTable.finalY + 8

    // Statistics in smaller font, inline format
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('ESTATÍSTICAS:', 14, finalY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const statsText = `Total: ${data.estatisticas.total_disciplinas} | Aprov.: ${data.estatisticas.disciplinas_aprovadas} | Reprov.: ${data.estatisticas.disciplinas_reprovadas} | Média Geral: ${data.estatisticas.media_geral.toFixed(2)}`
    doc.text(statsText, 45, finalY)

    // Final observation - positioned to the right
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')

    const obsY = finalY
    if (data.estatisticas.transita) {
        doc.setTextColor(34, 197, 94)  // Green
        doc.text('OBSERVAÇÃO: TRANSITA', pageWidth - 14, obsY, { align: 'right' })
    } else {
        doc.setTextColor(239, 68, 68)  // Red
        doc.text('OBSERVAÇÃO: NÃO TRANSITA', pageWidth - 14, obsY, { align: 'right' })
    }
    doc.setTextColor(0, 0, 0)  // Reset to black

    // Signatures section
    const signY = finalY + 25
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    // Three signature boxes
    const signWidth = (pageWidth - 56) / 3
    const signX1 = 14
    const signX2 = 14 + signWidth + 14
    const signX3 = 14 + (signWidth + 14) * 2

    // Signature lines
    doc.setDrawColor(100, 100, 100)
    doc.line(signX1, signY, signX1 + signWidth, signY)
    doc.line(signX2, signY, signX2 + signWidth, signY)
    doc.line(signX3, signY, signX3 + signWidth, signY)

    // Labels
    doc.setFontSize(8)
    doc.text('O(A) Director(a) de Turma', signX1 + signWidth / 2, signY + 4, { align: 'center' })
    doc.text('O(A) Director(a) Pedagógico(a)', signX2 + signWidth / 2, signY + 4, { align: 'center' })
    doc.text('O(A) Director(a) Geral', signX3 + signWidth / 2, signY + 4, { align: 'center' })

    // Return as Blob instead of saving
    return doc.output('blob')
}

/**
 * Generates batch Termos de Frequência and creates a ZIP file
 */
export async function generateBatchTermosFrequenciaZip(
    termosData: TermoFrequenciaData[],
    turmaInfo: { codigo: string; ano: number },
    headerConfig: HeaderConfig | null | undefined,
    colorConfig: GradeColorConfig | null,
    onProgress?: (current: number, total: number, alunoNome: string) => void
): Promise<{ blob: Blob; filename: string; errors: Array<{ aluno: string; error: string }> }> {
    const zip = new JSZip()
    const errors: Array<{ aluno: string; error: string }> = []
    const total = termosData.length

    for (let i = 0; i < termosData.length; i++) {
        const termoData = termosData[i]

        try {
            // Update progress
            if (onProgress) {
                onProgress(i + 1, total, termoData.aluno.nome_completo)
            }

            // Generate PDF as Blob
            const pdfBlob = await generateTermoFrequenciaPDFBlob(termoData, headerConfig, colorConfig)

            // Create filename: termo_[numero_processo]_[nome].pdf
            const nomeFormatado = termoData.aluno.nome_completo
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove accents
                .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special chars
                .replace(/\s+/g, '_') // Replace spaces with underscore
                .substring(0, 50) // Limit length

            const filename = `termo_${termoData.aluno.numero_processo}_${nomeFormatado}.pdf`

            // Add to ZIP
            zip.file(filename, pdfBlob)

        } catch (error) {
            console.error(`Error generating PDF for ${termoData.aluno.nome_completo}:`, error)
            errors.push({
                aluno: termoData.aluno.nome_completo,
                error: error instanceof Error ? error.message : 'Erro desconhecido'
            })
        }
    }

    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const zipFilename = `termos_frequencia_${turmaInfo.codigo}_${turmaInfo.ano}.zip`

    return {
        blob: zipBlob,
        filename: zipFilename,
        errors
    }
}

