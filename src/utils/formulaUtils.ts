/**
 * Formula Utilities
 * Handles validation, parsing, and evaluation of component formulas
 */

export interface FormulaValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validates a formula expression
 * @param expression - The formula expression (e.g., "MAC * 0.4 + EXAME * 0.6")
 * @param componentCodes - Array of valid component codes that can be used in the formula
 * @returns Validation result with error message if invalid
 */
export function validateFormula(
    expression: string,
    componentCodes: string[]
): FormulaValidationResult {
    if (!expression || expression.trim() === '') {
        return { valid: false, error: 'Fórmula não pode estar vazia' };
    }

    // Remove whitespace for easier parsing
    const cleanExpression = expression.replace(/\s+/g, '');

    // Check for valid characters (alphanumeric, operators, parentheses, decimal point)
    const validCharsRegex = /^[A-Za-z0-9+\-*/().]+$/;
    if (!validCharsRegex.test(cleanExpression)) {
        return { valid: false, error: 'Fórmula contém caracteres inválidos' };
    }

    // Check for balanced parentheses
    let parenthesesCount = 0;
    for (const char of cleanExpression) {
        if (char === '(') parenthesesCount++;
        if (char === ')') parenthesesCount--;
        if (parenthesesCount < 0) {
            return { valid: false, error: 'Parênteses desbalanceados' };
        }
    }
    if (parenthesesCount !== 0) {
        return { valid: false, error: 'Parênteses desbalanceados' };
    }

    // Extract component codes from formula
    const usedCodes = parseFormula(expression);

    // Check if all used codes are valid
    for (const code of usedCodes) {
        if (!componentCodes.includes(code)) {
            return {
                valid: false,
                error: `Componente "${code}" não existe ou não está disponível`,
            };
        }
    }

    // Check for consecutive operators
    if (/[+\-*/]{2,}/.test(cleanExpression.replace(/[+\-]\d/g, ''))) {
        return { valid: false, error: 'Operadores consecutivos detectados' };
    }

    return { valid: true };
}

/**
 * Extracts component codes from a formula expression
 * @param expression - The formula expression
 * @returns Array of unique component codes found in the formula
 */
export function parseFormula(expression: string): string[] {
    // Match sequences of uppercase letters and numbers (component codes)
    const codeRegex = /[A-Z][A-Z0-9_]*/g;
    const matches = expression.match(codeRegex) || [];

    // Filter out numbers that might be matched (e.g., "0.4" -> "E" from scientific notation)
    const codes = matches.filter(match => {
        // Must start with a letter and contain at least one letter
        return /^[A-Z]/.test(match) && /[A-Z]/.test(match);
    });

    // Return unique codes
    return [...new Set(codes)];
}

/**
 * Evaluates a formula with given component values
 * @param expression - The formula expression
 * @param values - Object mapping component codes to their numeric values
 * @returns The calculated result
 * @throws Error if evaluation fails
 */
export function evaluateFormula(
    expression: string,
    values: Record<string, number>
): number {
    try {
        // Replace component codes with their values
        let evaluableExpression = expression;

        // Sort codes by length (descending) to avoid partial replacements
        const codes = Object.keys(values).sort((a, b) => b.length - a.length);

        for (const code of codes) {
            const value = values[code];
            // Allow 0 as a valid value, only reject undefined, null, or NaN
            if (value === undefined || value === null || isNaN(value)) {
                throw new Error(`Valor inválido para componente ${code}`);
            }
            // Use word boundary to ensure we replace whole codes only
            const regex = new RegExp(`\\b${code}\\b`, 'g');
            evaluableExpression = evaluableExpression.replace(regex, value.toString());
        }

        // Evaluate the expression safely
        // Note: In production, consider using a safer expression evaluator library
        // eslint-disable-next-line no-eval
        const result = eval(evaluableExpression);

        if (typeof result !== 'number' || isNaN(result)) {
            throw new Error('Resultado da fórmula não é um número válido');
        }

        return result;
    } catch (error) {
        throw new Error(
            `Erro ao avaliar fórmula: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        );
    }
}

/**
 * Formats a formula for user-friendly display
 * @param expression - The formula expression
 * @returns Formatted formula with proper spacing
 */
export function formatFormulaForDisplay(expression: string): string {
    return expression
        .replace(/\*/g, ' × ')
        .replace(/\//g, ' ÷ ')
        .replace(/\+/g, ' + ')
        .replace(/\-/g, ' - ')
        .replace(/\(/g, '( ')
        .replace(/\)/g, ' )')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Generates example formulas for user guidance
 * @param componentCodes - Available component codes
 * @returns Array of example formulas
 */
export function getFormulaExamples(componentCodes: string[]): string[] {
    const examples: string[] = [];

    if (componentCodes.length >= 2) {
        const [code1, code2] = componentCodes;
        examples.push(
            `${code1} * 0.4 + ${code2} * 0.6`,
            `(${code1} + ${code2}) / 2`,
            `${code1} * 0.3 + ${code2} * 0.7`
        );
    } else if (componentCodes.length === 1) {
        const code = componentCodes[0];
        examples.push(`${code} * 1.0`, `${code} / 2`);
    }

    return examples;
}
