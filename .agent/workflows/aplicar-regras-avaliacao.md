---
description: Como aplicar as regras de avaliação do sistema angolano
---

# Workflow: Aplicar Regras de Avaliação do Sistema Angolano

Este workflow descreve como aplicar as regras oficiais de avaliação definidas em `.agent/REGRAS_AVALIACAO_ANGOLA.md` em qualquer funcionalidade do sistema.

## Passo 1: Consultar as Regras Oficiais

Sempre que trabalhar com avaliações, notas, pautas ou relatórios, consulte primeiro:
```
.agent/REGRAS_AVALIACAO_ANGOLA.md
```

## Passo 2: Identificar o Nível de Ensino

Determine qual nível de ensino está a trabalhar:
- **Ensino Primário** (1.ª a 6.ª classe)
- **Ensino Secundário I Ciclo** (7.ª, 8.ª, 9.ª classes)
- **Ensino Secundário II Ciclo** (10.ª, 11.ª, 12.ª, 13.ª classes)

## Passo 3: Aplicar Critérios de Transição

### Para Ensino Primário:
- MF ≥ 5 em TODAS as disciplinas
- Frequência ≥ 66,67%

### Para Secundário I Ciclo (7.ª e 8.ª):
- MF ≥ 10 em TODAS as disciplinas (transição plena)
- OU até 2 disciplinas entre 7-9 (exceto LP e Mat simultaneamente) → Matrícula Condicional

### Para Secundário I Ciclo (9.ª):
- MF ≥ 10 em TODAS as disciplinas (sem condicional)

### Para Secundário II Ciclo:
- Aplicar limiares ministeriais configurados

## Passo 4: Verificar Frequência

SEMPRE verificar:
```
frequenciaAnual >= 66.67%
```

Se frequência < 66,67% → **Não Transita** (independentemente das notas)

## Passo 5: Arredondar Notas

Antes de tomar decisão de transição:
```typescript
const notaArredondada = Math.round(notaFinal);
```

## Passo 6: Gerar Observação Padronizada

Usar os templates definidos na secção 7 do documento de regras:
- Transição plena
- Transição condicional
- Retenção por nota
- Retenção por frequência
- Retenção por LP e Matemática

## Passo 7: Validar no Frontend E Backend

- **Frontend**: Validação em tempo real
- **Backend**: Validação obrigatória antes de gravar
- Nunca confiar apenas na validação do frontend

## Passo 8: Registar Tipo de Exame (se aplicável)

Para classes terminais ou matrícula condicional:
- Exame Nacional (6.ª, 9.ª, 12.ª, 13.ª)
- Exame Extraordinário (7.ª e 8.ª em condicional)
- Recurso (conforme calendário)

## Passo 9: Exportar Campos Obrigatórios

Todos os relatórios devem incluir:
- Estado (Transita/Não Transita/Matrícula Condicional)
- Observações
- Motivo de Retenção (se aplicável)
- Frequência (%)
- Tipo de Exame (se aplicável)
- Indicação de arredondamento (se influenciou decisão)

## Passo 10: Testar Casos Extremos

Sempre testar:
- Nota 4.5 (arredonda para 5 → transita no primário)
- Nota 9.5 (arredonda para 10 → transita no secundário)
- Frequência exatamente 66,67%
- Duas disciplinas com 7-9 sendo LP e Mat
- Duas disciplinas com 7-9 NÃO sendo LP e Mat

## Notas Importantes

> [!IMPORTANT]
> Estas regras são **permanentes** e aplicam-se a TODAS as funcionalidades do sistema, presentes e futuras.

> [!WARNING]
> Nunca permitir transição com frequência < 66,67%, independentemente das notas.

> [!CAUTION]
> A validação deve ocorrer tanto no frontend quanto no backend para garantir integridade dos dados.
