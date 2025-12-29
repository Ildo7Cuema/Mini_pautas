# Guia Completo de Integração de Pagamentos - EduGest Angola

Este documento fornece instruções detalhadas para implementar a integração com provedores de pagamento angolanos quando obtiver as credenciais.

---

## 📋 Arquitectura Actual do Sistema

O sistema já possui toda a infraestrutura preparada:

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  SubscriptionPage.tsx → seleciona plano → chama Edge Function   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              EDGE FUNCTION: create-payment                       │
│  • Cria transação pendente                                       │
│  • Inicializa pagamento no provider → AQUI IMPLEMENTAR API REAL │
│  • Retorna payment_url ou referência                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PROVEDOR EXTERNO                              │
│  EMIS GPO / ProxyPay / AppyPay                                   │
│  • Utilizador completa pagamento                                 │
│  • Provider envia webhook de confirmação                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              EDGE FUNCTION: payment-webhook                      │
│  • Recebe confirmação do provider                                │
│  • Valida assinatura → AQUI IMPLEMENTAR VALIDAÇÃO REAL          │
│  • Actualiza transação para "sucesso"                            │
│  • Activa licença e desbloqueia escola                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⏳ Passo a Passo - Quando Conseguir Credenciais

### Passo 1: Escolher e Contratar Provedor

| Provedor | Melhor Para | Tempo de Aprovação | Custo Médio |
|----------|-------------|-------------------|-------------|
| **EMIS GPO** | Volume alto, empresas estabelecidas | 2-4 semanas | ~2% por transação |
| **ProxyPay** | Startups, integração rápida | 1-2 semanas | ~2.5% por transação |
| **AppyPay** | Pequenas empresas, suporte local | 3-5 dias | ~3% por transação |

**Recomendação**: Para começar rapidamente, ProxyPay ou AppyPay. Para escala, EMIS GPO.

---

### Passo 2: Obter Credenciais

#### Para EMIS GPO
1. Abrir conta empresarial num banco parceiro (BFA, BAI, BIC)
2. Solicitar adesão ao Gateway de Pagamentos Online
3. Preencher formulário de certificação técnica
4. Aguardar aprovação e receber:
   - `EMIS_CLIENT_ID`
   - `EMIS_CLIENT_SECRET`
   - `EMIS_MERCHANT_ID`
   - `EMIS_GPO_WEBHOOK_SECRET`

#### Para ProxyPay
1. Registar em https://dashboard.proxypay.co.ao
2. Validar empresa com NIF e documentos
3. Aceder a Settings → API Keys
4. Copiar:
   - `PROXYPAY_API_TOKEN`
   - `PROXYPAY_WEBHOOK_SECRET`

#### Para AppyPay
1. Registar em https://appypay.ao/signup
2. Completar verificação KYC
3. Aceder a Developers → API Settings
4. Copiar:
   - `APPYPAY_API_KEY`
   - `APPYPAY_MERCHANT_ID`
   - `APPYPAY_WEBHOOK_SECRET`

---

### Passo 3: Configurar Secrets no Supabase

Execute estes comandos no terminal:

```bash
# Login no Supabase
supabase login

# Linkar ao projecto EduGest
supabase link --project-ref afueujnyeglgnaylaxmp

# === PARA EMIS GPO ===
supabase secrets set EMIS_CLIENT_ID="seu_client_id_aqui"
supabase secrets set EMIS_CLIENT_SECRET="seu_client_secret_aqui"
supabase secrets set EMIS_MERCHANT_ID="seu_merchant_id_aqui"
supabase secrets set EMIS_GPO_WEBHOOK_SECRET="seu_webhook_secret_aqui"
supabase secrets set EMIS_API_URL="https://gpo.emis.co.ao/api/v1"

# === PARA PROXYPAY ===
supabase secrets set PROXYPAY_API_TOKEN="seu_api_token_aqui"
supabase secrets set PROXYPAY_WEBHOOK_SECRET="seu_webhook_secret_aqui"
supabase secrets set PROXYPAY_API_URL="https://api.proxypay.co.ao"

# === PARA APPYPAY ===
supabase secrets set APPYPAY_API_KEY="seu_api_key_aqui"
supabase secrets set APPYPAY_MERCHANT_ID="seu_merchant_id_aqui"
supabase secrets set APPYPAY_WEBHOOK_SECRET="seu_webhook_secret_aqui"
supabase secrets set APPYPAY_API_URL="https://api.appypay.ao/v1"

# Verificar se foram configurados
supabase secrets list
```

---

### Passo 4: Modificar create-payment/index.ts

Abra o ficheiro `supabase/functions/create-payment/index.ts` e substitua a função `initializePayment` pelo código real do provider que escolheu.

#### Opção A: Integração EMIS GPO

```typescript
// Adicionar no topo do ficheiro
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts'

async function initializePaymentEMIS(
    escola_id: string,
    valor: number,
    descricao: string
): Promise<PaymentProviderResponse> {
    const clientId = Deno.env.get('EMIS_CLIENT_ID')!
    const clientSecret = Deno.env.get('EMIS_CLIENT_SECRET')!
    const merchantId = Deno.env.get('EMIS_MERCHANT_ID')!
    const apiUrl = Deno.env.get('EMIS_API_URL') || 'https://gpo.emis.co.ao/api/v1'

    // 1. Obter token de autenticação
    const authResponse = await fetch(`${apiUrl}/oauth/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${base64Encode(`${clientId}:${clientSecret}`)}`
        },
        body: 'grant_type=client_credentials'
    })

    if (!authResponse.ok) {
        throw new Error('Falha na autenticação EMIS GPO')
    }

    const { access_token } = await authResponse.json()

    // 2. Criar pagamento
    const reference = `EDU-${Date.now()}`
    const paymentResponse = await fetch(`${apiUrl}/payments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify({
            merchant_id: merchantId,
            amount: valor,
            currency: 'AOA',
            reference: reference,
            description: descricao,
            callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`,
            return_url: `${Deno.env.get('FRONTEND_URL')}/dashboard?payment=success`,
            cancel_url: `${Deno.env.get('FRONTEND_URL')}/dashboard?payment=cancelled`,
            expiry_minutes: 1440 // 24 horas
        })
    })

    if (!paymentResponse.ok) {
        const error = await paymentResponse.text()
        console.error('Erro EMIS:', error)
        throw new Error('Falha ao criar pagamento EMIS')
    }

    const payment = await paymentResponse.json()

    return {
        reference: reference,
        payment_url: payment.checkout_url,
        provider_transaction_id: payment.transaction_id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
}
```

#### Opção B: Integração ProxyPay

```typescript
async function initializePaymentProxyPay(
    escola_id: string,
    valor: number,
    descricao: string
): Promise<PaymentProviderResponse> {
    const apiToken = Deno.env.get('PROXYPAY_API_TOKEN')!
    const apiUrl = Deno.env.get('PROXYPAY_API_URL') || 'https://api.proxypay.co.ao'

    const reference = `EDU-${Date.now()}`

    // Criar referência de pagamento
    const response = await fetch(`${apiUrl}/references`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${apiToken}`
        },
        body: JSON.stringify({
            amount: valor.toFixed(2),
            end_datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            custom_fields: {
                escola_id: escola_id,
                descricao: descricao,
                internal_reference: reference
            }
        })
    })

    if (!response.ok) {
        const error = await response.text()
        console.error('Erro ProxyPay:', error)
        throw new Error('Falha ao criar pagamento ProxyPay')
    }

    const data = await response.json()

    return {
        reference: data.reference_id, // Referência para pagar no Multicaixa
        provider_transaction_id: data.id,
        expires_at: data.end_datetime
        // ProxyPay usa referências para pagamento - não há URL de checkout
    }
}
```

#### Opção C: Integração AppyPay

```typescript
async function initializePaymentAppyPay(
    escola_id: string,
    valor: number,
    descricao: string
): Promise<PaymentProviderResponse> {
    const apiKey = Deno.env.get('APPYPAY_API_KEY')!
    const merchantId = Deno.env.get('APPYPAY_MERCHANT_ID')!
    const apiUrl = Deno.env.get('APPYPAY_API_URL') || 'https://api.appypay.ao/v1'

    const reference = `EDU-${Date.now()}`

    const response = await fetch(`${apiUrl}/payments/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
            'X-Merchant-Id': merchantId
        },
        body: JSON.stringify({
            amount: valor,
            currency: 'AOA',
            reference: reference,
            description: descricao,
            webhook_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`,
            success_url: `${Deno.env.get('FRONTEND_URL')}/dashboard?payment=success`,
            failure_url: `${Deno.env.get('FRONTEND_URL')}/dashboard?payment=failed`,
            metadata: {
                escola_id: escola_id
            }
        })
    })

    if (!response.ok) {
        const error = await response.text()
        console.error('Erro AppyPay:', error)
        throw new Error('Falha ao criar pagamento AppyPay')
    }

    const data = await response.json()

    return {
        reference: reference,
        payment_url: data.payment_url,
        provider_transaction_id: data.payment_id,
        expires_at: data.expires_at
    }
}
```

#### Actualizar a função principal

```typescript
// Substituir a função initializePayment existente por:
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
            // Pagamento manual - sem provider externo
            return {
                reference: `MANUAL-${Date.now()}`,
                provider_transaction_id: `MANUAL-${Date.now()}`
            }
    }
}
```

---

### Passo 5: Modificar payment-webhook/index.ts

Adicione a validação real de assinatura para cada provider.

#### Validação EMIS GPO

```typescript
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

async function verifyEMISSignature(signature: string, body: string): Promise<boolean> {
    const secret = Deno.env.get('EMIS_GPO_WEBHOOK_SECRET')!
    
    // EMIS usa HMAC-SHA256
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    
    return signature === expectedSignature
}
```

#### Validação ProxyPay

```typescript
async function verifyProxyPaySignature(signature: string, body: string): Promise<boolean> {
    const secret = Deno.env.get('PROXYPAY_WEBHOOK_SECRET')!
    
    // ProxyPay usa HMAC-SHA512
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-512' },
        false,
        ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    
    return signature === expectedSignature
}
```

#### Actualizar a função de verificação

```typescript
async function verifyWebhookSignature(
    provider: string,
    signature: string | null,
    body: string
): Promise<boolean> {
    // Skip em desenvolvimento
    if (Deno.env.get('SKIP_WEBHOOK_VERIFICATION') === 'true') {
        console.log('⚠️ Webhook verification skipped (development mode)')
        return true
    }

    if (!signature) {
        console.error('Missing signature for provider:', provider)
        return false
    }

    switch (provider) {
        case 'emis_gpo':
            return await verifyEMISSignature(signature, body)
        case 'proxypay':
            return await verifyProxyPaySignature(signature, body)
        case 'appypay':
            return await verifyAppyPaySignature(signature, body)
        default:
            return true // Manual payments don't need verification
    }
}
```

---

### Passo 6: Registar Webhook no Provedor

Após deploy, registar este URL no painel do provedor:

```
https://afueujnyeglgnaylaxmp.supabase.co/functions/v1/payment-webhook
```

Configure os eventos:
- **EMIS**: `payment.approved`, `payment.failed`, `payment.cancelled`
- **ProxyPay**: `payment.confirmed`, `payment.failed`
- **AppyPay**: `payment.completed`, `payment.failed`, `payment.cancelled`

---

### Passo 7: Deploy das Edge Functions

```bash
# Deploy da função de criar pagamento
supabase functions deploy create-payment

# Deploy do webhook
supabase functions deploy payment-webhook

# Verificar logs
supabase functions log create-payment --tail
supabase functions log payment-webhook --tail
```

---

### Passo 8: Testar em Ambiente Sandbox

#### 8.1 Activar modo de teste
```bash
supabase secrets set SKIP_WEBHOOK_VERIFICATION="true"
```

#### 8.2 Criar um pagamento de teste
```bash
curl -X POST "https://afueujnyeglgnaylaxmp.supabase.co/functions/v1/create-payment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_DE_AUTENTICACAO" \
  -d '{
    "escola_id": "ID_DA_ESCOLA_TESTE",
    "plano": "trimestral",
    "provider": "proxypay"
  }'
```

#### 8.3 Simular confirmação de pagamento
```bash
curl -X POST "https://afueujnyeglgnaylaxmp.supabase.co/functions/v1/payment-webhook" \
  -H "Content-Type: application/json" \
  -H "x-provider: proxypay" \
  -d '{
    "transaction_id": "ID_RETORNADO_NO_PASSO_ANTERIOR",
    "status": "paid"
  }'
```

#### 8.4 Verificar resultado
1. Aceder ao Supabase Dashboard → Table Editor
2. Verificar `transacoes_pagamento` - estado deve ser `sucesso`
3. Verificar `licencas` - estado deve ser `ativa`
4. Verificar `escolas` - `bloqueado` deve ser `false`

---

### Passo 9: Activar Produção

```bash
# Remover modo de teste
supabase secrets unset SKIP_WEBHOOK_VERIFICATION

# Confirmar que secrets estão configurados correctamente
supabase secrets list
```

---

## 🔐 Checklist de Segurança

- [ ] Nunca expor secrets em código fonte
- [ ] Verificar assinaturas de webhook em produção
- [ ] Usar HTTPS em todos os endpoints
- [ ] Monitorizar logs de transações
- [ ] Configurar alertas para falhas de pagamento
- [ ] Implementar retry para webhooks falhados
- [ ] Manter backup de transações

---

## 📊 Monitorização

### Comandos Úteis

```bash
# Ver logs em tempo real
supabase functions log payment-webhook --tail

# Ver últimas transações (SQL no Supabase)
SELECT * FROM transacoes_pagamento ORDER BY created_at DESC LIMIT 20;

# Transações pendentes há mais de 24h
SELECT * FROM transacoes_pagamento 
WHERE estado = 'pendente' 
AND created_at < NOW() - INTERVAL '24 hours';
```

### Dashboard SUPERADMIN

O painel SUPERADMIN (`SuperAdminDashboard.tsx`) já mostra:
- Total de licenças activas/expiradas
- Receitas por período
- Escolas bloqueadas por falta de pagamento

---

## 📞 Suporte dos Provedores

| Provedor | Contacto | Documentação |
|----------|----------|--------------|
| EMIS GPO | Via banco parceiro | docs.emis.co.ao |
| ProxyPay | support@proxypay.co.ao | docs.proxypay.co.ao |
| AppyPay | suporte@appypay.ao | developers.appypay.ao |

---

## ⚠️ Notas Importantes

> [!CAUTION]
> **Nunca testar com dados reais de cartão em ambiente de desenvolvimento!**

> [!WARNING]
> **Antes de ir para produção:**
> - Remover `SKIP_WEBHOOK_VERIFICATION`
> - Testar fluxo completo em sandbox do provider
> - Verificar que webhooks estão a chegar correctamente

> [!TIP]
> **Para debugging**, adicione logs temporários nas Edge Functions:
> ```typescript
> console.log('📥 Payload recebido:', JSON.stringify(payload, null, 2))
> ```

---

*Documento criado: 28 de Dezembro de 2025*
*Última actualização: v1.0*
