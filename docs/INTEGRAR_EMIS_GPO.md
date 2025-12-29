# Guia de Integração - EMIS GPO

Instruções completas para integrar o **Gateway de Pagamentos Online (GPO)** da EMIS no EduGest Angola.

---

## 📋 Sobre o EMIS GPO

O EMIS GPO é o gateway de pagamentos oficial de Angola, operado pela EMIS (Empresa Interbancária de Serviços). Suporta:
- Multicaixa Express
- Cartões de débito/crédito VISA e Mastercard
- Transferências interbancárias

**Vantagens**: Gateway oficial, aceite por todos os bancos angolanos, máxima confiabilidade
**Desvantagens**: Processo de adesão mais demorado, requer certificação técnica

---

## 🔐 Passo 1: Obter Credenciais

### 1.1 Contactar Banco Parceiro
Escolher um dos bancos parceiros EMIS:
- BFA (Banco de Fomento Angola)
- BAI (Banco Angolano de Investimentos)
- BIC (Banco Internacional de Crédito)
- BPC (Banco de Poupança e Crédito)
- Outros bancos comerciais

### 1.2 Solicitar Adesão ao GPO
1. Dirigir-se ao gestor de conta empresarial
2. Solicitar adesão ao serviço **Gateway de Pagamentos Online**
3. Apresentar documentação:
   - Alvará comercial
   - NIF da empresa
   - Contrato social
   - Documento de identificação do(s) sócio(s)

### 1.3 Certificação Técnica
1. EMIS enviará documentação técnica da API
2. Implementar integração em ambiente de testes
3. Submeter para homologação
4. Após aprovação, receber credenciais de produção

### 1.4 Credenciais a Obter
Guardar estas informações de forma segura:

| Credencial | Descrição |
|------------|-----------|
| `Client ID` | Identificador da aplicação |
| `Client Secret` | Chave secreta para autenticação |
| `Merchant ID` | Identificador do comerciante |
| `Webhook Secret` | Chave para validar webhooks |

---

## ⚙️ Passo 2: Configurar Secrets no Supabase

```bash
# Login no Supabase
supabase login

# Linkar ao projecto
supabase link --project-ref afueujnyeglgnaylaxmp

# Configurar credenciais EMIS GPO
supabase secrets set EMIS_CLIENT_ID="seu_client_id"
supabase secrets set EMIS_CLIENT_SECRET="seu_client_secret"
supabase secrets set EMIS_MERCHANT_ID="seu_merchant_id"
supabase secrets set EMIS_GPO_WEBHOOK_SECRET="seu_webhook_secret"

# URLs da API (usar sandbox para testes, produção para live)
# Sandbox:
supabase secrets set EMIS_API_URL="https://sandbox.gpo.emis.co.ao/api/v1"
# Produção:
# supabase secrets set EMIS_API_URL="https://gpo.emis.co.ao/api/v1"

# URL do frontend para redirecionamento
supabase secrets set FRONTEND_URL="https://seudominio.vercel.app"

# Verificar configuração
supabase secrets list
```

---

## 💻 Passo 3: Implementar Código

### 3.1 Actualizar create-payment/index.ts

Abra o ficheiro `supabase/functions/create-payment/index.ts` e adicione:

```typescript
// ============================================
// EMIS GPO INTEGRATION
// Adicionar no topo do ficheiro, após os imports
// ============================================

import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts'

interface EMISTokenResponse {
    access_token: string
    token_type: string
    expires_in: number
}

interface EMISPaymentResponse {
    transaction_id: string
    checkout_url: string
    reference: string
    status: string
    expires_at: string
}

/**
 * Obter token de autenticação EMIS GPO
 */
async function getEMISToken(): Promise<string> {
    const clientId = Deno.env.get('EMIS_CLIENT_ID')
    const clientSecret = Deno.env.get('EMIS_CLIENT_SECRET')
    const apiUrl = Deno.env.get('EMIS_API_URL') || 'https://gpo.emis.co.ao/api/v1'

    if (!clientId || !clientSecret) {
        throw new Error('Credenciais EMIS não configuradas')
    }

    const credentials = base64Encode(`${clientId}:${clientSecret}`)

    const response = await fetch(`${apiUrl}/oauth/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`
        },
        body: 'grant_type=client_credentials'
    })

    if (!response.ok) {
        const error = await response.text()
        console.error('❌ Erro autenticação EMIS:', error)
        throw new Error('Falha na autenticação EMIS GPO')
    }

    const data: EMISTokenResponse = await response.json()
    return data.access_token
}

/**
 * Criar pagamento no EMIS GPO
 */
async function initializePaymentEMIS(
    escola_id: string,
    valor: number,
    descricao: string
): Promise<PaymentProviderResponse> {
    const merchantId = Deno.env.get('EMIS_MERCHANT_ID')
    const apiUrl = Deno.env.get('EMIS_API_URL') || 'https://gpo.emis.co.ao/api/v1'
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://edugest.vercel.app'
    const supabaseUrl = Deno.env.get('SUPABASE_URL')

    if (!merchantId) {
        throw new Error('EMIS_MERCHANT_ID não configurado')
    }

    // Obter token de acesso
    const accessToken = await getEMISToken()

    // Gerar referência única
    const reference = `EDU-${escola_id.slice(0, 8)}-${Date.now()}`

    // Criar pagamento
    const paymentPayload = {
        merchant_id: merchantId,
        amount: valor,
        currency: 'AOA',
        reference: reference,
        description: descricao,
        callback_url: `${supabaseUrl}/functions/v1/payment-webhook`,
        return_url: `${frontendUrl}/dashboard?payment=success&ref=${reference}`,
        cancel_url: `${frontendUrl}/dashboard?payment=cancelled&ref=${reference}`,
        expiry_minutes: 1440, // 24 horas
        metadata: {
            escola_id: escola_id,
            system: 'edugest_angola'
        }
    }

    console.log('📤 Criando pagamento EMIS:', { reference, valor })

    const response = await fetch(`${apiUrl}/payments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-Request-Id': reference // ID único para idempotência
        },
        body: JSON.stringify(paymentPayload)
    })

    if (!response.ok) {
        const error = await response.text()
        console.error('❌ Erro criar pagamento EMIS:', error)
        throw new Error(`Falha ao criar pagamento EMIS: ${response.status}`)
    }

    const payment: EMISPaymentResponse = await response.json()

    console.log('✅ Pagamento EMIS criado:', payment.transaction_id)

    return {
        reference: reference,
        payment_url: payment.checkout_url,
        provider_transaction_id: payment.transaction_id,
        expires_at: payment.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
}
```

### 3.2 Actualizar a função initializePayment

Substituir a função `initializePayment` existente:

```typescript
async function initializePayment(
    provider: string,
    escola_id: string,
    valor: number,
    descricao: string
): Promise<PaymentProviderResponse> {
    switch (provider) {
        case 'emis_gpo':
            return await initializePaymentEMIS(escola_id, valor, descricao)
        
        // ... outros providers
        
        default:
            return {
                reference: `MANUAL-${Date.now()}`,
                provider_transaction_id: `MANUAL-${Date.now()}`
            }
    }
}
```

---

### 3.3 Actualizar payment-webhook/index.ts

Adicionar validação de assinatura EMIS:

```typescript
// ============================================
// EMIS GPO WEBHOOK VALIDATION
// Adicionar no topo, após imports
// ============================================

import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { encode as hexEncode } from 'https://deno.land/std@0.168.0/encoding/hex.ts'

/**
 * Validar assinatura de webhook EMIS GPO
 * EMIS usa HMAC-SHA256 para assinar webhooks
 */
async function verifyEMISSignature(
    signature: string,
    body: string
): Promise<boolean> {
    const secret = Deno.env.get('EMIS_GPO_WEBHOOK_SECRET')

    if (!secret) {
        console.error('❌ EMIS_GPO_WEBHOOK_SECRET não configurado')
        return false
    }

    try {
        const encoder = new TextEncoder()
        const keyData = encoder.encode(secret)
        const messageData = encoder.encode(body)

        // Importar chave para HMAC
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        )

        // Calcular HMAC
        const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData)

        // Converter para hex
        const expectedSignature = new TextDecoder().decode(
            hexEncode(new Uint8Array(signatureBuffer))
        )

        // Comparar assinaturas
        const isValid = signature.toLowerCase() === expectedSignature.toLowerCase()

        if (!isValid) {
            console.error('❌ Assinatura EMIS inválida')
            console.error('   Recebida:', signature)
            console.error('   Esperada:', expectedSignature)
        }

        return isValid
    } catch (error) {
        console.error('❌ Erro ao verificar assinatura EMIS:', error)
        return false
    }
}

// Actualizar a função verifyWebhookSignature
async function verifyWebhookSignature(
    provider: string,
    signature: string | null,
    body: string
): Promise<boolean> {
    if (Deno.env.get('SKIP_WEBHOOK_VERIFICATION') === 'true') {
        console.log('⚠️ Verificação de webhook ignorada (modo desenvolvimento)')
        return true
    }

    if (!signature) {
        console.error('❌ Assinatura em falta para provider:', provider)
        return false
    }

    switch (provider) {
        case 'emis_gpo':
            return await verifyEMISSignature(signature, body)
        // ... outros providers
        default:
            return true
    }
}
```

---

## 🌐 Passo 4: Registar Webhook na EMIS

### 4.1 Aceder ao Painel EMIS
1. Login no portal de comerciantes EMIS
2. Navegar para **Configurações** → **Webhooks**

### 4.2 Configurar Webhook
| Campo | Valor |
|-------|-------|
| URL | `https://afueujnyeglgnaylaxmp.supabase.co/functions/v1/payment-webhook` |
| Método | POST |
| Header Adicional | `x-provider: emis_gpo` |
| Eventos | `payment.approved`, `payment.failed`, `payment.cancelled`, `payment.expired` |

### 4.3 Testar Webhook
Usar a funcionalidade de teste no painel EMIS para enviar um webhook de teste.

---

## 🧪 Passo 5: Testar em Sandbox

### 5.1 Activar modo de teste
```bash
supabase secrets set SKIP_WEBHOOK_VERIFICATION="true"
supabase secrets set EMIS_API_URL="https://sandbox.gpo.emis.co.ao/api/v1"
```

### 5.2 Criar pagamento de teste
```bash
curl -X POST "https://afueujnyeglgnaylaxmp.supabase.co/functions/v1/create-payment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -d '{
    "escola_id": "UUID_DA_ESCOLA",
    "plano": "trimestral",
    "provider": "emis_gpo"
  }'
```

### 5.3 Cartões de Teste EMIS
| Cartão | Número | Resultado |
|--------|--------|-----------|
| VISA Sucesso | 4111 1111 1111 1111 | Pagamento aprovado |
| VISA Falha | 4000 0000 0000 0002 | Pagamento recusado |
| Mastercard | 5500 0000 0000 0004 | Pagamento aprovado |

**CVV**: 123  
**Validade**: Qualquer data futura

### 5.4 Simular webhook de sucesso
```bash
curl -X POST "https://afueujnyeglgnaylaxmp.supabase.co/functions/v1/payment-webhook" \
  -H "Content-Type: application/json" \
  -H "x-provider: emis_gpo" \
  -H "x-signature: ASSINATURA_DE_TESTE" \
  -d '{
    "transaction_id": "GPO-123456789",
    "reference": "EDU-abc12345-1703123456789",
    "status": "PAID",
    "amount": 15000,
    "currency": "AOA"
  }'
```

---

## 🚀 Passo 6: Deploy para Produção

### 6.1 Remover modo de teste
```bash
supabase secrets unset SKIP_WEBHOOK_VERIFICATION
supabase secrets set EMIS_API_URL="https://gpo.emis.co.ao/api/v1"
```

### 6.2 Deploy das funções
```bash
supabase functions deploy create-payment
supabase functions deploy payment-webhook
```

### 6.3 Verificar logs
```bash
supabase functions log create-payment --tail
supabase functions log payment-webhook --tail
```

---

## 📊 Códigos de Status EMIS

| Código EMIS | Status Interno | Descrição |
|-------------|----------------|-----------|
| `PAID` | `sucesso` | Pagamento confirmado |
| `APPROVED` | `sucesso` | Pagamento aprovado |
| `PENDING` | `processando` | Aguardando confirmação |
| `FAILED` | `falha` | Pagamento falhou |
| `CANCELLED` | `cancelado` | Cancelado pelo utilizador |
| `EXPIRED` | `cancelado` | Expirou sem pagamento |

---

## ❓ Troubleshooting

### Erro: "Falha na autenticação EMIS GPO"
- Verificar `EMIS_CLIENT_ID` e `EMIS_CLIENT_SECRET`
- Confirmar que credenciais são do ambiente correcto (sandbox/produção)

### Erro: "Assinatura EMIS inválida"
- Verificar `EMIS_GPO_WEBHOOK_SECRET`
- Confirmar que o webhook está configurado correctamente no painel EMIS

### Webhook não recebido
- Verificar URL do webhook no painel EMIS
- Confirmar que eventos correctos estão configurados
- Ver logs: `supabase functions log payment-webhook`

---

## 📞 Suporte EMIS

| Tipo | Contacto |
|------|----------|
| Suporte Técnico | Via banco parceiro |
| Documentação | Fornecida após adesão |
| Homologação | Equipa técnica EMIS |

---

*Documento criado: 28 de Dezembro de 2025*
