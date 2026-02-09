# SEFAZ Caruaru - Sistema de Gestão Financeira

Sistema web para consulta e análise de dados financeiros do município de Caruaru.

## Início Rápido

### Requisitos
- Navegador web moderno (Chrome, Edge, Firefox)
- Servidor web local (pode usar `npx serve` ou similar)

### Executar o Sistema

1. Abra um terminal na pasta do projeto
2. Execute: `npx serve`
3. Acesse: `http://localhost:3000`

### Primeiro Acesso

1. Acesse **Banco de Dados → Importar Dados**
2. Selecione **Importar Despesas** ou **Importar Receitas**
3. Envie seu arquivo Excel
4. Confirme a importação
5. Acesse as páginas de consulta no menu lateral

## Funcionalidades

### Consulta de Dados
- **Despesas**: Empenhados, Liquidados, Pagos, A Pagar, Retidos
- **Receitas**: Empenhados, Liquidados, Pagos, A Pagar, Retidos
- **Gerencial**: Dashboard com visão consolidada
- **Comparativos**: Análise entre exercícios (anos)

### Recursos
- Filtros avançados por múltiplos critérios
- Ordenação clicável nas colunas
- Gráficos interativos (Chart.js)
- Exportação em PDF e Excel
- Agrupamento dinâmico de dados
- Paginação configurável
- Autocomplete em campos de texto

### Armazenamento
- IndexedDB (banco de dados local do navegador)
- Suporta grandes volumes de dados
- Dados persistem entre sessões

## Estrutura do Projeto

```
├── css/                          # Estilos
│   └── portal-transparencia.css
├── js/                           # Scripts
│   ├── portal-transparencia.js   # Scripts globais
│   ├── indexeddb-utils.js        # Utilitários do banco
│   └── exportar-dados.js         # Funções de exportação
├── despesas-*.html               # Páginas de despesas
├── receitas-*.html               # Páginas de receitas
├── banco-importar-dados.html     # Importação de dados
├── template-portal-transparencia.html  # Template base
├── DOCUMENTACAO.md               # Documentação completa
├── GUIA_IMPORTAR_DADOS.txt       # Guia de importação
└── README.md                     # Este arquivo
```

## Tecnologias

- HTML5, CSS3, JavaScript (ES6+)
- IndexedDB para armazenamento
- Chart.js para gráficos
- SheetJS para leitura/escrita de Excel
- jsPDF para geração de PDF
- Font Awesome para ícones

## Documentação

- **DOCUMENTACAO.md** - Documentação completa do sistema
- **GUIA_IMPORTAR_DADOS.txt** - Guia rápido de importação

## Formato de Arquivo Excel

O sistema aceita arquivos Excel com múltiplas abas:

| Nome da Aba | Tipo de Dado |
|-------------|--------------|
| Empenhados | Empenhos |
| Liquidados | Liquidações |
| Pagos | Pagamentos |
| A Pagar | Pendências |
| Retidos | Retenções |

## Suporte

Prefeitura Municipal de Caruaru
Secretaria da Fazenda - SEFAZ

---

© 2026 Prefeitura Municipal de Caruaru - Todos os direitos reservados.
