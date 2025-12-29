# Guia de Integração - ProxyPay

Instruções completas para integrar o **ProxyPay** no EduGest Angola.

---

## 📋 Sobre o ProxyPay

O ProxyPay é uma plataforma angolana que simplifica a integração com Multicaixa Express e referências de pagamento, oferecendo uma API moderna e documentação clara.

**Vantagens**: Registo online rápido, API simples, bom suporte técnico, dashboard intuitivo
**Desvantagens**: Taxa ligeiramente mais alta que integração directa EMIS

**Website**: https://proxypay.co.ao  
**Documentação**: https://docs.proxypay.co.ao

---

## 🔐 Passo 1: Obter Credenciais

> [!IMPORTANT]
> O ProxyPay **não tem registo online self-service**. É necessário contactar a equipa directamente.

### 1.1 Contactar ProxyPay

**Opção A - Email Directo:**
Enviar email para a equipa ProxyPay (empresa TimeBoxed) solicitando adesão.

**Opção B - Através do Banco:**
Alguns bancos angolanos oferecem ProxyPay como serviço integrado. Consultar o seu gestor de conta empresarial.

### 1.2 Documentação Necessária
Preparar os seguintes documentos:
- Alvará comercial da empresa
- NIF empresarial
- Documento do representante legal
- **Conta bancária empresarial em Angola (AOA)** - obrigatório
- Descrição do negócio/sistema a integrar

### 1.3 Processo de Adesão
1. Enviar documentação para ProxyPay
2. Aguardar análise e validação (5-10 dias úteis)
3. Assinar contrato de prestação de serviços
4. Receber credenciais após aprovação

### 1.4 Credenciais Fornecidas
Após aprovação, receberá:

| Credencial | Descrição |
|------------|-----------|
| `API Token` | Token Bearer para autenticação |
| `Webhook Secret` | Secret para validar webhooks |

### 1.4 Ambiente de Testes
ProxyPay oferece ambiente sandbox separado:
- **Sandbox**: https://sandbox.proxypay.co.ao
- **Produção**: https://api.proxypay.co.ao

---

## ⚙️ Passo 2: Configurar Secrets no Supabase

```bash
# Login no Supabase
supabase login

# Linkar ao projecto
supabase link --project-ref afueujnyeglgnaylaxmp

# Configurar credenciais ProxyPay
supabase secrets set PROXYPAY_API_TOKEN="seu_api_token"
supabase secrets set PROXYPAY_WEBHOOK_SECRET="seu_webhook_secret"

# URL da API (usar sandbox para testes)
# Sandbox:
supabase secrets set PROXYPAY_API_URL="https://sandbox.proxypay.co.ao"
# Produção:
# supabase secrets set PROXYPAY_API_URL="https://api.proxypay.co.ao"

# URL do frontend
supabase secrets set FRONTEND_URL="https://seudominio.vercel.app"

# Verificar
supabase secrets list
```

---

## 💻 Passo 3: Implementar Código

### 3.1 Actualizar create-payment/index.ts

Adicionar no ficheiro `supabase/functions/create-payment/index.ts`:

```typescript
// ============================================
// PROXYPAY INTEGRATION
// Adicionar após os imports existentes
// ============================================

interface ProxyPayReferenceResponse {
    id: string
    reference_id: string
    amount: string
    end_datetime: string
    custom_fields: Record<string, any>
    state: string
}

/**
 * Criar referência de pagamento no ProxyPay
 * ProxyPay gera uma referência que o cliente usa para pagar no Multicaixa
 */
async function initializePaymentProxyPay(
    escola_id: string,
    valor: number,
    descricao: string
): Promise<PaymentProviderResponse> {
    const apiToken = Deno.env.get('PROXYPAY_API_TOKEN')
    const apiUrl = Deno.env.get('PROXYPAY_API_URL') || 'https://api.proxypay.co.ao'

    if (!apiToken) {
        throw new Error('PROXYPAY_API_TOKEN não configurado')
    }

    // Gerar referência interna
    const internalReference = `EDU-${escola_id.slice(0, 8)}-${Date.now()}`

    // Data de expiração (24 horas)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // Payload para criar referência
    const payload = {
        amount: valor.toFixed(2), // ProxyPay espera string com 2 casas decimais
        end_datetime: expiresAt.toISOString(),
        custom_fields: {
            escola_id: escola_id,
            descricao: descricao,
            internal_reference: internalReference,
            system: 'edugest_angola'
        }
    }

    console.log('📤 Criando referência ProxyPay:', { internalReference, valor })

    const response = await fetch(`${apiUrl}/references`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${apiToken}`,
            'Accept': 'application/vnd.proxypay.v2+json'
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        const error = await response.text()
        console.error('❌ Erro ProxyPay:', response.status, error)
        throw new Error(`Falha ao criar referência ProxyPay: ${response.status}`)
    }

    const data: ProxyPayReferenceResponse = await response.json()

    console.log('✅ Referência ProxyPay criada:', data.reference_id)

    return {
        // A referência é o número que o cliente usa para pagar
        reference: data.reference_id,
        provider_transaction_id: data.id,
        expires_at: data.end_datetime
        // ProxyPay não tem URL de checkout - pagamento via Multicaixa/referência
    }
}

/**
 * Consultar estado de uma referência ProxyPay
 */
async function checkProxyPayReference(referenceId: string): Promise<string> {
    const apiToken = Deno.env.get('PROXYPAY_API_TOKEN')
    const apiUrl = Deno.env.get('PROXYPAY_API_URL') || 'https://api.proxypay.co.ao'

    const response = await fetch(`${apiUrl}/references/${referenceId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Token ${apiToken}`,
            'Accept': 'application/vnd.proxypay.v2+json'
        }
    })

    if (!response.ok) {
        return 'unknown'
    }

    const data = await response.json()
    return data.state // 'pending', 'paid', 'deleted'
}
```

### 3.2 Actualizar a função initializePayment

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

Adicionar validação ProxyPay:

```typescript
// ============================================
// PROXYPAY WEBHOOK VALIDATION
// ============================================

import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { encode as hexEncode } from 'https://deno.land/std@0.168.0/encoding/hex.ts'

/**
 * Validar assinatura de webhook ProxyPay
 * ProxyPay usa HMAC-SHA512
 */
async function verifyProxyPaySignature(
    signature: string,
    body: string
): Promise<boolean> {
    const secret = Deno.env.get('PROXYPAY_WEBHOOK_SECRET')

    if (!secret) {
        console.error('❌ PROXYPAY_WEBHOOK_SECRET não configurado')
        return false
    }

    try {
        const encoder = new TextEncoder()
        const keyData = encoder.encode(secret)
        const messageData = encoder.encode(body)

        // ProxyPay usa HMAC-SHA512
        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-512' },
            false,
            ['sign']
        )

        const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData)

        const expectedSignature = new TextDecoder().decode(
            hexEncode(new Uint8Array(signatureBuffer))
        )

        const isValid = signature.toLowerCase() === expectedSignature.toLowerCase()

        if (!isValid) {
            console.error('❌ Assinatura ProxyPay inválida')
        }

        return isValid
    } catch (error) {
        console.error('❌ Erro ao verificar assinatura ProxyPay:', error)
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
        case 'proxypay':
            return await verifyProxyPaySignature(signature, body)
        // ... outros
        default:
            return true
    }
}
```

### 3.4 Mapeamento de Status ProxyPay

Actualizar `mapProviderStatus`:

```typescript
const statusMaps: Record<string, Record<string, string>> = {
    proxypay: {
        'pending': 'processando',
        'paid': 'sucesso',
        'deleted': 'cancelado',
        'expired': 'cancelado'
    },
    // ... outros providers
}
```

---

## 🌐 Passo 4: Configurar Webhook no ProxyPay

### 4.1 Aceder ao Dashboard ProxyPay
1. Login em https://dashboard.proxypay.co.ao
2. Navegar para **Settings** → **Webhooks**

### 4.2 Adicionar Webhook
Clicar em **"Add Webhook"** e preencher:

| Campo | Valor |
|-------|-------|
| URL | `https://afueujnyeglgnaylaxmp.supabase.co/functions/v1/payment-webhook` |
| Events | `reference.paid`, `reference.deleted` |
| Headers | `x-provider: proxypay` |
| Active | ✓ Sim |

### 4.3 Copiar Webhook Secret
O ProxyPay mostrará o Webhook Secret após criar. Guardar e configurar no Supabase.

---

## 🧪 Passo 5: Testar em Sandbox

### 5.1 Configurar ambiente de teste
```bash
supabase secrets set SKIP_WEBHOOK_VERIFICATION="true"
supabase secrets set PROXYPAY_API_URL="https://sandbox.proxypay.co.ao"
```

### 5.2 Criar referência de teste
```bash
curl -X POST "https://afueujnyeglgnaylaxmp.supabase.co/functions/v1/create-payment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "escola_id": "UUID_DA_ESCOLA",
    "plano": "trimestral",
    "provider": "proxypay"
  }'
```

Resposta esperada:
```json
{
  "success": true,
  "transaction_id": "uuid-da-transacao",
  "reference": "123456789012",
  "expires_at": "2025-12-29T15:00:00Z",
  "valor": 15000,
  "moeda": "AOA"
}
```

### 5.3 Simular pagamento no Sandbox
No dashboard ProxyPay Sandbox, há opção para marcar referências como pagas para teste.

### 5.4 Simular webhook manualmente
```bash
curl -X POST "https://afueujnyeglgnaylaxmp.supabase.co/functions/v1/payment-webhook" \
  -H "Content-Type: application/json" \
  -H "x-provider: proxypay" \
  -d '{
    "id": "uuid-proxypay",
    "reference_id": "123456789012",
    "amount": "15000.00",
    "state": "paid",
    "payment_datetime": "2025-12-28T16:00:00Z"
  }'
```

### 5.5 Verificar resultado
```sql
-- No Supabase SQL Editor
SELECT * FROM transacoes_pagamento ORDER BY created_at DESC LIMIT 5;
SELECT * FROM licencas ORDER BY created_at DESC LIMIT 5;
SELECT bloqueado, bloqueado_motivo FROM escolas WHERE id = 'UUID_DA_ESCOLA';
```

---

## 🚀 Passo 6: Produção

### 6.1 Remover modo de teste
```bash
supabase secrets unset SKIP_WEBHOOK_VERIFICATION
supabase secrets set PROXYPAY_API_URL="https://api.proxypay.co.ao"
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

## 📱 Fluxo de Pagamento para Utilizador

Com ProxyPay, o fluxo é diferente pois usa referências Multicaixa:

1. **Escola seleciona plano** → Sistema cria referência
2. **Sistema mostra referência** ao utilizador (ex: `123456789012`)
3. **Utilizador paga** no Multicaixa Express, ATM ou app bancária usando a referência
4. **ProxyPay detecta pagamento** → Envia webhook
5. **Sistema activa licença** automaticamente

### Actualizar UI para mostrar referência

No componente `SubscriptionPage.tsx`, mostrar instrução quando provider for ProxyPay:

```tsx
{paymentResult?.reference && !paymentResult?.payment_url && (
  <div className="bg-blue-50 p-4 rounded-lg">
    <h4 className="font-semibold text-blue-900">
      Pague usando esta referência Multicaixa:
    </h4>
    <p className="text-3xl font-mono text-blue-700 my-4">
      {paymentResult.reference}
    </p>
    <p className="text-sm text-blue-600">
      Use o Multicaixa Express, ATM ou app do seu banco.
      Entidade: ProxyPay Angola
    </p>
    <p className="text-xs text-gray-500 mt-2">
      Expira em: {new Date(paymentResult.expires_at).toLocaleString('pt-AO')}
    </p>
  </div>
)}
```

---

## 📊 Estados ProxyPay

| Estado ProxyPay | Estado Interno | Descrição |
|-----------------|----------------|-----------|
| `pending` | `processando` | Aguardando pagamento |
| `paid` | `sucesso` | Pagamento confirmado |
| `deleted` | `cancelado` | Referência eliminada |
| `expired` | `cancelado` | Referência expirada |

---

## ❓ Troubleshooting

### Erro: "PROXYPAY_API_TOKEN não configurado"
```bash
supabase secrets set PROXYPAY_API_TOKEN="seu_token"
supabase functions deploy create-payment
```

### Erro 401 na API ProxyPay
- Verificar se o token é do ambiente correcto (sandbox vs produção)
- Confirmar que a conta está activa e validada

### Webhook não recebido
1. Verificar URL no dashboard ProxyPay
2. Confirmar que eventos `reference.paid` está seleccionado
3. Testar com webhook de teste no dashboard

### Referência não aparece
- Verificar resposta da API no log
- Confirmar que `reference_id` está a ser retornado

---

## 📞 Suporte ProxyPay

| Canal | Contacto |
|-------|----------|
| **Empresa** | TimeBoxed Lda. |
| **Website** | https://www.proxypay.co.ao |
| **Documentação API** | https://developer.proxypay.co.ao |
| **API RPS** | https://developer.proxypay.co.ao/rps/v2/ |
| **API OPG** | https://developer.proxypay.co.ao/opg/v1/ |

> [!TIP]
> Para adesão, o melhor contacto é através do seu banco ou directamente com a TimeBoxed.

---

*Documento criado: 28 de Dezembro de 2025*  
*Actualizado: Links corrigidos*
