# Feature: Reimportação Seletiva por Ano

## Descrição

Permite reimportar apenas anos específicos sem precisar reimportar todos os anos novamente. Útil quando você já tem 2024 importado e quer atualizar apenas 2025.

## Como Funciona

### 1. Detecção Automática de Anos

Quando você seleciona uma pasta com arquivos organizados por subpastas de anos:

```
Pipeline V2/
├── 2024/
│   ├── Emitidos_2024.xlsx
│   ├── Liquidados_2024.xlsx
│   └── ...
└── 2025/
    ├── Emitidos_2025.xlsx
    ├── Liquidados_2025.xlsx
    └── ...
```

O sistema detecta automaticamente os anos disponíveis (2024 e 2025).

### 2. Seleção de Anos para Importar

Após a detecção, aparece uma interface com **checkboxes** para cada ano:

```
📅 Selecione os anos para importar/reimportar:
☑ 2024
☑ 2025

💡 Desmarque anos que já estão importados e não precisam ser atualizados
```

**Por padrão, todos os anos estão marcados.**

### 3. Reimportação Seletiva

Quando você **desmarca um ano** (ex: 2024) e deixa outro marcado (ex: 2025):

1. ✅ Sistema processa normalmente os anos selecionados (2025)
2. 📦 **Antes de salvar**, o sistema:
   - Lê os dados existentes no banco
   - **Preserva** todos os registros de anos não selecionados (2024)
   - **Substitui** apenas os registros dos anos selecionados (2025)
3. 💾 Salva tudo de volta no IndexedDB

## Como Usar

### Cenário 1: Primeira Importação (2024 + 2025)
1. Selecione a pasta com anos 2024 e 2025
2. Deixe **ambos** marcados ☑ 2024 ☑ 2025
3. Clique em **Processar Pipeline V2**
4. ✅ Ambos os anos serão importados

### Cenário 2: Reimportar Apenas 2025 (preservar 2024)
1. Selecione a mesma pasta com anos 2024 e 2025
2. **Desmarque** 2024: ☐ 2024
3. Deixe marcado: ☑ 2025
4. Clique em **Processar Pipeline V2**
5. ✅ 2025 será reimportado
6. 📦 2024 permanecerá intocado no banco

### Cenário 3: Reimportar Ambos (sobrescrever tudo)
1. Selecione a pasta
2. Deixe **ambos marcados** ☑ 2024 ☑ 2025
3. Clique em **Processar Pipeline V2**
4. ✅ Ambos serão reimportados (substitui dados anteriores)

## Mensagens e Logs

### Durante o Processamento

Se você selecionou apenas alguns anos, o sistema mostra:

```
=== Iniciando Pipeline V2 ===
🔄 REIMPORTAÇÃO SELETIVA:
   ✅ Importando: 2025
   📦 Preservando: 2024
```

### Ao Salvar no Banco

Para cada store (empenhados, liquidados, etc.):

```
Salvando 250000 registros em despesas-empenhados...
Reimportação seletiva: preservando dados de anos não selecionados...
Dados existentes em despesas-empenhados: 500000 registros
Preservando 250000 registros de outros anos
Importando 250000 registros de anos selecionados: 2025
500000 registros salvos em despesas-empenhados (250000 preservados + 250000 novos)
```

### Ao Concluir

```
=== Pipeline concluído em 25.3s! ===
Total: 250000 registros importados. (2025)

🔄 Anos preservados: 2024
```

**Alert final:**
```
IMPORTAÇÃO VIA PIPELINE V2 CONCLUÍDA!

250.000 registros importados (2025):

✓ Despesas empenhados: 85.000 registros
✓ Despesas liquidados: 82.000 registros
✓ Despesas pagos: 83.000 registros

🔄 Reimportação seletiva:
✅ Importados: 2025
📦 Preservados: 2024

Agora você pode acessar as páginas de despesas para visualizar os dados.
```

## Detalhes Técnicos

### 1. Identificação do Campo "Exercício"

O sistema busca o campo de exercício com duas variações:
- `Exercício` (com acento)
- `Exercicio` (sem acento)

### 2. Preservação de Dados

```javascript
// Filtra dados existentes: mantém apenas anos NÃO selecionados
mantidosDeOutrosAnos = dadosExistentes.filter(function(registro) {
  var exercicio = String(registro['Exercício'] || registro['Exercicio'] || '');
  return !anosParaReimportar.includes(exercicio);
});

// Combina dados mantidos + dados novos
dadosFinais = mantidosDeOutrosAnos.concat(dadosNovos);
```

### 3. Stores Afetados

A reimportação seletiva funciona em **todos** os stores de despesas:
- ✅ despesas-empenhados
- ✅ despesas-liquidados
- ✅ despesas-pagos
- ✅ despesas-retidos
- ✅ despesas-a-pagar

## Benefícios

1. ⚡ **Economia de Tempo**: Não precisa reprocessar anos que não mudaram
2. 💾 **Economia de Processamento**: Menos dados para transformar e cruzar
3. 🔒 **Segurança**: Dados de anos não selecionados permanecem intactos
4. 🎯 **Precisão**: Atualiza apenas o que realmente precisa

## Exemplo Prático

**Situação:**
- Você importou 2024 em janeiro
- Agora é fevereiro e você quer importar apenas 2025
- Você tem os arquivos de 2024 e 2025 na pasta

**Antes desta feature:**
1. Tinha que importar 2024 + 2025 novamente
2. Processamento demorava ~50 segundos
3. 2024 seria reprocessado desnecessariamente

**Com esta feature:**
1. Desmarque 2024, deixe apenas 2025 marcado
2. Processamento demora ~25 segundos (metade do tempo!)
3. 2024 permanece intocado no banco

## Validações

### Nenhum Ano Selecionado
Se você desmarcar todos os anos:
```
❌ Alert: "Selecione pelo menos um ano para importar!"
```

### Ano Único (sem estrutura de pastas por ano)
Se os arquivos não estão organizados por pastas de ano:
- A seleção de anos não aparece
- Funciona como antes (importa tudo)

## Compatibilidade

✅ Compatível com importação de "arquivos processados" (não usa seleção de anos)
✅ Compatível com importação de ano único (sem pastas)
✅ Não afeta outras funcionalidades do sistema

## Arquivo Modificado

- [banco-importar-dados.html](banco-importar-dados.html)
  - Linhas 1959-1961: Variável `anosReimportar`
  - Linhas 1997-2010: Função `atualizarAnosReimportar()`
  - Linhas 2021-2045: UI de seleção de anos com checkboxes
  - Linhas 583-641: Função `salvarDadosDB()` com preservação seletiva
  - Linhas 2344-2370: Validação e logs de reimportação seletiva
  - Linha 2410: Passagem de `anosReimportar` para `salvarDadosDB()`
  - Linhas 2448-2465: Mensagens finais com info de preservação

## Data da Implementação
2026-02-16
