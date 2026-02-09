# SEFAZ Caruaru - Sistema de Gestão Financeira

## Documentação Completa

---

## 1. Visão Geral

O **SEFAZ Caruaru** é um sistema web para consulta e análise de dados financeiros do município de Caruaru. O sistema permite visualizar, filtrar, analisar e exportar informações de **Despesas** e **Receitas** municipais.

### Principais Funcionalidades

- Importação de dados via planilhas Excel
- Visualização detalhada de despesas e receitas
- Filtros avançados por múltiplos critérios
- Gráficos interativos e dashboards gerenciais
- Comparativos entre exercícios (anos)
- Exportação de dados em PDF e Excel
- Ordenação de dados por qualquer coluna
- Agrupamento e resumo de informações

---

## 2. Estrutura de Arquivos

```
Caruaru Sistema/
│
├── css/
│   └── portal-transparencia.css    # Estilos globais do sistema
│
├── js/
│   ├── portal-transparencia.js     # Scripts globais (menu, navegação)
│   ├── indexeddb-utils.js          # Utilitários do banco de dados IndexedDB
│   └── exportar-dados.js           # Funções de exportação (PDF, Excel)
│
├── Páginas de Despesas/
│   ├── despesas-empenhados.html    # Despesas Empenhadas
│   ├── despesas-liquidados.html    # Despesas Liquidadas
│   ├── despesas-pagos.html         # Despesas Pagas
│   ├── despesas-a-pagar.html       # Despesas A Pagar
│   ├── despesas-retidos.html       # Retenções (INSS, ISS, IRRF)
│   ├── despesas-gerencial.html     # Dashboard Gerencial
│   └── despesas-comparativos.html  # Comparativo entre Exercícios
│
├── Páginas de Receitas/
│   ├── receitas-empenhados.html    # Receitas Empenhadas
│   ├── receitas-liquidados.html    # Receitas Liquidadas
│   ├── receitas-pagos.html         # Receitas Pagas
│   ├── receitas-a-pagar.html       # Receitas A Pagar
│   ├── receitas-retidos.html       # Receitas Retidas
│   └── receitas-gerencial.html     # Dashboard Gerencial Receitas
│
├── Banco de Dados/
│   └── banco-importar-dados.html   # Página de importação de dados
│
├── template-portal-transparencia.html  # Template base do sistema
│
└── Documentação/
    ├── DOCUMENTACAO.md             # Este arquivo
    └── GUIA_IMPORTAR_DADOS.txt     # Guia rápido de importação
```

---

## 3. Banco de Dados

### Tecnologia Utilizada: IndexedDB

O sistema utiliza **IndexedDB**, um banco de dados client-side (no navegador) que permite armazenar grandes volumes de dados localmente.

#### Vantagens:
- Suporta milhões de registros
- Dados persistem mesmo após fechar o navegador
- Não requer servidor de banco de dados
- Rápido para operações de leitura

#### Limitações:
- Dados ficam apenas no navegador do usuário
- Cada navegador/computador tem seus próprios dados
- Limpar dados do navegador remove os dados importados

### Estrutura do Banco

O IndexedDB possui os seguintes "stores" (tabelas):

| Store | Descrição |
|-------|-----------|
| `despesas-empenhados` | Empenhos de despesas |
| `despesas-liquidados` | Liquidações de despesas |
| `despesas-pagos` | Pagamentos efetuados |
| `despesas-a-pagar` | Despesas pendentes de pagamento |
| `despesas-retidos` | Retenções tributárias |

---

## 4. Importação de Dados

### Acesso
Menu lateral → **Banco de Dados** → **Importar Dados**

### Processo de Importação

1. **Selecione o tipo**: Clique em "Importar Despesas" ou "Importar Receitas"
2. **Envie o arquivo**: Arraste ou selecione o arquivo Excel (.xlsx)
3. **Confira a pré-visualização**: Verifique se os dados estão corretos
4. **Confirme**: Clique em "Confirmar Importação"

### Formato do Arquivo Excel

O sistema aceita arquivos Excel com **múltiplas abas**. Cada aba deve ter um nome que identifique o tipo de dado:

| Nome da Aba (contém) | Tipo de Dado |
|---------------------|--------------|
| "empenhad" | Despesas Empenhadas |
| "liquidad" | Despesas Liquidadas |
| "pago" ou "pagamento" | Despesas Pagas |
| "a pagar" ou "pagar" | Despesas A Pagar |
| "retid" ou "retenç" ou "retenção" | Retenções |

### Colunas Esperadas

#### Despesas Empenhadas
| Coluna | Descrição |
|--------|-----------|
| Nr emp. | Número do empenho |
| Data | Data do empenho |
| Credor/Fornecedor | Nome do credor |
| Espécie | Tipo de empenho (Ordinário, Global, Estimativa) |
| Unidade orçamentária | Secretaria/Órgão |
| Despesa | Classificação da despesa |
| Fonte de recursos | Origem do recurso |
| Tipo | Tipo de despesa |
| Função | Função de governo |
| Valor (R$) | Valor empenhado |

#### Despesas Liquidadas
| Coluna | Descrição |
|--------|-----------|
| Seq. liq. | Sequência da liquidação |
| Data | Data da liquidação |
| Nr emp. | Número do empenho vinculado |
| Credor/Fornecedor | Nome do credor |
| Unidade orçamentária | Secretaria/Órgão |
| Função | Função de governo |
| Tipo | Tipo de despesa |
| Valor (R$) | Valor liquidado |
| TOTAL (retenções) | Total de retenções |

#### Despesas Pagas
| Coluna | Descrição |
|--------|-----------|
| Nr Emp. | Número do empenho |
| Seq. Liq. | Sequência da liquidação |
| Data | Data do pagamento |
| Credor/Fornecedor | Nome do credor |
| Unidade Orçamentária | Secretaria/Órgão |
| Função | Função de governo |
| Tipo | Tipo de despesa |
| Valor (R$) | Valor pago |

#### Retenções
| Coluna | Descrição |
|--------|-----------|
| Sequência | Número sequencial |
| Data | Data da retenção |
| Nr emp. | Número do empenho |
| Credor/Fornecedor | Nome do credor |
| CNPJ | CNPJ do credor |
| Retenção | Tipo de retenção (INSS, ISS, IRRF) |
| Função | Função de governo |
| Tipo | Tipo |
| Valor retido | Valor da retenção |

### Comportamento da Importação

- **Substituição**: Ao importar novos dados, os dados anteriores do mesmo tipo são **substituídos**
- **Múltiplas abas**: Um único arquivo pode conter todas as categorias de despesas

---

## 5. Páginas de Consulta

### Estrutura das Páginas de Despesas

Cada página de despesas possui **3 abas**:

#### Aba "Resumo"
- Agrupa os dados por uma coluna selecionável
- Mostra quantidade de registros e valor total por grupo
- Porcentagem em relação ao total
- Barra de progresso visual

**Colunas de agrupamento disponíveis:**
- Unidade Orçamentária
- Fonte de Recursos
- Credor/Fornecedor
- Espécie
- Tipo
- Função

#### Aba "Detalhado"
- Lista todos os registros individualmente
- **Ordenação**: Clique no cabeçalho de qualquer coluna para ordenar
- **Paginação**: 25, 50, 100 ou 250 registros por página
- Total da página exibido no rodapé

#### Aba "Gráfico"
- **Top 30**: Gráfico de barras horizontal com os maiores valores
- **Evolução Mensal**: Gráfico de linha com a evolução ao longo dos meses
- **Seletor de agrupamento**: Escolha como agrupar os dados no gráfico

### Filtros Disponíveis

| Filtro | Descrição |
|--------|-----------|
| Exercício (Ano) | Filtra por ano fiscal |
| Número | Busca por número do empenho/liquidação |
| Credor/Fornecedor | Busca por nome (com autocomplete) |
| Espécie | Ordinário, Global, Estimativa |
| Tipo | Tipo de despesa |
| Unidade Orçamentária | Secretaria/Órgão |
| Fonte de Recursos | Origem do recurso |
| Data Início/Fim | Período de datas |

### Formato de Data

As datas são exibidas no formato brasileiro: **DD/MM/AAAA** (ex: 05/02/2026)

---

## 6. Dashboard Gerencial

### Acesso
Menu lateral → **Despesas** → **Gerencial**

### Conteúdo

O dashboard gerencial apresenta uma visão consolidada com:

- **KPIs Principais**: Total geral, quantidade de registros, médias
- **Top 10 Credores**: Maiores fornecedores por valor
- **Distribuição por Unidade**: Gráfico de pizza por secretaria
- **Evolução Temporal**: Linha do tempo de gastos
- **Comparativo por Tipo**: Análise por categoria de despesa

---

## 7. Página Comparativa

### Acesso
Menu lateral → **Despesas** → **Comparativos**

### Funcionalidade

Permite comparar dados entre dois exercícios (anos) diferentes:

1. **Selecione o Ano Base**: Ex: 2024
2. **Selecione o Ano de Comparação**: Ex: 2025
3. **Aplique filtros adicionais**: Unidade, Credor, Espécie, etc.

### Abas da Página Comparativa

#### Aba "Gráfico"
- Gráfico de barras comparando os dois anos
- Cards com variação percentual
- Indicadores de crescimento/redução

#### Aba "Resumo"
- Tabela comparativa agrupada
- Valor do ano base vs. ano de comparação
- Variação percentual por grupo

#### Aba "Detalhado"
- Lista completa de registros
- **Seletor de tipo**: Escolha entre Empenhados, Liquidados, Pagos, A Pagar ou Retidos
- Ordenação e paginação

---

## 8. Exportação de Dados

### Formatos Disponíveis

| Formato | Descrição |
|---------|-----------|
| **PDF** | Documento formatado para impressão/arquivamento |
| **Excel** | Planilha .xlsx editável |

### Como Exportar

1. Acesse qualquer página de consulta
2. Aplique os filtros desejados
3. Selecione a aba (Resumo ou Detalhado)
4. Clique no botão **PDF** ou **Excel**

### Comportamento

- **Aba Resumo ativa**: Exporta dados agrupados
- **Aba Detalhado ativa**: Exporta todos os registros filtrados

### Características do PDF

- Inclui cabeçalho com título e data
- Tabela formatada com cores alternadas
- Rodapé com número de páginas
- **Sem limite** de registros
- Download automático do arquivo

---

## 9. KPIs e Valores

### Formatação de Valores Monetários

Valores grandes são abreviados para melhor visualização:

| Valor Original | Exibição |
|----------------|----------|
| R$ 1.500,00 | R$ 1,5 mil |
| R$ 2.500.000,00 | R$ 2,5 mi |
| R$ 3.500.000.000,00 | R$ 3,5 bi |

### Tooltip (Valor Completo)

Ao passar o mouse sobre um KPI abreviado, o valor completo é exibido.

---

## 10. Ordenação de Dados

### Como Ordenar

Na aba "Detalhado", clique no cabeçalho de qualquer coluna:

- **1º clique**: Ordem crescente (A→Z, menor→maior) ↑
- **2º clique**: Ordem decrescente (Z→A, maior→menor) ↓

### Ícones de Ordenação

| Ícone | Significado |
|-------|-------------|
| ↕ | Coluna não ordenada |
| ↑ | Ordenação crescente |
| ↓ | Ordenação decrescente |

### Tipos de Ordenação

- **Texto**: Alfabética (A-Z)
- **Números**: Numérica (0-9)
- **Datas**: Cronológica (mais antiga → mais recente)
- **Valores**: Monetária (menor → maior)

---

## 11. Autocomplete (Sugestões)

### Campo "Credor/Fornecedor"

Ao digitar no campo de filtro "Credor/Fornecedor":

1. Digite pelo menos **2 caracteres**
2. Uma lista de sugestões aparece automaticamente
3. Selecione uma opção ou continue digitando
4. Máximo de **15 sugestões** exibidas

---

## 12. Requisitos Técnicos

### Navegadores Compatíveis

- Google Chrome (recomendado)
- Microsoft Edge
- Mozilla Firefox
- Safari

### Requisitos Mínimos

- Navegador atualizado (versão recente)
- JavaScript habilitado
- Conexão com internet (para carregar bibliotecas externas)

### Bibliotecas Utilizadas

| Biblioteca | Versão | Função |
|------------|--------|--------|
| Chart.js | 4.4.1 | Gráficos interativos |
| SheetJS (xlsx) | 0.18.5 | Leitura/escrita de Excel |
| jsPDF | 2.5.1 | Geração de PDF |
| jspdf-autotable | 3.5.31 | Tabelas em PDF |
| Font Awesome | 6.4.0 | Ícones |
| Google Fonts (Inter) | - | Tipografia |

---

## 13. Solução de Problemas

### Dados não aparecem após importação

1. Verifique se selecionou o tipo correto (Despesas/Receitas)
2. Confirme se clicou em "Confirmar Importação"
3. Verifique se as abas do Excel têm nomes reconhecíveis
4. Atualize a página (F5)

### Erro ao importar arquivo grande

- O sistema suporta arquivos grandes via IndexedDB
- Se persistir, tente dividir o arquivo em partes menores

### Filtros não funcionam

1. Verifique se há dados importados
2. Clique em "Buscar" após preencher os filtros
3. Use "Limpar" para resetar os filtros

### Gráficos não aparecem

1. Verifique se há dados no período selecionado
2. Tente mudar o agrupamento
3. Atualize a página

### PDF não é gerado

1. Verifique se há dados na tabela
2. Permita pop-ups no navegador
3. Verifique se o bloqueador de downloads está ativo

---

## 14. Backup dos Dados

### Importante

Os dados ficam armazenados **localmente no navegador**. Para fazer backup:

1. Exporte os dados em Excel regularmente
2. Mantenha os arquivos Excel originais
3. Ao trocar de computador/navegador, reimporte os dados

### Limpar Dados do Navegador

Se você limpar os dados de navegação (cookies, cache, etc.), os dados importados serão **perdidos**. Sempre mantenha backup dos arquivos Excel originais.

---

## 15. Atualizações e Manutenção

### Data de Atualização

Cada página exibe a data e hora da última atualização dos dados:

```
Atualizado em 05/02/2026 às 14:30:45
```

Essa informação é atualizada sempre que os filtros são aplicados ou a página é carregada.

---

## 16. Contato e Suporte

**Prefeitura Municipal de Caruaru**
Secretaria da Fazenda - SEFAZ

© 2026 - Todos os direitos reservados.

---

*Documentação atualizada em: Fevereiro de 2026*
