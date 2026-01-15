# Chaves de Acesso e Configuração

Este documento contém informações sobre as chaves de acesso públicas do projeto **EduGest Angola**.

> [!WARNING]
> Nunca partilhe a sua `SERVICE_ROLE_KEY` (Chave Secreta). A chave abaixo é a `ANON_KEY` (Chave Pública), que é segura para usar no frontend.

## Supabase Public Key (Anon Key)

Esta chave é utilizada para autenticação anónima e conexão com o Supabase a partir do frontend (navegador).

```
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmdWV1am55ZWdsZ25heWxheG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MDUwMzcsImV4cCI6MjA4MDQ4MTAzN30.seenkjGrGkX6XyMaXKiJmPFQ7I3TnV0df5hvPQEjC1c
```

### Onde usar esta chave?
1. No ficheiro `.env.local` na raiz do projeto.
2. Nas configurações de variáveis de ambiente do Vercel/Netlify.
3. No cabeçalho `Authorization: Bearer <CHAVE>` ao fazer requisições HTTP manuais.

## Outras Chaves

Para chaves de integração (AppyPay, EMIS), consulte os respectivos guias na pasta `docs/`.
