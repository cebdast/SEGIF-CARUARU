# Feature: Seletor de Métricas na Análise Financeira

## Descrição da Melhoria

Adicionado um **seletor de métrica** que permite ao usuário escolher entre **Empenhado**, **Liquidado** ou **Pago** tanto na análise vertical quanto na horizontal.

## Modificações Implementadas

### 1. Interface do Usuário

**Novo Filtro Adicionado:**
```html
<select id="metricaAnalise">
  <option value="empenhado">Empenhado</option>
  <option value="liquidado">Liquidado</option>
  <option value="pago">Pago</option>
</select>
```

**Localização:** Entre o seletor de agrupamento e o botão "Atualizar"

### 2. Análise Vertical

**Antes:**
- Gráfico de pizza: sempre mostravam composição de **Empenhado**
- % Vertical: sempre calculado sobre **Empenhado**
- Ordenação: sempre por **Empenhado**

**Depois:**
- ✅ Gráfico de pizza adapta-se à métrica selecionada
- ✅ % Vertical calculado sobre a métrica selecionada
- ✅ Ordenação pela métrica selecionada
- ✅ Título do gráfico atualiza dinamicamente:
  - "Composição da Despesa **Empenhada**" (quando Empenhado)
  - "Composição da Despesa **Liquidada**" (quando Liquidado)
  - "Composição da Despesa **Paga**" (quando Pago)

### 3. Análise Horizontal

**Antes:**
- Gráfico de barras: sempre mostrava **Liquidado**
- Colunas da tabela: sempre **Liquidado**
- Variações: sempre calculadas sobre **Liquidado**

**Depois:**
- ✅ Gráfico de barras adapta-se à métrica selecionada
- ✅ Colunas da tabela mostram a métrica selecionada
- ✅ Variações calculadas sobre a métrica selecionada
- ✅ Título do gráfico atualiza dinamicamente:
  - "Despesa **Empenhada** no Exercício" (quando Empenhado)
  - "Despesa **Liquidada** no Exercício" (quando Liquidado)
  - "Despesa **Paga** no Exercício" (quando Pago)
- ✅ Cabeçalho da tabela atualiza:
  - "**Empenhado** (2024)" ou
  - "**Liquidado** (2024)" ou
  - "**Pago** (2024)"

## Funções Modificadas

### Análise Vertical
1. **`renderizarAnaliseVertical()`**
   - Obtém métrica selecionada
   - Calcula percentual sobre a métrica escolhida
   - Ordena por métrica escolhida
   - Passa métrica para o gráfico

2. **`renderizarGraficoPizza()`**
   - Recebe parâmetro `metrica`
   - Usa `d[metrica]` ao invés de `d.empenhado` fixo
   - Atualiza título dinamicamente

### Análise Horizontal
1. **`renderizarAnaliseHorizontal()`**
   - Obtém métrica selecionada
   - Prepara dados usando `item[${metrica}_${ano}]`
   - Calcula variações sobre a métrica escolhida
   - Atualiza cabeçalho com nome da métrica
   - Renderiza linhas com a métrica
   - Calcula totais sobre a métrica
   - Passa métrica para o gráfico

2. **`renderizarGraficoEvolucao()`**
   - Recebe parâmetro `metrica`
   - Calcula totais usando `item[metrica]`
   - Atualiza título do gráfico e label do dataset

## Como Usar

### Análise Vertical
1. Selecione **Análise Vertical**
2. Escolha um **Exercício** (ex: 2025)
3. Escolha **Agrupar por** (ex: Unidade Orçamentária)
4. **NOVO:** Escolha **Métrica** (Empenhado, Liquidado ou Pago)
5. Clique em **Atualizar**

**Resultado:**
- Gráfico pizza mostra composição da métrica escolhida
- Tabela ordenada pela métrica escolhida
- % Vertical calculado sobre a métrica escolhida

### Análise Horizontal
1. Selecione **Análise Horizontal**
2. Escolha os **Anos** (mínimo 2)
3. Escolha **Agrupar por** (ex: Programa)
4. **NOVO:** Escolha **Métrica** (Empenhado, Liquidado ou Pago)
5. Clique em **Atualizar**

**Resultado:**
- Gráfico de barras mostra evolução da métrica escolhida
- Tabela mostra valores da métrica por ano
- Variações calculadas sobre a métrica escolhida

## Exemplo Prático

**Cenário:** Analisar a evolução dos **Pagos** por Unidade Orçamentária entre 2023-2025

**Passos:**
1. Tipo de Análise: **Horizontal**
2. Anos: Selecionar **2023, 2024, 2025**
3. Agrupar por: **Unidade Orçamentária**
4. **Métrica: Pago** ← NOVO!
5. Atualizar

**Resultado:**
- Gráfico mostra "Despesa **Paga** no Exercício"
- Tabela com colunas "**Pago** (2023)", "**Pago** (2024)", "**Pago** (2025)"
- Variações percentuais de Pago entre os anos

## Benefícios

1. ✅ **Flexibilidade:** Analise qualquer métrica sem limitação
2. ✅ **Comparabilidade:** Compare empenhado vs liquidado vs pago
3. ✅ **Transparência:** Veja a real execução orçamentária
4. ✅ **Insights:** Identifique gargalos entre empenho e pagamento

## Arquivo Modificado

- `despesas-analise.html` (linhas 313-1090)

## Data da Implementação
2026-02-16
