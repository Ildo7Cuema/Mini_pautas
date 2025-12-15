# 🔧 Guia: Como Aplicar a Migração do Banco de Dados

## Problema Identificado
As notas não estão sendo salvas porque a coluna `trimestre` não existe na tabela `notas` do banco de dados.

## Solução: Aplicar a Migração SQL

### Passo 1: Acessar o Supabase Dashboard
1. Abra seu navegador e vá para [https://app.supabase.com](https://app.supabase.com)
2. Faça login na sua conta
3. Selecione o projeto **EduGest Angola**

### Passo 2: Abrir o SQL Editor
1. No menu lateral esquerdo, clique em **SQL Editor**
2. Clique em **New query** para criar uma nova consulta

### Passo 3: Copiar e Executar a Migração
1. Abra o arquivo [`supabase/apply_trimestre_migration.sql`](file:///Users/user/.gemini/antigravity/playground/dark-hubble/supabase/apply_trimestre_migration.sql)
2. Copie **todo o conteúdo** do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou pressione `Ctrl/Cmd + Enter`)

### Passo 4: Verificar o Resultado
Você deve ver uma mensagem de sucesso com:
```
status: "Migration completed successfully!"
trimestre_exists: true
constraint_exists: true
```

## O Que a Migração Faz

✅ Adiciona a coluna `trimestre` à tabela `notas`  
✅ Atualiza registros existentes com o trimestre correto  
✅ Remove a constraint antiga `(aluno_id, componente_id)`  
✅ Cria nova constraint `(aluno_id, componente_id, trimestre)`  
✅ Adiciona índices para melhor performance  

## Após Aplicar a Migração

1. **Teste a aplicação**: Tente inserir notas novamente
2. **Verifique a persistência**: As notas devem ser salvas corretamente
3. **Teste múltiplos trimestres**: Você pode agora salvar notas diferentes para o mesmo aluno/componente em trimestres diferentes

## Problemas?

Se encontrar algum erro ao executar a migração, me avise e eu ajudo a resolver!

---

**Nota**: A migração é segura e verifica se as mudanças já foram aplicadas antes de executá-las, então você pode executá-la múltiplas vezes sem problemas.
