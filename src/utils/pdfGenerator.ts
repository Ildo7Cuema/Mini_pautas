import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface TrimestreData {
    notas: Record<string, number>
    nota_final: number
}

interface MiniPautaData {
    turma: {
        nome: string
        ano_lectivo: number
        codigo_turma: string
    }
    disciplina: {
        nome: string
        codigo_disciplina: string
    }
    trimestre: number | 'all'
    alunos: Array<{
        numero_processo: string
        nome_completo: string
        notas: Record<string, number>
        nota_final: number
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

export function generateMiniPautaPDF(data: MiniPautaData): void {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Header
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('MINI-PAUTA', pageWidth / 2, 15, { align: 'center' })

    // School info
    if (data.escola) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(data.escola.nome, pageWidth / 2, 22, { align: 'center' })
        doc.text(`${data.escola.provincia} - ${data.escola.municipio}`, pageWidth / 2, 27, { align: 'center' })
    }

    // Class and subject info
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Turma: ${data.turma.nome}`, 14, 35)
    doc.text(`Disciplina: ${data.disciplina.nome}`, 14, 41)
    doc.text(`Trimestre: ${data.trimestre === 'all' ? 'Todos' : data.trimestre + 'º'}`, 14, 47)
    doc.text(`Ano Lectivo: ${data.turma.ano_lectivo}`, pageWidth - 14, 35, { align: 'right' })

    // Check if all-trimester mode
    const isAllTrimesters = data.trimestre === 'all' && data.alunos[0]?.trimestres

    let headers: string[]
    let tableData: any[][]

    if (isAllTrimesters) {
        // Get components for each trimestre
        const componentes1T = data.componentes.filter(c => c.trimestre === 1)
        const componentes2T = data.componentes.filter(c => c.trimestre === 2)
        const componentes3T = data.componentes.filter(c => c.trimestre === 3)

        // Headers for all-trimester layout
        headers = [
            'Nº',
            'Nº Processo',
            'Nome',
            // 1º Trimestre
            ...componentes1T.map(c => c.codigo_componente),
            'MT1',
            // 2º Trimestre
            ...componentes2T.map(c => c.codigo_componente),
            'MT2',
            // 3º Trimestre
            ...componentes3T.map(c => c.codigo_componente),
            'MT3',
            'MF'
        ]

        // Table data for all-trimester layout
        tableData = data.alunos.map((aluno, index) => {
            const row = [
                (index + 1).toString(),
                aluno.numero_processo,
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

            // MF
            row.push(aluno.nota_final.toFixed(2))

            return row
        })
    } else {
        // Headers for single-trimester layout
        headers = [
            'Nº',
            'Nº Processo',
            'Nome do Aluno',
            ...data.componentes.map(c => `${c.codigo_componente}\n(${c.peso_percentual}%)`),
            'Nota Final',
            'Classificação'
        ]

        // Table data for single-trimester layout
        tableData = data.alunos.map((aluno, index) => [
            (index + 1).toString(),
            aluno.numero_processo,
            aluno.nome_completo,
            ...data.componentes.map(c => {
                const nota = aluno.notas[c.codigo_componente]
                return nota !== undefined ? nota.toFixed(2) : '-'
            }),
            aluno.nota_final.toFixed(2),
            aluno.classificacao
        ])
    }

    // Generate table
    if (isAllTrimesters) {
        // For all-trimester mode, we need two header rows
        const componentes1T = data.componentes.filter(c => c.trimestre === 1)
        const componentes2T = data.componentes.filter(c => c.trimestre === 2)
        const componentes3T = data.componentes.filter(c => c.trimestre === 3)

        // First header row: Trimester groups
        const headerRow1 = [
            { content: 'Nº', rowSpan: 2 },
            { content: 'Nº Processo', rowSpan: 2 },
            { content: 'Nome', rowSpan: 2 },
            { content: '1º Trimestre', colSpan: componentes1T.length + 1 },
            { content: '2º Trimestre', colSpan: componentes2T.length + 1 },
            { content: '3º Trimestre', colSpan: componentes3T.length + 1 },
            { content: 'MF', rowSpan: 2 }
        ]

        // Second header row: Component names and MT
        const headerRow2 = [
            // 1º Trimestre components
            ...componentes1T.map(c => c.codigo_componente),
            'MT1',
            // 2º Trimestre components
            ...componentes2T.map(c => c.codigo_componente),
            'MT2',
            // 3º Trimestre components
            ...componentes3T.map(c => c.codigo_componente),
            'MT3'
        ]

        autoTable(doc, {
            startY: 53,
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
                1: { halign: 'center', cellWidth: 20 },
                2: { halign: 'left', cellWidth: 35 }
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
                1: { halign: 'center', cellWidth: 25 },
                2: { halign: 'left', cellWidth: 50 },
                [headers.length - 2]: { halign: 'center', fontStyle: 'bold' },
                [headers.length - 1]: { halign: 'center' }
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
