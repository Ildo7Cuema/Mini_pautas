/**
 * School Code Generator Utility
 * Generates unique school codes with format: {PROVINCE_CODE}{YEAR}{RANDOM}
 * Example: LUA2025A3B7
 */

import { supabase } from '../lib/supabaseClient'

// Mapping of Angolan provinces to 3-letter codes
const PROVINCE_CODES: Record<string, string> = {
    'Bengo': 'BGO',
    'Benguela': 'BGU',
    'Bié': 'BIE',
    'Cabinda': 'CAB',
    'Cuando Cubango': 'CCU',
    'Cuanza Norte': 'CNO',
    'Cuanza Sul': 'CSU',
    'Cunene': 'CNN',
    'Huambo': 'HUA',
    'Huíla': 'HUI',
    'Luanda': 'LUA',
    'Lunda Norte': 'LNO',
    'Lunda Sul': 'LSU',
    'Malanje': 'MAL',
    'Moxico': 'MOX',
    'Namibe': 'NAM',
    'Uíge': 'UIG',
    'Zaire': 'ZAI'
}

/**
 * Generates a random alphanumeric string (uppercase)
 * @param length - Length of the random string
 * @returns Random alphanumeric string
 */
function generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

/**
 * Generates a school code based on province
 * Format: {PROVINCE_CODE}{YEAR}{RANDOM}
 * @param provincia - Name of the province
 * @returns Generated school code
 */
export function generateSchoolCode(provincia: string): string {
    const provinceCode = PROVINCE_CODES[provincia] || 'XXX'
    const year = new Date().getFullYear().toString()
    const randomSuffix = generateRandomString(4)

    return `${provinceCode}${year}${randomSuffix}`
}

/**
 * Checks if a school code already exists in the database
 * @param codigo - School code to check
 * @returns Promise<boolean> - true if code is available, false if already exists
 */
export async function checkCodeUniqueness(codigo: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('escolas')
            .select('codigo_escola')
            .eq('codigo_escola', codigo)
            .maybeSingle()

        if (error) {
            console.error('Error checking code uniqueness:', error)
            // If there's an error, we'll assume it's not unique to be safe
            return false
        }

        // Code is available if no record was found
        return data === null
    } catch (err) {
        console.error('Exception checking code uniqueness:', err)
        return false
    }
}

/**
 * Generates a guaranteed unique school code
 * Retries up to maxRetries times if collision occurs
 * @param provincia - Name of the province
 * @param maxRetries - Maximum number of retry attempts (default: 5)
 * @returns Promise<string> - Unique school code
 * @throws Error if unable to generate unique code after retries
 */
export async function generateUniqueSchoolCode(
    provincia: string,
    maxRetries: number = 5
): Promise<string> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const code = generateSchoolCode(provincia)
        const isUnique = await checkCodeUniqueness(code)

        if (isUnique) {
            return code
        }

        // If not unique, wait a bit before retrying (to avoid rapid-fire requests)
        if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
        }
    }

    throw new Error('Não foi possível gerar um código único após várias tentativas. Por favor, tente novamente.')
}

/**
 * Validates a school code format
 * @param codigo - School code to validate
 * @returns boolean - true if format is valid
 */
export function validateSchoolCodeFormat(codigo: string): boolean {
    // Format: 3 letters + 4 digits + 4 alphanumeric = 11 characters
    const pattern = /^[A-Z]{3}\d{4}[A-Z0-9]{4}$/
    return pattern.test(codigo)
}
