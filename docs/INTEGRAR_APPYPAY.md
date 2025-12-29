# Guia de Integração - AppyPay

Instruções completas para integrar o **AppyPay** no EduGest Angola.

---

## 📋 Sobre o AppyPay

AppyPay é uma fintech angolana que oferece soluções de pagamento simplificadas com checkout integrado e suporte técnico local.

**Vantagens**: Registo rápido, suporte local em português, checkout pronto, KYC simplificado
**Desvantagens**: Rede de aceitação menor que EMIS directo

**Website**: https://appypay.ao  
**Developers**: https://developers.appypay.ao

---

## 🔐 Passo 1: Obter Credenciais

### 1.1 Criar Conta AppyPay
1. Aceder a https://appypay.ao/signup
2. Preencher formulário de registo empresarial:
   - Dados da empresa (NIF, nome, endereço)
   - Dados do representante legal
   - Email e telefone de contacto

### 1.2 Verificação KYC
1. Upload de documentos:
   - Alvará comercial
   - Documento do representante
2. Verificação facial (selfie com documento)
3. Validação bancária

**Tempo estimado**: 3-5 dias úteis

### 1.3 Obter Credenciais de API
1. Após aprovação, aceder ao Dashboard
2. Navegar para **Developers** → **API Settings**
3. Gerar novas credenciais:

| Credencial | Descrição |
|------------|-----------|
| `API Key` | Chave de autenticação |
| `Merchant ID` | ID do comerciante |
| `Webhook Secret` | Secret para validar callbacks |

### 1.4 Ambientes
| Ambiente | URL Base |
|----------|----------|
| Sandbox | https://sandbox.api.appypay.ao/v1 |
| Produção | https://api.appypay.ao/v1 |

---

## ⚙️ Passo 2: Configurar Secrets no Supabase

```bash
# Login no Supabase
supabase login
supabase link --project-ref afueujnyeglgnaylaxmp

# Configurar credenciais AppyPay
supabase secrets set APPYPAY_API_KEY="sua_api_key"
supabase secrets set APPYPAY_MERCHANT_ID="seu_merchant_id"
supabase secrets set APPYPAY_WEBHOOK_SECRET="seu_webhook_secret"

# URL da API
# Sandbox:
supabase secrets set APPYPAY_API_URL="https://sandbox.api.appypay.ao/v1"
# Produção:
# supabase secrets set APPYPAY_API_URL="https://api.appypay.ao/v1"

# Frontend URL
supabase secrets set FRONTEND_URL="https://seudominio.vercel.app"

# Verificar
supabase secrets list
```

---

## 💻 Passo 3: Implementar Código

### 3.1 Actualizar create-payment/index.ts

Adicionar integração AppyPay:

```typescript
// ============================================
// APPYPAY INTEGRATION
// Adicionar após imports existentes
// ============================================

interface AppyPaymentResponse {
    payment_id: string
    payment_url: string
    reference: string
    status: string
    expires_at: string
    amount: number
    currency: string
}

/**
 * Criar pagamento no AppyPay
 */
async function initializePaymentAppyPay(
    escola_id: string,
    valor: number,
    descricao: string
): Promise<PaymentProviderResponse> {
    const apiKey = Deno.env.get('APPYPAY_API_KEY')
    const merchantId = Deno.env.get('APPYPAY_MERCHANT_ID')
    const apiUrl = Deno.env.get('APPYPAY_API_URL') || 'https://api.appypay.ao/v1'
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://edugest.vercel.app'
    const supabaseUrl = Deno.env.get('SUPABASE_URL')

    if (!apiKey || !merchantId) {
        throw new Error('Credenciais AppyPay não configuradas')
    }

    const reference = `EDU-${escola_id.slice(0, 8)}-${Date.now()}`

    const payload = {
        amount: valor,
        currency: 'AOA',
        reference: reference,
        description: descricao,
        merchant_id: merchantId,
        // URLs de callback
        webhook_url: `${supabaseUrl}/functions/v1/payment-webhook`,
        success_url: `${frontendUrl}/dashboard?payment=success&ref=${reference}`,
        failure_url: `${frontendUrl}/dashboard?payment=failed&ref=${reference}`,
        cancel_url: `${frontendUrl}/dashboard?payment=cancelled&ref=${reference}`,
        // Metadados
        metadata: {
            escola_id: escola_id,
            system: 'edugest_angola'
        },
        // Configurações adicionais
        expires_in_minutes: 1440, // 24 horas
        customer: {
            // Opcional - preencher se disponível
            // email: 'cliente@exemplo.com',
            // phone: '+244923000000'
        }
    }

    console.log('📤 Criando pagamento AppyPay:', { reference, valor })

    const response = await fetch(`${apiUrl}/payments/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
            'X-Merchant-Id': merchantId,
            'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        const error = await response.text()
        console.error('❌ Erro AppyPay:', response.status, error)
        throw new Error(`Falha ao criar pagamento AppyPay: ${response.status}`)
    }

    const data: AppyPaymentResponse = await response.json()

    console.log('✅ Pagamento AppyPay criado:', data.payment_id)

    return {
        reference: reference,
        payment_url: data.payment_url, // URL de checkout hosted
        provider_transaction_id: data.payment_id,
        expires_at: data.expires_at
    }
}

/**
 * Consultar estado de pagamento AppyPay
 */
async function checkAppyPayStatus(paymentId: string): Promise<string> {
    const apiKey = Deno.env.get('APPYPAY_API_KEY')
    const merchantId = Deno.env.get('APPYPAY_MERCHANT_ID')
    const apiUrl = Deno.env.get('APPYPAY_API_URL') || 'https://api.appypay.ao/v1'

    const response = await fetch(`${apiUrl}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
            'X-Api-Key': apiKey!,
            'X-Merchant-Id': merchantId!,
            'Accept': 'application/json'
        }
    })

    if (!response.ok) {
        return 'unknown'
    }

    const data = await response.json()
    return data.status
}
```

### 3.2 Actualizar initializePayment

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
        
        case 'proxypay':
            return await initializePaymentProxyPay(escola_id, valor, descricao)
        
        case 'appypay':
            return await initializePaymentAppyPay(escola_id, valor, descricao)
        
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

Adicionar validação AppyPay:

```typescript
// ============================================
// APPYPAY WEBHOOK VALIDATION
// ============================================

import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { encode as hexEncode } from 'https://deno.land/std@0.168.0/encoding/hex.ts'

/**
 * Validar assinatura de webhook AppyPay
 * AppyPay usa HMAC-SHA256 no header X-AppyPay-Signature
 */
async function verifyAppyPaySignature(
    signature: string,
    body: string
): Promise<boolean> {
    const secret = Deno.env.get('APPYPAY_WEBHOOK_SECRET')

    if (!secret) {
        console.error('❌ APPYPAY_WEBHOOK_SECRET não configurado')
        return false
    }

    try {
        const encoder = new TextEncoder()
        const keyData = encoder.encode(secret)
        const messageData = encoder.encode(body)

        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        )

        const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData)

        const expectedSignature = new TextDecoder().decode(
            hexEncode(new Uint8Array(signatureBuffer))
        )

        const isValid = signature.toLowerCase() === expectedSignature.toLowerCase()

        if (!isValid) {
            console.error('❌ Assinatura AppyPay inválida')
        }

        return isValid
    } catch (error) {
        console.error('❌ Erro verificar assinatura AppyPay:', error)
        return false
    }
}

// Actualizar verifyWebhookSignature
async function verifyWebhookSignature(
    provider: string,
    signature: string | null,
    body: string
): Promise<boolean> {
    if (Deno.env.get('SKIP_WEBHOOK_VERIFICATION') === 'true') {
        console.log('⚠️ Verificação ignorada (desenvolvimento)')
        return true
    }

    if (!signature) {
        console.error('❌ Assinatura em falta')
        return false
    }

    switch (provider) {
        case 'appypay':
            return await verifyAppyPaySignature(signature, body)
        // ... outros
        default:
            return true
    }
}
```

### 3.4 Mapeamento de Status AppyPay

```typescript
const statusMaps: Record<string, Record<string, string>> = {
    appypay: {
        'pending': 'processando',
        'processing': 'processando',
        'completed': 'sucesso',
        'paid': 'sucesso',
        'failed': 'falha',
        'cancelled': 'cancelado',
        'expired': 'cancelado',
        'refunded': 'reembolsado'
    },
    // ... outros
}
```

---

## 🌐 Passo 4: Configurar Webhook no AppyPay

### 4.1 Aceder ao Dashboard
1. Login em https://dashboard.appypay.ao
2. Navegar para **Developers** → **Webhooks**

### 4.2 Configurar Endpoint
| Campo | Valor |
|-------|-------|
| URL | `https://afueujnyeglgnaylaxmp.supabase.co/functions/v1/payment-webhook` |
| Eventos | `payment.completed`, `payment.failed`, `payment.cancelled`, `payment.refunded` |
| Headers | `x-provider: appypay` |

### 4.3 Testar Conexão
Utilizar botão "Test Webhook" no dashboard para enviar evento de teste.

---

## 🧪 Passo 5: Testar em Sandbox

### 5.1 Configurar ambiente
```bash
supabase secrets set SKIP_WEBHOOK_VERIFICATION="true"
supabase secrets set APPYPAY_API_URL="https://sandbox.api.appypay.ao/v1"
```

### 5.2 Criar pagamento de teste
```bash
curl -X POST "https://afueujnyeglgnaylaxmp.supabase.co/functions/v1/create-payment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "escola_id": "UUID_DA_ESCOLA",
    "plano": "trimestral",
    "provider": "appypay"
  }'
```

Resposta:
```json
{
  "success": true,
  "transaction_id": "uuid",
  "payment_url": "https://checkout.appypay.ao/pay/abc123",
  "reference": "EDU-abc12345-1703123456789",
  "expires_at": "2025-12-29T15:00:00Z"
}
```

### 5.3 Aceder à página de checkout
Abrir `payment_url` no browser para testar o checkout.

### 5.4 Cartões de Teste AppyPay
| Tipo | Número | Resultado |
|------|--------|-----------|
| Sucesso | 4242 4242 4242 4242 | Aprovado |
| Falha | 4000 0000 0000 0002 | Recusado |
| 3D Secure | 4000 0000 0000 3220 | Requer autenticação |

**CVV**: 123  
**Validade**: Qualquer data futura

### 5.5 Simular webhook
```bash
curl -X POST "https://afueujnyeglgnaylaxmp.supabase.co/functions/v1/payment-webhook" \
  -H "Content-Type: application/json" \
  -H "x-provider: appypay" \
  -d '{
    "event": "payment.completed",
    "payment_id": "uuid-do-pagamento",
    "reference": "EDU-abc12345-1703123456789",
    "status": "completed",
    "amount": 15000,
    "currency": "AOA",
    "completed_at": "2025-12-28T16:00:00Z"
  }'
```

---

## 🚀 Passo 6: Produção

### 6.1 Configurar produção
```bash
supabase secrets unset SKIP_WEBHOOK_VERIFICATION
supabase secrets set APPYPAY_API_URL="https://api.appypay.ao/v1"
```

### 6.2 Deploy
```bash
supabase functions deploy create-payment
supabase functions deploy payment-webhook
```

### 6.3 Monitorizar
```bash
supabase functions log create-payment --tail
supabase functions log payment-webhook --tail
```

---

## 📱 Fluxo de Pagamento

AppyPay oferece checkout hosted (página de pagamento pronta):

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Escola     │───>│  EduGest     │───>│   AppyPay    │
│ Seleciona    │    │ Cria         │    │ Checkout     │
│ Plano        │    │ Pagamento    │    │ Page         │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
                                               ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Licença    │<───│   Webhook    │<───│  Utilizador  │
│   Activada   │    │  Recebido    │    │  Paga        │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 📊 Estados AppyPay

| Estado AppyPay | Estado Interno | Descrição |
|----------------|----------------|-----------|
| `pending` | `processando` | Aguardando pagamento |
| `processing` | `processando` | Processando pagamento |
| `completed` | `sucesso` | Pagamento concluído |
| `paid` | `sucesso` | Pagamento confirmado |
| `failed` | `falha` | Pagamento falhou |
| `cancelled` | `cancelado` | Utilizador cancelou |
| `expired` | `cancelado` | Checkout expirou |
| `refunded` | `reembolsado` | Reembolso processado |

---

## ❓ Troubleshooting

### Erro 401 - Unauthorized
- Verificar `APPYPAY_API_KEY` e `APPYPAY_MERCHANT_ID`
- Confirmar ambiente correcto (sandbox vs produção)

### Checkout não carrega
- Verificar se `payment_url` é válido
- Confirmar que domínio está autorizado no dashboard AppyPay

### Webhook não recebido
1. Verificar URL no dashboard AppyPay
2. Testar com botão "Test Webhook"
3. Ver logs: `supabase functions log payment-webhook`

### Pagamento não reflecte no sistema
- Verificar mapeamento de status
- Confirmar que `reference` corresponde

---

## 📞 Suporte AppyPay

| Canal | Contacto |
|-------|----------|
| Email | suporte@appypay.ao |
| WhatsApp | +244 9XX XXX XXX |
| Telegram | @appypay_support |
| Docs | https://developers.appypay.ao |

---

## 💡 Dicas AppyPay

1. **Checkout Customizado**: AppyPay permite personalizar cores e logo no checkout
2. **Notificações SMS**: Activar notificações SMS para clientes no dashboard
3. **Split Payments**: Suporta divisão de pagamentos entre múltiplas contas
4. **Recurring**: API para pagamentos recorrentes (subscrições automáticas)

---

*Documento criado: 28 de Dezembro de 2025*
