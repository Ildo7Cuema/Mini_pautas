import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
