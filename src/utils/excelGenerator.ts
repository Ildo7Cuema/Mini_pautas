import * as XLSX from 'xlsx'

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
        id: string  // Component ID for unique identification
        codigo_componente: string
        nome: string
        peso_percentual: number
        trimestre?: number
        is_calculated?: boolean
        disciplina_nome?: string // Discipline name for grouping (Primary Education)
        disciplina_ordem?: number // Discipline order for sorting (Primary Education)
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

    // Check if Primary Education
    const isPrimaryEducation = data.turma.nivel_ensino?.toLowerCase().includes('primário') ||
        data.turma.nivel_ensino?.toLowerCase().includes('primario')

    // Check if all disciplines mode (Primary Education only)
    const isAllDisciplines = data.componentes.length > 0 &&
        data.componentes.some(c => c.disciplina_nome) &&
        new Set(data.componentes.map(c => c.disciplina_nome)).size > 1

    let headerRow: any[]
    let dataRows: any[][]

    if (isPrimaryEducation && isAllDisciplines && !isAllTrimesters) {
        // PRIMARY EDUCATION - ALL DISCIPLINES FORMAT (Single Trimester)
        // Group components by discipline
        interface DisciplineGroup {
            disciplina_nome: string
            ordem?: number
            componentes: Array<{ id: string; codigo_componente: string }>
        }

        const disciplineMap = new Map<string, DisciplineGroup>()
        const currentTrimestre = (data.trimestre === 'all' ? 1 : data.trimestre) as number

        data.componentes.forEach(comp => {
            if (comp.trimestre === currentTrimestre || !comp.trimestre) {
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
                    codigo_componente: comp.codigo_componente
                })
            }
        })

        // Sort by ordem if available
        const disciplineGroups = Array.from(disciplineMap.values()).sort((a, b) => {
            if (a.ordem !== undefined && b.ordem !== undefined) {
                return a.ordem - b.ordem
            }
            return a.disciplina_nome.localeCompare(b.disciplina_nome)
        })

        // Build headers
        headerRow = ['Nº', 'Nome do Aluno']
        disciplineGroups.forEach(group => {
            group.componentes.forEach(comp => {
                headerRow.push(comp.codigo_componente)
            })
        })

        // Build data rows
        dataRows = data.alunos.map((aluno, index) => {
            const row: any[] = [
                index + 1,
                aluno.nome_completo
            ]

            disciplineGroups.forEach(group => {
                group.componentes.forEach(comp => {
                    // Use component id for grade lookup to avoid conflicts
                    const nota = aluno.notas[comp.id]
                    row.push(nota !== undefined ? nota : '')
                })
            })

            return row
        })

    } else if (isAllTrimesters) {
        // Get components for each trimestre
        const componentes1T = data.componentes.filter(c => c.trimestre === 1)
        const componentes2T = data.componentes.filter(c => c.trimestre === 2)
        const componentes3T = data.componentes.filter(c => c.trimestre === 3)

        // Headers for all-trimester layout (without Nº Processo)
        headerRow = [
            'Nº',
            'Nome do Aluno',
            // 1º Trimestre
            ...componentes1T.map(c => c.codigo_componente),
            // 2º Trimestre
            ...componentes2T.map(c => c.codigo_componente),
            // 3º Trimestre
            ...componentes3T.map(c => c.codigo_componente)
        ]

        // Data rows for all-trimester layout (without Nº Processo)
        dataRows = data.alunos.map((aluno, index) => {
            const row: any[] = [
                index + 1,
                aluno.nome_completo
            ]

            // 1º Trimestre
            const trimestre1 = aluno.trimestres?.[1]
            componentes1T.forEach(c => {
                const nota = trimestre1?.notas[c.codigo_componente]
                row.push(nota !== undefined ? nota : '')
            })

            // 2º Trimestre
            const trimestre2 = aluno.trimestres?.[2]
            componentes2T.forEach(c => {
                const nota = trimestre2?.notas[c.codigo_componente]
                row.push(nota !== undefined ? nota : '')
            })

            // 3º Trimestre
            const trimestre3 = aluno.trimestres?.[3]
            componentes3T.forEach(c => {
                const nota = trimestre3?.notas[c.codigo_componente]
                row.push(nota !== undefined ? nota : '')
            })

            return row
        })
    } else {
        // Headers for single-trimester layout - MATCH PREVIEW (no Nota Final or Classificação)
        headerRow = [
            'Nº',
            'Nome do Aluno',
            ...data.componentes.map(c => `${c.codigo_componente} (${c.peso_percentual}%)`)
        ]

        // Data rows for single-trimester layout - MATCH PREVIEW (no Nota Final or Classificação)
        dataRows = data.alunos.map((aluno, index) => [
            index + 1,
            aluno.nome_completo,
            ...data.componentes.map(c => aluno.notas[c.codigo_componente] ?? '')
        ])
    }

    // Create header rows
    let headerRows: any[][]

    if (isPrimaryEducation && isAllDisciplines && !isAllTrimesters) {
        // PRIMARY EDUCATION - ALL DISCIPLINES: Create discipline-grouped headers
        const disciplineMap = new Map<string, { ordem?: number; componentes: string[] }>()
        const currentTrimestre = (data.trimestre === 'all' ? 1 : data.trimestre) as number

        data.componentes.forEach(comp => {
            if (comp.trimestre === currentTrimestre || !comp.trimestre) {
                const disciplineName = comp.disciplina_nome || 'Sem Disciplina'

                if (!disciplineMap.has(disciplineName)) {
                    disciplineMap.set(disciplineName, {
                        ordem: comp.disciplina_ordem,
                        componentes: []
                    })
                }

                disciplineMap.get(disciplineName)!.componentes.push(comp.codigo_componente)
            }
        })

        // Sort by ordem if available
        const disciplineGroups = Array.from(disciplineMap.entries())
            .sort(([nameA, dataA], [nameB, dataB]) => {
                if (dataA.ordem !== undefined && dataB.ordem !== undefined) {
                    return dataA.ordem - dataB.ordem
                }
                return nameA.localeCompare(nameB)
            })

        // First 3 rows: Title and info
        const infoRows = [
            ['MINI-PAUTA'],
            [`Turma: ${data.turma.nome}`, '', `Ano Lectivo: ${data.turma.ano_lectivo}`],
            [`Trimestre: ${data.trimestre}º`],
            [] // Empty row
        ]

        // Discipline group header row
        const disciplineHeaderRow = ['Nº', 'Nome do Aluno']
        disciplineGroups.forEach(([disciplineName, disciplineData]) => {
            disciplineHeaderRow.push(disciplineName)
            // Add empty cells for the span
            for (let i = 1; i < disciplineData.componentes.length; i++) {
                disciplineHeaderRow.push('')
            }
        })

        // Component header row
        const componentHeaderRow = ['', ''] // Empty for Nº, Nome
        disciplineGroups.forEach(([, disciplineData]) => {
            componentHeaderRow.push(...disciplineData.componentes)
        })

        headerRows = [...infoRows, disciplineHeaderRow, componentHeaderRow]

    } else if (isAllTrimesters) {
        const componentsPerTrimestre = data.componentes.length

        // First 3 rows: Title and info
        const infoRows = [
            ['MINI-PAUTA'],
            [`Turma: ${data.turma.nome}`, '', `Disciplina: ${data.disciplina.nome}`],
            [`Ano Lectivo: ${data.turma.ano_lectivo}`, '', `Trimestre: Todos`],
            [] // Empty row
        ]

        // Trimester group header row (without Nº Processo)
        const trimestreHeaderRow = [
            'Nº', 'Nome do Aluno',
            '1º Trimestre', ...Array(componentsPerTrimestre).fill(''), '', // Spans components + MT1
            '2º Trimestre', ...Array(componentsPerTrimestre).fill(''), '', // Spans components + MT2
            '3º Trimestre', ...Array(componentsPerTrimestre).fill(''), '', // Spans components + MT3
            'MF'
        ]

        // Component header row (without Nº Processo)
        const componentHeaderRow = [
            '', '', // Empty for Nº, Nome
            ...headerRow.slice(2) // Components and MT columns
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

    // Add merges for discipline or trimester headers
    if (isPrimaryEducation && isAllDisciplines && !isAllTrimesters) {
        // PRIMARY EDUCATION - ALL DISCIPLINES: Merge discipline headers
        const disciplineMap = new Map<string, { ordem?: number; componentes: string[] }>()
        const currentTrimestre = (data.trimestre === 'all' ? 1 : data.trimestre) as number

        data.componentes.forEach(comp => {
            if (comp.trimestre === currentTrimestre || !comp.trimestre) {
                const disciplineName = comp.disciplina_nome || 'Sem Disciplina'

                if (!disciplineMap.has(disciplineName)) {
                    disciplineMap.set(disciplineName, {
                        ordem: comp.disciplina_ordem,
                        componentes: []
                    })
                }

                disciplineMap.get(disciplineName)!.componentes.push(comp.codigo_componente)
            }
        })

        // Sort by ordem if available
        const disciplineGroups = Array.from(disciplineMap.entries())
            .sort(([nameA, dataA], [nameB, dataB]) => {
                if (dataA.ordem !== undefined && dataB.ordem !== undefined) {
                    return dataA.ordem - dataB.ordem
                }
                return nameA.localeCompare(nameB)
            })

        const headerRowIndex = 4 // 0-indexed row where discipline headers are
        const startCol = 2 // After Nº, Nome

        const merges = []
        let currentCol = startCol

        disciplineGroups.forEach(([, disciplineData]) => {
            if (disciplineData.componentes.length > 1) {
                // Merge cells for discipline name spanning its components
                merges.push({
                    s: { r: headerRowIndex, c: currentCol },
                    e: { r: headerRowIndex, c: currentCol + disciplineData.componentes.length - 1 }
                })
            }
            currentCol += disciplineData.componentes.length
        })

        // Also merge Nº and Nome cells vertically (rows 4 and 5)
        merges.push(
            { s: { r: headerRowIndex, c: 0 }, e: { r: headerRowIndex + 1, c: 0 } }, // Nº
            { s: { r: headerRowIndex, c: 1 }, e: { r: headerRowIndex + 1, c: 1 } }  // Nome
        )

        worksheet['!merges'] = merges

    } else if (isAllTrimesters) {
        const componentsPerTrimestre = data.componentes.length
        const headerRowIndex = 4 // 0-indexed row where trimester headers are

        // Calculate column indices (0-indexed, without Nº Processo)
        const startCol = 2 // After Nº, Nome

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

    // Check if Primary Education
    const isPrimaryEducation = data.turma.nivel_ensino?.toLowerCase().includes('primário') ||
        data.turma.nivel_ensino?.toLowerCase().includes('primario')

    // Check if all disciplines mode (Primary Education only)
    const isAllDisciplines = data.componentes.length > 0 &&
        data.componentes.some(c => c.disciplina_nome) &&
        new Set(data.componentes.map(c => c.disciplina_nome)).size > 1

    let headers: string[]
    let rows: any[][]

    if (isPrimaryEducation && isAllDisciplines && !isAllTrimesters) {
        // PRIMARY EDUCATION - ALL DISCIPLINES FORMAT (Single Trimester)
        // Group components by discipline
        interface DisciplineGroup {
            disciplina_nome: string
            ordem?: number
            componentes: Array<{ id: string; codigo_componente: string }>
        }

        const disciplineMap = new Map<string, DisciplineGroup>()
        const currentTrimestre = (data.trimestre === 'all' ? 1 : data.trimestre) as number

        data.componentes.forEach(comp => {
            if (comp.trimestre === currentTrimestre || !comp.trimestre) {
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
                    codigo_componente: comp.codigo_componente
                })
            }
        })

        // Sort by ordem if available
        const disciplineGroups = Array.from(disciplineMap.values()).sort((a, b) => {
            if (a.ordem !== undefined && b.ordem !== undefined) {
                return a.ordem - b.ordem
            }
            return a.disciplina_nome.localeCompare(b.disciplina_nome)
        })

        // Build headers
        headers = ['Nº', 'Nome do Aluno']
        disciplineGroups.forEach(group => {
            group.componentes.forEach(comp => {
                headers.push(comp.codigo_componente)
            })
        })

        // Build data rows
        rows = data.alunos.map((aluno, index) => {
            const row: any[] = [
                index + 1,
                aluno.nome_completo
            ]

            disciplineGroups.forEach(group => {
                group.componentes.forEach(comp => {
                    // Use component id for grade lookup to avoid conflicts
                    const nota = aluno.notas[comp.id]
                    row.push(nota !== undefined ? nota : '')
                })
            })

            return row
        })

    } else if (isAllTrimesters) {
        // Get components for each trimestre
        const componentes1T = data.componentes.filter(c => c.trimestre === 1)
        const componentes2T = data.componentes.filter(c => c.trimestre === 2)
        const componentes3T = data.componentes.filter(c => c.trimestre === 3)

        // Headers for all-trimester layout (without Nº Processo)
        headers = [
            'Nº',
            'Nome do Aluno',
            // 1º Trimestre
            ...componentes1T.map(c => c.codigo_componente),
            // 2º Trimestre
            ...componentes2T.map(c => c.codigo_componente),
            // 3º Trimestre
            ...componentes3T.map(c => c.codigo_componente)
        ]

        // Data rows for all-trimester layout (without Nº Processo)
        rows = data.alunos.map((aluno, index) => {
            const row: any[] = [
                index + 1,
                aluno.nome_completo
            ]

            // 1º Trimestre
            const trimestre1 = aluno.trimestres?.[1]
            componentes1T.forEach(c => {
                const nota = trimestre1?.notas[c.codigo_componente]
                row.push(nota !== undefined ? nota : '')
            })

            // 2º Trimestre
            const trimestre2 = aluno.trimestres?.[2]
            componentes2T.forEach(c => {
                const nota = trimestre2?.notas[c.codigo_componente]
                row.push(nota !== undefined ? nota : '')
            })

            // 3º Trimestre
            const trimestre3 = aluno.trimestres?.[3]
            componentes3T.forEach(c => {
                const nota = trimestre3?.notas[c.codigo_componente]
                row.push(nota !== undefined ? nota : '')
            })

            return row
        })
    } else {
        // Headers for single-trimester layout - MATCH PREVIEW (no Nota Final or Classificação)
        headers = [
            'Nº',
            'Nome do Aluno',
            ...data.componentes.map(c => `${c.codigo_componente} (${c.peso_percentual}%)`)
        ]

        // Data rows for single-trimester layout - MATCH PREVIEW (no Nota Final or Classificação)
        rows = data.alunos.map((aluno, index) => [
            index + 1,
            aluno.nome_completo,
            ...data.componentes.map(c => aluno.notas[c.codigo_componente] ?? '')
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
