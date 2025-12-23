# Guia de Configuração de Pagamentos - EduGest Angola

Este documento contém as instruções para configurar a integração com provedores de pagamento angolanos.

---

## ⏳ Checklist de Configuração

- [ ] Escolher provedor de pagamento
- [ ] Obter credenciais do provedor
- [ ] Configurar webhook secrets no Supabase
- [ ] Registar webhook URL no provedor
- [ ] Testar integração em sandbox
- [ ] Activar em produção

---

## 1. Escolha do Provedor

| Provedor | Vantagens | Processo de Adesão |
|----------|-----------|-------------------|
| **EMIS GPO** | Gateway oficial, aceite em todos os bancos | Via banco parceiro, requer certificação |
| **ProxyPay** | API simplificada para GPO/MCX Express | Registo online em [proxypay.co.ao](https://proxypay.co.ao) |
| **AppyPay** | Integração rápida, suporte técnico | Registo em [appypay.ao](https://appypay.ao) |

---

## 2. Obter Credenciais

### EMIS GPO
1. Contactar o banco parceiro (BFA, BAI, BIC, etc.)
2. Solicitar adesão ao Gateway de Pagamentos Online (GPO)
3. Escolher método de integração: **API** (recomendado) ou iFrame
4. Completar processo de certificação
5. Receber credenciais:
   - `Client ID`
   - `Client Secret`
   - `Webhook Secret`

### ProxyPay
1. Registar em [dashboard.proxypay.co.ao](https://dashboard.proxypay.co.ao/register)
2. Validar empresa com documentação
3. Aceder a **Settings → API Keys**
4. Copiar:
   - `API Token` (Bearer token)
   - `Webhook Secret`

### AppyPay
1. Registar em [appypay.ao/signup](https://appypay.ao/signup)
2. Completar verificação KYC
3. Aceder a **Developers → API Settings**
4. Copiar:
   - `API Key`
   - `Webhook Secret`

---

## 3. Configurar Secrets no Supabase

### Opção A: Via Dashboard (Recomendado)

1. Aceder ao [Supabase Dashboard](https://app.supabase.com)
2. Seleccionar projecto **EduGest Angola**
3. Navegar: **Settings** → **Edge Functions**
4. Clicar em **Secrets** → **Add new secret**
5. Adicionar cada secret:

| Nome do Secret | Valor |
|----------------|-------|
| `EMIS_GPO_WEBHOOK_SECRET` | *(colar secret do EMIS)* |
| `PROXYPAY_WEBHOOK_SECRET` | *(colar secret do ProxyPay)* |
| `APPYPAY_WEBHOOK_SECRET` | *(colar secret do AppyPay)* |

### Opção B: Via CLI

```bash
# Instalar Supabase CLI (se ainda não instalado)
npm install -g supabase

# Login
supabase login

# Linkar ao projecto
supabase link --project-ref <seu-project-ref>

# Definir secrets
supabase secrets set EMIS_GPO_WEBHOOK_SECRET="seu_secret_aqui"
supabase secrets set PROXYPAY_WEBHOOK_SECRET="seu_secret_aqui"
supabase secrets set APPYPAY_WEBHOOK_SECRET="seu_secret_aqui"

# Verificar secrets configurados
supabase secrets list
```

---

## 4. Registar Webhook URL no Provedor

O URL do webhook do EduGest Angola é:

```
https://<seu-projecto>.supabase.co/functions/v1/payment-webhook
```

### Configuração por Provedor

**EMIS GPO:**
- URL: `https://xxx.supabase.co/functions/v1/payment-webhook`
- Método: `POST`
- Header adicional: `x-provider: emis_gpo`

**ProxyPay:**
- URL: `https://xxx.supabase.co/functions/v1/payment-webhook`
- Eventos: `payment.confirmed`, `payment.failed`
- Header adicional: `x-provider: proxypay`

**AppyPay:**
- URL: `https://xxx.supabase.co/functions/v1/payment-webhook`
- Eventos: Todos os eventos de pagamento
- Header adicional: `x-provider: appypay`

---

## 5. Testar em Ambiente Sandbox

### Activar Modo de Teste

No Supabase, adicionar secret temporário:
```bash
supabase secrets set SKIP_WEBHOOK_VERIFICATION="true"
```

### Simular Pagamento

```bash
# Simular webhook de sucesso
curl -X POST "https://<projecto>.supabase.co/functions/v1/payment-webhook" \
  -H "Content-Type: application/json" \
  -H "x-provider: manual" \
  -d '{
    "transaction_id": "TEST-001",
    "status": "success",
    "amount": 15000
  }'
```

### Verificar Resultado
1. Aceder à tabela `transacoes_pagamento` no Supabase
2. Confirmar que transação foi actualizada para `sucesso`
3. Verificar que a licença foi activada
4. Confirmar que a escola foi desbloqueada

---

## 6. Activar em Produção

1. **Remover modo de teste:**
   ```bash
   supabase secrets unset SKIP_WEBHOOK_VERIFICATION
   ```

2. **Verificar logs:**
   ```bash
   supabase functions log payment-webhook
   ```

3. **Monitorizar transações** no dashboard SUPERADMIN

---

## 📝 Notas de Referência

### Preços Configurados

| Plano | Valor (AOA) | Duração |
|-------|-------------|---------|
| Trimestral | 15.000 | 3 meses |
| Semestral | 27.000 | 6 meses |
| Anual | 48.000 | 12 meses |

### Estados de Transação

| Estado | Descrição |
|--------|-----------|
| `pendente` | Aguardando pagamento |
| `processando` | Pagamento em processamento |
| `sucesso` | Pagamento confirmado |
| `falha` | Pagamento falhou |
| `cancelado` | Pagamento cancelado |

### Contactos de Suporte dos Provedores

| Provedor | Suporte |
|----------|---------|
| EMIS | Via banco parceiro |
| ProxyPay | support@proxypay.co.ao |
| AppyPay | suporte@appypay.ao |

---

## 🔐 Segurança

> **IMPORTANTE:** Nunca partilhar os webhook secrets em código público ou repositórios Git.

- Usar sempre HTTPS
- Validar assinaturas de webhook
- Manter secrets actualizados
- Monitorizar transações suspeitas
