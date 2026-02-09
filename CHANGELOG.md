# Changelog - SEFAZ Caruaru

Todas as alterações notáveis do projeto estão documentadas neste arquivo.

---

## [2.0.0] - Fevereiro 2026

### Adicionado
- **Ordenação por coluna**: Clique no cabeçalho para ordenar ascendente/descendente
- **Top 30 nos gráficos**: Expandido de Top 10 para Top 30
- **Seletor de agrupamento nos gráficos**: Escolha entre Unidade Orçamentária, Fonte de Recursos, Credor/Fornecedor, Espécie, Tipo, Função
- **Tooltips nos KPIs**: Valor completo exibido ao passar o mouse
- **Data/hora de atualização dinâmica**: Exibe data, hora e segundos atuais

### Alterado
- **Formato de data**: Datas agora exibidas como DD/MM/AAAA (antes: YYYY-MM-DD HH:MM:SS)
- **Página de Importação simplificada**: Removidos passos e seção "Como Funciona"
- **Apenas 2 opções de importação**: Despesas e Receitas (removidas opções individuais)

### Removido
- Gráfico "Distribuição por Espécie" das páginas individuais
- Indicador de passos (1,2,3,4) na importação
- Seção "Baixar Modelo" na importação
- Seção "Como Funciona?" na importação
- Botões CSV e Imprimir (mantidos apenas PDF e Excel)
- Menções a "Portal da Transparência"
- "Exercício 2026" dos subtítulos das páginas

---

## [1.9.0] - Fevereiro 2026

### Adicionado
- **Exportação PDF direta**: Download automático sem janela de impressão
- **Exportação por aba**: Resumo exporta dados agrupados, Detalhado exporta todos
- **jsPDF e jspdf-autotable**: Bibliotecas para geração de PDF

### Alterado
- PDF agora inclui TODOS os registros (sem limite)
- Rodapé do PDF atualizado para "SEFAZ - Prefeitura Municipal de Caruaru"

---

## [1.8.0] - Fevereiro 2026

### Adicionado
- **Página Comparativos**: Comparação entre exercícios (anos)
- **Gráficos nas páginas individuais**: Chart.js em Empenhados, Liquidados, Pagos, etc.
- **Seletor de tipo no Detalhado**: Escolha entre Empenhados, Liquidados, etc.

### Alterado
- Layout do Comparativos redesenhado
- Tabs Gráfico/Resumo/Detalhado acima dos filtros

---

## [1.7.0] - Fevereiro 2026

### Adicionado
- **Página Gerencial**: Dashboard com KPIs e gráficos consolidados
- **Autocomplete no Credor/Fornecedor**: Sugestões dinâmicas ao digitar

### Alterado
- Autocomplete limitado a 15 sugestões
- Sugestões aparecem após 2 caracteres

---

## [1.6.0] - Fevereiro 2026

### Adicionado
- **Paginação no Detalhado**: 25, 50, 100, 250 registros por página
- **Formatação compacta de valores**: "mi", "bi", "mil" para valores grandes

### Corrigido
- Overflow de valores nos cards KPI
- CSS responsivo para cards de estatísticas

---

## [1.5.0] - Fevereiro 2026

### Adicionado
- **Aba Resumo com agrupamento**: Agrupa por coluna selecionável
- **Filtro de Exercício (Ano)**: Filtra dados por ano fiscal

### Alterado
- Resumo mostra quantidade, valor total e porcentagem por grupo

---

## [1.4.0] - Fevereiro 2026

### Adicionado
- **IndexedDB**: Migração de localStorage para IndexedDB
- **Arquivo js/indexeddb-utils.js**: Utilitários para operações no banco

### Corrigido
- Erro "QuotaExceededError" ao importar arquivos grandes
- Suporte a 100.000+ registros

---

## [1.3.0] - Fevereiro 2026

### Adicionado
- **Importação automática de múltiplas abas**: Um arquivo para todas as despesas
- **Identificação automática de abas**: Por nome (empenhados, liquidados, etc.)

### Alterado
- Filtros atualizados com campos corretos da planilha do usuário

---

## [1.2.0] - Fevereiro 2026

### Adicionado
- **Filtros funcionais**: Buscar e Limpar implementados
- **Carregamento dinâmico de dados**: Dados do IndexedDB nas tabelas

### Corrigido
- Botão "Confirmar Importação" não funcionava
- Link "Importar Dados" não aparecia no menu

---

## [1.1.0] - Fevereiro 2026

### Adicionado
- **Página de Importação de Dados**: banco-importar-dados.html
- **SheetJS (xlsx)**: Leitura de arquivos Excel no navegador
- **Menu Banco de Dados**: Link para importação

---

## [1.0.0] - Fevereiro 2026

### Adicionado
- Estrutura inicial do projeto
- Template base (template-portal-transparencia.html)
- Páginas de Despesas (5 tipos)
- Páginas de Receitas (5 tipos)
- CSS centralizado (portal-transparencia.css)
- JS centralizado (portal-transparencia.js)
- Menu lateral com navegação
- Backup do projeto

---

## Legenda

- **Adicionado**: Novas funcionalidades
- **Alterado**: Mudanças em funcionalidades existentes
- **Corrigido**: Correções de bugs
- **Removido**: Funcionalidades removidas
- **Segurança**: Correções de vulnerabilidades

---

*Mantido por: SEFAZ - Prefeitura Municipal de Caruaru*
