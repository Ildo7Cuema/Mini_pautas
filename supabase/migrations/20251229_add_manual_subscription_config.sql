-- ============================================
-- MIGRATION: Configurações para Assinatura Manual via WhatsApp
-- Purpose: Add SuperAdmin contact and bank details for manual subscription workflow
-- Date: 2025-12-29
-- ============================================

-- Configurações de contato do SuperAdmin para receber comprovativos
INSERT INTO configuracoes_sistema (chave, valor, descricao) VALUES
('superadmin_whatsapp', '{
  "numero": "+244923000000",
  "nome": "Suporte EduGest",
  "mensagem_padrao": "Olá! Gostaria de enviar o comprovativo de pagamento para activação da licença da escola:"
}'::jsonb, 'Contato WhatsApp do SuperAdmin para receber comprovativos de pagamento')
ON CONFLICT (chave) DO UPDATE SET 
    valor = EXCLUDED.valor,
    descricao = EXCLUDED.descricao,
    updated_at = NOW();

-- Dados bancários para transferências
INSERT INTO configuracoes_sistema (chave, valor, descricao) VALUES
('dados_bancarios', '{
  "banco": "A definir",
  "conta": "A definir",
  "iban": "A definir",
  "titular": "EduGest Angola",
  "instrucoes": "Após efectuar a transferência, envie o comprovativo pelo WhatsApp com o código da sua escola."
}'::jsonb, 'Dados bancários para transferências e pagamentos manuais')
ON CONFLICT (chave) DO UPDATE SET 
    valor = EXCLUDED.valor,
    descricao = EXCLUDED.descricao,
    updated_at = NOW();

-- Configuração do modo de pagamento (permite alternar entre manual e online futuramente)
INSERT INTO configuracoes_sistema (chave, valor, descricao) VALUES
('modo_pagamento', '{
  "modo_atual": "manual",
  "pagamento_online_habilitado": false,
  "providers_configurados": [],
  "mensagem_modo_manual": "Pagamento por transferência bancária. Envie o comprovativo pelo WhatsApp."
}'::jsonb, 'Configuração do modo de pagamento do sistema (manual ou online)')
ON CONFLICT (chave) DO UPDATE SET 
    valor = EXCLUDED.valor,
    descricao = EXCLUDED.descricao,
    updated_at = NOW();

-- Função helper para buscar configuração de contato
CREATE OR REPLACE FUNCTION get_superadmin_contact()
RETURNS jsonb AS $$
BEGIN
    RETURN (
        SELECT valor FROM configuracoes_sistema 
        WHERE chave = 'superadmin_whatsapp'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função helper para buscar dados bancários
CREATE OR REPLACE FUNCTION get_dados_bancarios()
RETURNS jsonb AS $$
BEGIN
    RETURN (
        SELECT valor FROM configuracoes_sistema 
        WHERE chave = 'dados_bancarios'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função helper para verificar modo de pagamento
CREATE OR REPLACE FUNCTION is_pagamento_online_habilitado()
RETURNS boolean AS $$
DECLARE
    config jsonb;
BEGIN
    SELECT valor INTO config FROM configuracoes_sistema 
    WHERE chave = 'modo_pagamento';
    
    RETURN COALESCE((config->>'pagamento_online_habilitado')::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Política RLS para permitir leitura pública das configurações de contato
DROP POLICY IF EXISTS "Public can view contact config" ON configuracoes_sistema;
CREATE POLICY "Public can view contact config"
    ON configuracoes_sistema FOR SELECT
    USING (chave IN ('superadmin_whatsapp', 'dados_bancarios', 'modo_pagamento'));

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION get_superadmin_contact IS 'Retorna o contato WhatsApp do SuperAdmin para envio de comprovativos';
COMMENT ON FUNCTION get_dados_bancarios IS 'Retorna os dados bancários para transferências';
COMMENT ON FUNCTION is_pagamento_online_habilitado IS 'Verifica se o pagamento online está habilitado no sistema';

-- ============================================
-- END OF MIGRATION
-- ============================================
