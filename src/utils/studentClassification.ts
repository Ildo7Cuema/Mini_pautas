/**
 * Student Classification Utility
 * 
 * Determines if a student transitions (Transita) or not (Não Transita) based on
 * Angolan education system rules for Ensino Primário and Ensino Secundário I Ciclo.
 */

export interface DisciplinaGrade {
    id: string
    nome: string
    nota: number // Grade from MF or MFD component
}

export interface ClassificationResult {
    status: 'Transita' | 'Não Transita' | 'Condicional' | 'AguardandoNotas'
    motivos: string[]
    disciplinas_em_risco: string[]
    acoes_recomendadas: string[]
}

/**
 * Extract class number from class string (e.g., "7ª Classe" -> 7)
 */
function extractClassNumber(classe?: string): number | null {
    if (!classe) return null
    const match = classe.match(/(\d+)[ªº]/)
    return match ? parseInt(match[1], 10) : null
}

/**
 * Round grade to nearest integer if needed
 */
function roundGrade(grade: number): number {
    return Math.round(grade)
}

/**
 * Check if a discipline is in the list of mandatory disciplines
 */
function isMandatoryDiscipline(disciplinaId: string, disciplinaNome: string, mandatoryDisciplineIds?: string[]): boolean {
    // If no mandatory disciplines configured, fall back to Português and Matemática
    if (!mandatoryDisciplineIds || mandatoryDisciplineIds.length === 0) {
        const normalized = disciplinaNome.toLowerCase().trim()
        return normalized.includes('português') ||
            normalized.includes('portugues') ||
            normalized.includes('matemática') ||
            normalized.includes('matematica')
    }

    // Check if discipline ID is in the mandatory list
    return mandatoryDisciplineIds.includes(disciplinaId)
}

/**
 * Classify student for Ensino Primário
 * Rule: Transita if ALL disciplines >= 5, Não Transita if ANY discipline < 5
 */
function classifyEnsinoPrimario(disciplinas: DisciplinaGrade[]): ClassificationResult {
    if (disciplinas.length === 0) {
        return {
            status: 'AguardandoNotas',
            motivos: ['Nenhuma nota disponível'],
            disciplinas_em_risco: [],
            acoes_recomendadas: ['Aguardar lançamento de notas']
        }
    }

    const disciplinasAbaixo5: string[] = []

    disciplinas.forEach(disc => {
        const notaArredondada = roundGrade(disc.nota)
        if (notaArredondada < 5) {
            disciplinasAbaixo5.push(disc.nome)
        }
    })

    if (disciplinasAbaixo5.length === 0) {
        return {
            status: 'Transita',
            motivos: ['Todas as disciplinas com nota >= 5'],
            disciplinas_em_risco: [],
            acoes_recomendadas: []
        }
    } else {
        return {
            status: 'Não Transita',
            motivos: [`${disciplinasAbaixo5.length} disciplina(s) com nota < 5`],
            disciplinas_em_risco: disciplinasAbaixo5,
            acoes_recomendadas: ['Reforço nas disciplinas em risco', 'Acompanhamento pedagógico']
        }
    }
}

/**
 * Classify student for Ensino Secundário I e II Ciclo (7ª-12ª classes)
 */
function classifyEnsinoSecundario(
    disciplinas: DisciplinaGrade[],
    classe?: string,
    mandatoryDisciplineIds?: string[]
): ClassificationResult {
    if (disciplinas.length === 0) {
        return {
            status: 'AguardandoNotas',
            motivos: ['Nenhuma nota disponível'],
            disciplinas_em_risco: [],
            acoes_recomendadas: ['Aguardar lançamento de notas']
        }
    }

    const classNumber = extractClassNumber(classe)
    const disciplinasAbaixo7: string[] = []
    const disciplinasEntre7e9: string[] = []
    const disciplinasAbaixo10: string[] = []

    disciplinas.forEach(disc => {
        const notaArredondada = roundGrade(disc.nota)

        if (notaArredondada < 7) {
            disciplinasAbaixo7.push(disc.nome)
        } else if (notaArredondada >= 7 && notaArredondada < 10) {
            disciplinasEntre7e9.push(disc.nome)
        } else if (notaArredondada < 10) {
            disciplinasAbaixo10.push(disc.nome)
        }
    })

    // Rule: Não Transita if ANY discipline < 7
    if (disciplinasAbaixo7.length > 0) {
        return {
            status: 'Não Transita',
            motivos: [`${disciplinasAbaixo7.length} disciplina(s) com nota < 7`],
            disciplinas_em_risco: disciplinasAbaixo7,
            acoes_recomendadas: ['Reforço urgente nas disciplinas em risco', 'Acompanhamento pedagógico intensivo']
        }
    }

    // 9ª Classe: Apply general rule (all >= 10)
    if (classNumber === 9) {
        if (disciplinasEntre7e9.length > 0 || disciplinasAbaixo10.length > 0) {
            return {
                status: 'Não Transita',
                motivos: ['9ª Classe requer todas as disciplinas >= 10'],
                disciplinas_em_risco: [...disciplinasEntre7e9, ...disciplinasAbaixo10],
                acoes_recomendadas: ['Reforço nas disciplinas abaixo de 10', 'Preparação para exames']
            }
        } else {
            return {
                status: 'Transita',
                motivos: ['Todas as disciplinas >= 10'],
                disciplinas_em_risco: [],
                acoes_recomendadas: []
            }
        }
    }

    // 7ª and 8ª Classes: Exception allows up to 2 disciplines between 7-9
    // BUT NOT if both are Português and Matemática
    if (classNumber === 7 || classNumber === 8) {
        if (disciplinasEntre7e9.length === 0) {
            // All disciplines >= 10
            return {
                status: 'Transita',
                motivos: ['Todas as disciplinas >= 10'],
                disciplinas_em_risco: [],
                acoes_recomendadas: []
            }
        } else if (disciplinasEntre7e9.length <= 2) {
            // Check if both are mandatory disciplines (Português and Matemática or configured)
            const mandatoryCount = disciplinasEntre7e9.filter(nome => {
                const disc = disciplinas.find(d => d.nome === nome)
                return disc ? isMandatoryDiscipline(disc.id, disc.nome, mandatoryDisciplineIds) : false
            }).length

            if (disciplinasEntre7e9.length === 2 && mandatoryCount === 2) {
                // Both disciplines are mandatory - NOT allowed
                return {
                    status: 'Não Transita',
                    motivos: ['Não permitido ter 2 disciplinas obrigatórias simultaneamente entre 7-9'],
                    disciplinas_em_risco: disciplinasEntre7e9,
                    acoes_recomendadas: ['Reforço urgente nas disciplinas obrigatórias']
                }
            } else {
                // Allowed: up to 2 disciplines between 7-9 (not both Port. and Mat.)
                return {
                    status: 'Transita',
                    motivos: [`Permitido até 2 disciplinas entre 7-9 (${disciplinasEntre7e9.length} encontrada(s))`],
                    disciplinas_em_risco: disciplinasEntre7e9,
                    acoes_recomendadas: disciplinasEntre7e9.length > 0
                        ? ['Reforço nas disciplinas entre 7-9 para melhorar desempenho']
                        : []
                }
            }
        } else {
            // More than 2 disciplines between 7-9
            return {
                status: 'Não Transita',
                motivos: [`Mais de 2 disciplinas entre 7-9 (${disciplinasEntre7e9.length} encontradas)`],
                disciplinas_em_risco: disciplinasEntre7e9,
                acoes_recomendadas: ['Reforço nas disciplinas entre 7-9']
            }
        }
    }

    // Default for other secondary classes (shouldn't reach here normally)
    // Apply general rule: all >= 10
    if (disciplinasEntre7e9.length > 0 || disciplinasAbaixo10.length > 0) {
        return {
            status: 'Não Transita',
            motivos: ['Regra geral: todas as disciplinas devem ter >= 10'],
            disciplinas_em_risco: [...disciplinasEntre7e9, ...disciplinasAbaixo10],
            acoes_recomendadas: ['Reforço nas disciplinas abaixo de 10']
        }
    } else {
        return {
            status: 'Transita',
            motivos: ['Todas as disciplinas >= 10'],
            disciplinas_em_risco: [],
            acoes_recomendadas: []
        }
    }
}

/**
 * Main classification function
 * 
 * @param disciplinas - Array of disciplines with grades from MF or MFD component
 * @param nivelEnsino - Education level (e.g., "Ensino Primário", "Ensino Secundário I Ciclo")
 * @param classe - Class level (e.g., "7ª Classe", "8ª Classe", "9ª Classe")
 * @returns Classification result with status, reasons, at-risk disciplines, and recommended actions
 */
export function classifyStudent(
    disciplinas: DisciplinaGrade[],
    nivelEnsino?: string,
    classe?: string,
    mandatoryDisciplineIds?: string[]
): ClassificationResult {
    // Determine if Primary or Secondary education
    const isPrimary = nivelEnsino?.toLowerCase().includes('primário') ||
        nivelEnsino?.toLowerCase().includes('primario')

    if (isPrimary) {
        return classifyEnsinoPrimario(disciplinas)
    } else {
        // Assume Secondary (Ensino Secundário I e II Ciclo)
        return classifyEnsinoSecundario(disciplinas, classe, mandatoryDisciplineIds)
    }
}
