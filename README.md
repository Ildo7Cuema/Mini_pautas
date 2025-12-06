# Mini-Pautas System

Sistema de Mini-Pautas para professores angolanos - Gestão completa de notas com cálculo automático baseado em fórmulas personalizáveis.

## 🎯 Características Principais

- ✅ **Fórmulas Personalizáveis**: Crie suas próprias fórmulas de cálculo
- ✅ **Cálculo Automático**: Notas finais calculadas automaticamente
- ✅ **Sistema de Trimestres**: Suporte completo ao sistema angolano
- ✅ **Multi-Escola**: Suporte para múltiplas escolas e professores
- ✅ **Segurança**: Row Level Security (RLS) para proteção de dados
- ✅ **Relatórios**: Geração automática de mini-pautas em PDF
- ✅ **Auditoria**: Rastreamento completo de todas as alterações
- ✅ **Notificações**: Alertas automáticos para alunos e encarregados

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+
- Conta Supabase
- Conta Vercel (opcional, para deploy)

### Instalação

```bash
# Clone o repositório
git clone <repository-url>
cd dark-hubble

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas chaves Supabase

# Execute o servidor de desenvolvimento
npm run dev
```

### Configuração do Banco de Dados

```bash
# Instale o Supabase CLI
npm install -g supabase

# Faça login
supabase login

# Link ao seu projeto
supabase link --project-ref afueujnyeglgnaylaxmp

# Aplique o schema
supabase db push
```

## 📚 Documentação

- [Arquitetura do Sistema](./docs/architecture.md)
- [Guia de Deployment](./docs/deployment.md)
- [Plano de Segurança](./docs/security.md)
- [Cenários de Teste](./docs/testing.md)
- [Roadmap de Implementação](./docs/roadmap.md)

## 🏗️ Arquitetura

```
Frontend (React + Tailwind)
    ↓
Supabase API
    ↓
PostgreSQL + RLS
    ↓
Edge Functions (Serverless)
```

## 🔐 Segurança

- **Autenticação**: Supabase Auth com JWT
- **Autorização**: Row Level Security (RLS)
- **Criptografia**: HTTPS/TLS 1.3
- **Auditoria**: Log completo de todas as operações
- **Validação**: Input validation em frontend e backend

## 📊 Stack Tecnológico

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: PostgreSQL (Supabase)
- **Estado**: React Query + Zustand
- **Deploy**: Vercel (Frontend) + Supabase (Backend)

## 🧪 Testes

```bash
# Executar testes
npm test

# Testes com UI
npm run test:ui

# Verificação de tipos
npm run type-check
```

## 📦 Build

```bash
# Build para produção
npm run build

# Preview do build
npm run preview
```

## 🚀 Deploy

### Vercel (Frontend)

```bash
# Deploy via CLI
vercel --prod

# Ou conecte seu repositório Git no dashboard Vercel
```

### Supabase (Backend)

```bash
# Deploy Edge Functions
supabase functions deploy calculate-final-grade
supabase functions deploy generate-report
```

## 📝 Licença

Copyright © 2025 Mini-Pautas. Todos os direitos reservados.

## 🤝 Contribuindo

Este é um projeto proprietário. Para contribuições, entre em contato com a equipe de desenvolvimento.

## 📧 Suporte

- Email: support@mini-pautas.ao
- Documentação: https://docs.mini-pautas.ao
- WhatsApp: +244 XXX XXX XXX

## 🙏 Agradecimentos

Desenvolvido para professores angolanos, com o objetivo de simplificar a gestão de notas e melhorar a educação em Angola.
