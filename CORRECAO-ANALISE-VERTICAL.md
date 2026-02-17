# Correção de Duplicação na Análise Vertical/Horizontal

## Problemas Identificados

### Problema 1: Duplicação por Truncamento
Ao filtrar por **Unidade Orçamentária** (e outros campos codificados), os registros apareciam **duplicados com valores zerados** porque os nomes vinham **truncados de formas diferentes** nos diferentes arquivos:

**Exemplo:**
- Linha 1: `41001 - AUTARQUIA DE URBANIZAÇÃO E MEIO AMBIENTE DE CARUARU - U` → Empenhado: R$ 7.244.946,46 | Liquidado: R$ 0,00
- Linha 2: `41001 - AUTARQUIA DE URBANIZAÇÃO E MEIO AMBIENTE DE CA` → Empenhado: R$ 0,00 | Liquidado: R$ 6.569.875,60

**Causa:** Os arquivos de empenhados, liquidados e pagos tinham o mesmo órgão com nomes truncados diferentemente, criando chaves de agregação separadas.

### Problema 2: Valores de "Pagos" Zerados
Os valores da coluna **"Pago"** apareciam zerados na análise por Unidade Orçamentária.

**Causa:** Inconsistência de capitalização nos nomes das colunas:
- **Empenhados e Liquidados:** `Unidade orçamentária` (ç minúsculo)
- **Pagos:** `Unidade Orçamentária` (Ç maiúsculo)

A função `getValor()` fazia busca exata e não encontrava a coluna no arquivo de Pagos.

## Soluções Implementadas

### Solução 1: Normalização de Chaves (Problema de Duplicação)

**Função `normalizarChaveAgrupamento(valor, agrupamento)`**
Criada para **extrair apenas o código numérico** dos campos codificados, garantindo consolidação correta:

- **Unidade orçamentária:** `41001 - NOME...` → `41001`
- **Programa:** `0001 - NOME...` → `0001`
- **Função:** `04 - NOME...` → `04`
- **Natureza da Despesa/Elemento:** `3.3.90.39.00` → `3.3.90.39.00`

**Preservação do Nome Completo:**
Mantém o **nome mais longo encontrado** entre os três arquivos (empenhados, liquidados, pagos) para exibição na tabela.

**Aplicação:**
- ✅ **Análise Vertical** (consolidação por ano)
- ✅ **Análise Horizontal** (comparação entre anos)

### Solução 2: Busca Inteligente de Colunas (Problema de Pagos Zerados)

**Função `getValor(item, ...campos)` melhorada**
Implementada busca **case-insensitive** e **normalizada** que:

1. **Ignora diferenças de capitalização:** `Unidade orçamentária` = `Unidade Orçamentária`
2. **Remove acentos:** ç, Ç, ã, Ã são tratados como iguais
3. **Normaliza espaços:** espaços múltiplos são reduzidos a um

**Comportamento:**
- Primeiro tenta busca exata (performance)
- Se não encontrar, faz busca normalizada (robustez)

Isso garante que a coluna seja encontrada mesmo com inconsistências nos arquivos de origem.

## Arquivos Modificados

- `despesas-analise.html` (linhas ~483-850)

## Como Testar

1. Abra o sistema: `INICIAR-SISTEMA.bat`
2. Navegue até: **Análises > Análise Financeira**
3. Selecione:
   - **Tipo de Análise:** Análise Vertical
   - **Exercício:** 2024 ou 2025
   - **Agrupar por:** Unidade Orçamentária
4. Clique em **Atualizar**

### Resultado Esperado

Agora a unidade `41001 - AUTARQUIA DE URBANIZAÇÃO E MEIO AMBIENTE DE CARUARU` deve aparecer em **uma única linha** com todos os valores consolidados **incluindo Pagos**:

```
41001 - AUTARQUIA DE URBANIZAÇÃO...  | Empenhado | Liquidado | Pago
                                     | 7.244.946 | 6.569.875 | X.XXX.XXX
```

Antes da correção:
- ❌ Linha 1: Empenhado preenchido, Liquidado e Pago zerados
- ❌ Linha 2: Empenhado zerado, Liquidado preenchido, Pago zerado
- ❌ Total incorreto por falta de consolidação

Depois da correção:
- ✅ Linha única com todos os valores consolidados corretamente

## Campos Beneficiados

A correção beneficia todos os campos com códigos:
- ✅ Unidade orçamentária
- ✅ Programa
- ✅ Função
- ✅ Subfunção
- ✅ Ação
- ✅ Natureza da Despesa
- ✅ Elemento
- ✅ Despesa

## Notas Técnicas

### Inconsistências nos Arquivos de Origem

Durante a análise, foram identificadas as seguintes inconsistências nos arquivos processados:

| Arquivo | Coluna "Unidade orçamentária" |
|---------|------------------------------|
| V2_Emp__Emitidos_2024_2025.xlsx | `Unidade orçamentária` (ç minúsculo) |
| V2_Emp__Liquidados_2024_2025.xlsx | `Unidade orçamentária` (ç minúsculo) |
| V2_Emp__Pagos_2024_2025.xlsx | `Unidade Orçamentária` (Ç MAIÚSCULO) ⚠️ |

**Recomendação:** Padronizar o nome da coluna em todos os scripts de transformação para evitar problemas futuros. A solução implementada em `getValor()` é robusta e funciona independente da padronização, mas a padronização nos scripts de origem melhoraria a manutenibilidade do código.

## Data da Correção
2026-02-16
