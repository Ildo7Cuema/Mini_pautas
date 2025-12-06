#!/bin/bash

# Mini-Pautas - Setup Script
# Este script automatiza a configuração inicial do projeto

set -e

echo "🚀 Mini-Pautas - Setup Automático"
echo "=================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# 1. Verificar Node.js
echo "📦 Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não encontrado. Instale Node.js 18+ primeiro.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js versão 18+ necessária. Versão atual: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v) encontrado${NC}"

# 2. Instalar dependências
echo ""
echo "📥 Instalando dependências..."
npm install
echo -e "${GREEN}✅ Dependências instaladas${NC}"

# 3. Configurar variáveis de ambiente
echo ""
echo "🔧 Configurando variáveis de ambiente..."
if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    echo -e "${YELLOW}⚠️  Arquivo .env.local criado${NC}"
    echo -e "${YELLOW}   Por favor, edite .env.local com suas chaves Supabase${NC}"
    echo ""
    echo "   Obtenha suas chaves em:"
    echo "   https://supabase.com/dashboard → Settings → API"
    echo ""
else
    echo -e "${GREEN}✅ .env.local já existe${NC}"
fi

# 4. Verificar Supabase CLI (opcional)
echo ""
echo "🔍 Verificando Supabase CLI..."
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✅ Supabase CLI encontrado: $(supabase --version)${NC}"
else
    echo -e "${YELLOW}⚠️  Supabase CLI não encontrado${NC}"
    echo "   Para instalar: npm install -g supabase"
    echo "   Necessário para deploy de Edge Functions"
fi

# 5. Verificar Vercel CLI (opcional)
echo ""
echo "🔍 Verificando Vercel CLI..."
if command -v vercel &> /dev/null; then
    echo -e "${GREEN}✅ Vercel CLI encontrado${NC}"
else
    echo -e "${YELLOW}⚠️  Vercel CLI não encontrado${NC}"
    echo "   Para instalar: npm install -g vercel"
    echo "   Necessário para deploy do frontend"
fi

# 6. Resumo
echo ""
echo "=================================="
echo -e "${GREEN}✅ Setup concluído!${NC}"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1. Configure suas chaves Supabase em .env.local"
echo "2. Aplique o schema SQL no Supabase Dashboard"
echo "3. Execute: npm run dev"
echo "4. Acesse: http://localhost:3000"
echo ""
echo "📚 Documentação completa: QUICKSTART.md"
echo ""
