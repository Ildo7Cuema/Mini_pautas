import * as XLSX from 'xlsx'

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
        trimestre?: number
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
}

export function generateMiniPautaExcel(data: MiniPautaData): void {
    const workbook = XLSX.utils.book_new()

    // Check if all-trimester mode
    const isAllTrimesters = data.trimestre === 'all' && data.alunos[0]?.trimestres

    let headerRow: any[]
    let dataRows: any[][]

    if (isAllTrimesters) {
        // Get components for each trimestre
        const componentes1T = data.componentes.filter(c => c.trimestre === 1)
        const componentes2T = data.componentes.filter(c => c.trimestre === 2)
        const componentes3T = data.componentes.filter(c => c.trimestre === 3)

        // Headers for all-trimester layout
        headerRow = [
            'Nº',
            'Nº Processo',
            'Nome do Aluno',
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

        // Data rows for all-trimester layout
        dataRows = data.alunos.map((aluno, index) => {
            const row: any[] = [
                index + 1,
                aluno.numero_processo,
                aluno.nome_completo
            ]

            // 1º Trimestre
            const trimestre1 = aluno.trimestres?.[1]
            componentes1T.forEach(c => {
                const nota = trimestre1?.notas[c.codigo_componente]
                row.push(nota !== undefined ? nota : '')
            })
            row.push(trimestre1?.nota_final ?? '')

            // 2º Trimestre
            const trimestre2 = aluno.trimestres?.[2]
            componentes2T.forEach(c => {
                const nota = trimestre2?.notas[c.codigo_componente]
                row.push(nota !== undefined ? nota : '')
            })
            row.push(trimestre2?.nota_final ?? '')

            // 3º Trimestre
            const trimestre3 = aluno.trimestres?.[3]
            componentes3T.forEach(c => {
                const nota = trimestre3?.notas[c.codigo_componente]
                row.push(nota !== undefined ? nota : '')
            })
            row.push(trimestre3?.nota_final ?? '')

            // MF
            row.push(aluno.nota_final)

            return row
        })
    } else {
        // Headers for single-trimester layout
        headerRow = [
            'Nº',
            'Nº Processo',
            'Nome do Aluno',
            ...data.componentes.map(c => `${c.codigo_componente} (${c.peso_percentual}%)`),
            'Nota Final',
            'Classificação'
        ]

        // Data rows for single-trimester layout
        dataRows = data.alunos.map((aluno, index) => [
            index + 1,
            aluno.numero_processo,
            aluno.nome_completo,
            ...data.componentes.map(c => aluno.notas[c.codigo_componente] ?? ''),
            aluno.nota_final,
            aluno.classificacao
        ])
    }

    // Create header rows
    let headerRows: any[][]

    if (isAllTrimesters) {
        const componentsPerTrimestre = data.componentes.length

        // First 3 rows: Title and info
        const infoRows = [
            ['MINI-PAUTA'],
            [`Turma: ${data.turma.nome}`, '', `Disciplina: ${data.disciplina.nome}`],
            [`Ano Lectivo: ${data.turma.ano_lectivo}`, '', `Trimestre: Todos`],
            [] // Empty row
        ]

        // Trimester group header row
        const trimestreHeaderRow = [
            'Nº', 'Nº Processo', 'Nome do Aluno',
            '1º Trimestre', ...Array(componentsPerTrimestre).fill(''), '', // Spans components + MT1
            '2º Trimestre', ...Array(componentsPerTrimestre).fill(''), '', // Spans components + MT2
            '3º Trimestre', ...Array(componentsPerTrimestre).fill(''), '', // Spans components + MT3
            'MF'
        ]

        // Component header row
        const componentHeaderRow = [
            '', '', '', // Empty for Nº, Nº Processo, Nome
            ...headerRow.slice(3) // Components and MT columns
        ]

        headerRows = [...infoRows, trimestreHeaderRow, componentHeaderRow]
    } else {
        headerRows = [
            ['MINI-PAUTA'],
            [`Turma: ${data.turma.nome}`, '', `Disciplina: ${data.disciplina.nome}`],
            [`Ano Lectivo: ${data.turma.ano_lectivo}`, '', `Trimestre: ${data.trimestre}º`],
            [], // Empty row
            headerRow
        ]
    }


    // Statistics rows
    const statsRows = [
        [], // Empty row
        ['ESTATÍSTICAS DA TURMA'],
        ['Total de Alunos:', data.estatisticas.total_alunos],
        ['Aprovados:', data.estatisticas.aprovados, `(${data.estatisticas.taxa_aprovacao.toFixed(1)}%)`],
        ['Reprovados:', data.estatisticas.reprovados],
        ['Média da Turma:', data.estatisticas.media_turma.toFixed(2)],
        ['Nota Mínima:', data.estatisticas.nota_minima.toFixed(2)],
        ['Nota Máxima:', data.estatisticas.nota_maxima.toFixed(2)]
    ]

    // Combine all rows
    const allRows = [...headerRows, ...dataRows, ...statsRows]

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(allRows)

    // Add merges for trimester headers if all-trimester mode
    if (isAllTrimesters) {
        const componentsPerTrimestre = data.componentes.length
        const headerRowIndex = 4 // 0-indexed row where trimester headers are

        // Calculate column indices (0-indexed)
        const startCol = 3 // After Nº, Nº Processo, Nome

        // Merge cells for each trimestre header
        const merges = [
            // 1º Trimestre: spans components + MT1
            { s: { r: headerRowIndex, c: startCol }, e: { r: headerRowIndex, c: startCol + componentsPerTrimestre } },
            // 2º Trimestre
            { s: { r: headerRowIndex, c: startCol + componentsPerTrimestre + 1 }, e: { r: headerRowIndex, c: startCol + (componentsPerTrimestre * 2) + 1 } },
            // 3º Trimestre
            { s: { r: headerRowIndex, c: startCol + (componentsPerTrimestre * 2) + 2 }, e: { r: headerRowIndex, c: startCol + (componentsPerTrimestre * 3) + 2 } }
        ]

        worksheet['!merges'] = merges
    }

    // Set column widths
    const columnWidths = [
        { wch: 5 },  // Nº
        { wch: 15 }, // Nº Processo
        { wch: 30 }, // Nome
        ...data.componentes.map(() => ({ wch: 12 })), // Componentes
        { wch: 12 }, // Nota Final
        { wch: 15 }  // Classificação
    ]
    worksheet['!cols'] = columnWidths

    // Style header
    const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1'
        if (!worksheet[address]) continue
        worksheet[address].s = {
            font: { bold: true, sz: 14 },
            alignment: { horizontal: 'center' }
        }
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mini-Pauta')

    // Generate filename and download
    const trimestreStr = data.trimestre === 'all' ? 'todos' : `${data.trimestre}trim`
    const filename = `mini-pauta_${data.turma.codigo_turma}_${data.disciplina.codigo_disciplina}_${trimestreStr}.xlsx`
    XLSX.writeFile(workbook, filename)
}

export function generateCSV(data: MiniPautaData): void {
    // Check if all-trimester mode
    const isAllTrimesters = data.trimestre === 'all' && data.alunos[0]?.trimestres

    let headers: string[]
    let rows: any[][]

    if (isAllTrimesters) {
        // Get components for each trimestre
        const componentes1T = data.componentes.filter(c => c.trimestre === 1)
        const componentes2T = data.componentes.filter(c => c.trimestre === 2)
        const componentes3T = data.componentes.filter(c => c.trimestre === 3)

        // Headers for all-trimester layout
        headers = [
            'Nº',
            'Nº Processo',
            'Nome do Aluno',
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

        // Data rows for all-trimester layout
        rows = data.alunos.map((aluno, index) => {
            const row: any[] = [
                index + 1,
                aluno.numero_processo,
                aluno.nome_completo
            ]

            // 1º Trimestre
            const trimestre1 = aluno.trimestres?.[1]
            componentes1T.forEach(c => {
                const nota = trimestre1?.notas[c.codigo_componente]
                row.push(nota !== undefined ? nota : '')
            })
            row.push(trimestre1?.nota_final ?? '')

            // 2º Trimestre
            const trimestre2 = aluno.trimestres?.[2]
            componentes2T.forEach(c => {
                const nota = trimestre2?.notas[c.codigo_componente]
                row.push(nota !== undefined ? nota : '')
            })
            row.push(trimestre2?.nota_final ?? '')

            // 3º Trimestre
            const trimestre3 = aluno.trimestres?.[3]
            componentes3T.forEach(c => {
                const nota = trimestre3?.notas[c.codigo_componente]
                row.push(nota !== undefined ? nota : '')
            })
            row.push(trimestre3?.nota_final ?? '')

            // MF
            row.push(aluno.nota_final)

            return row
        })
    } else {
        // Headers for single-trimester layout
        headers = [
            'Nº',
            'Nº Processo',
            'Nome do Aluno',
            ...data.componentes.map(c => `${c.codigo_componente} (${c.peso_percentual}%)`),
            'Nota Final',
            'Classificação'
        ]

        // Data rows for single-trimester layout
        rows = data.alunos.map((aluno, index) => [
            index + 1,
            aluno.numero_processo,
            aluno.nome_completo,
            ...data.componentes.map(c => aluno.notas[c.codigo_componente] ?? ''),
            aluno.nota_final,
            aluno.classificacao
        ])
    }

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const trimestreStr = data.trimestre === 'all' ? 'todos' : `${data.trimestre}trim`
    link.download = `mini-pauta_${data.turma.codigo_turma}_${data.disciplina.codigo_disciplina}_${trimestreStr}.csv`
    link.click()
}
