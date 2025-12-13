/**
 * Traduz mensagens de erro do Supabase para português
 */
export const translateError = (error: string): string => {
    const translations: Record<string, string> = {
        // Auth errors
        'Invalid login credentials': 'Email ou senha incorretos',
        'Email not confirmed': 'Email não confirmado. Verifique sua caixa de entrada',
        'User already registered': 'Este email já está cadastrado',
        'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres',
        'Unable to validate email address: invalid format': 'Formato de email inválido',
        'Email rate limit exceeded': 'Muitas tentativas. Tente novamente mais tarde',
        'Invalid email or password': 'Email ou senha incorretos',
        'Email link is invalid or has expired': 'Link de email inválido ou expirado',
        'Token has expired or is invalid': 'Sessão expirada. Faça login novamente',
        'User not found': 'Usuário não encontrado',
        'New password should be different from the old password': 'A nova senha deve ser diferente da anterior',
        'Password is too weak': 'Senha muito fraca. Use letras, números e símbolos',
        'Signup requires a valid password': 'É necessária uma senha válida',
        'User already exists': 'Usuário já existe',
        'Email address is invalid': 'Endereço de email inválido',
        'Only an email address or phone number should be provided': 'Forneça apenas email ou telefone',

        // Network errors
        'Failed to fetch': 'Erro de conexão. Verifique sua internet',
        'Network request failed': 'Falha na conexão. Tente novamente',
        'timeout': 'Tempo esgotado. Tente novamente',

        // Database errors
        'duplicate key value': 'Este registro já existe',
        'violates foreign key constraint': 'Erro de referência no banco de dados',
        'violates not-null constraint': 'Campo obrigatório não preenchido',

        // Generic errors
        'An error occurred': 'Ocorreu um erro',
        'Something went wrong': 'Algo deu errado',
        'Internal server error': 'Erro interno do servidor',
        'Service unavailable': 'Serviço temporariamente indisponível',
    }

    // Check for PostgreSQL error codes
    if (error.includes('23505') || error.includes('duplicate key')) {
        if (error.includes('alunos_numero_processo_key') || error.includes('numero_processo')) {
            return 'Este número de processo já está em uso. Por favor, use um número diferente ou deixe o campo vazio para gerar automaticamente.'
        }
        return 'Este valor já existe no sistema. Por favor, use um valor único.'
    }

    // Procura por correspondência exata
    if (translations[error]) {
        return translations[error]
    }

    // Procura por correspondência parcial
    for (const [key, value] of Object.entries(translations)) {
        if (error.toLowerCase().includes(key.toLowerCase())) {
            return value
        }
    }

    // Se não encontrar tradução, retorna a mensagem original
    return error
}

/**
 * Traduz mensagens de sucesso
 */
export const translateSuccess = (message: string): string => {
    const translations: Record<string, string> = {
        'Check your email for the confirmation link': 'Verifique seu email para confirmar sua conta',
        'Password updated successfully': 'Senha atualizada com sucesso',
        'Email updated successfully': 'Email atualizado com sucesso',
        'User updated successfully': 'Usuário atualizado com sucesso',
    }

    return translations[message] || message
}
