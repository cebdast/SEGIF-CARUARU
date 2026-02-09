# Documentação Técnica - SEFAZ Caruaru

## Guia para Desenvolvedores

---

## 1. Arquitetura do Sistema

### Visão Geral

O sistema é uma **aplicação web client-side** (Single Page Application estática) que roda inteiramente no navegador do usuário. Não há backend ou servidor de aplicação.

```
┌─────────────────────────────────────────────────────────┐
│                    NAVEGADOR                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │    HTML     │  │     CSS     │  │   JavaScript    │ │
│  │   Páginas   │  │   Estilos   │  │    Lógica       │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│                          │                              │
│                          ▼                              │
│              ┌─────────────────────┐                   │
│              │     IndexedDB       │                   │
│              │  (Banco de Dados)   │                   │
│              └─────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

1. **Importação**: Excel → SheetJS → JavaScript → IndexedDB
2. **Consulta**: IndexedDB → JavaScript → DOM (tabelas, gráficos)
3. **Exportação**: JavaScript → SheetJS/jsPDF → Download

---

## 2. Estrutura de Arquivos

### CSS

```
css/portal-transparencia.css
```
Contém todos os estilos do sistema:
- Variáveis CSS (cores, fontes)
- Layout (sidebar, header, content)
- Componentes (cards, buttons, tables)
- Responsividade

### JavaScript

```
js/portal-transparencia.js    # Funções globais (menu, sidebar)
js/indexeddb-utils.js         # API do IndexedDB
js/exportar-dados.js          # Exportação PDF/Excel
```

### Páginas HTML

Cada página HTML é independente e inclui:
- Links para CSS e JS externos
- Estrutura HTML completa
- JavaScript inline específico da página

---

## 3. IndexedDB - Banco de Dados

### Configuração

```javascript
// js/indexeddb-utils.js

const DB_NAME = 'SefazCaruaruDB';
const DB_VERSION = 1;

const STORES = [
  'despesas-empenhados',
  'despesas-liquidados',
  'despesas-pagos',
  'despesas-a-pagar',
  'despesas-retidos',
  'receitas-empenhados',
  'receitas-liquidados',
  'receitas-pagos',
  'receitas-a-pagar',
  'receitas-retidos'
];
```

### API Disponível

```javascript
// Abrir conexão
const db = await abrirBancoDados();

// Salvar dados (substitui existentes)
await salvarDados('despesas-empenhados', arrayDeDados);

// Carregar dados
const dados = await carregarDados('despesas-empenhados');

// Limpar store
await limparDados('despesas-empenhados');
```

### Estrutura de Dados

Cada registro é um objeto JavaScript:

```javascript
{
  "Nr emp.": "2024NE00001",
  "Data": "2024-01-15",
  "Credor/Fornecedor": "EMPRESA XYZ LTDA",
  "Espécie": "Ordinário",
  "Unidade orçamentária": "SECRETARIA DE EDUCAÇÃO",
  "Despesa": "3.3.90.39 - Outros Serviços",
  "Fonte de recursos": "RECURSOS PRÓPRIOS",
  "Tipo": "Serviços",
  "Função": "Educação",
  "Valor (R$)": 15000.00
}
```

---

## 4. Importação de Dados

### Processo

```javascript
// 1. Usuário seleciona arquivo Excel
// 2. SheetJS lê o arquivo
const workbook = XLSX.read(data, { type: 'binary' });

// 3. Para cada aba, identifica o tipo
workbook.SheetNames.forEach(sheetName => {
  const tipo = identificarTipoDado(sheetName);
  const dados = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  // 4. Salva no IndexedDB
  salvarDados(tipo, dados);
});
```

### Identificação de Abas

```javascript
function identificarTipoDado(nomeAba) {
  const nome = nomeAba.toLowerCase();
  if (nome.includes('empenhad')) return 'despesas-empenhados';
  if (nome.includes('liquidad')) return 'despesas-liquidados';
  if (nome.includes('pago') || nome.includes('pagamento')) return 'despesas-pagos';
  if (nome.includes('a pagar') || nome.includes('pagar')) return 'despesas-a-pagar';
  if (nome.includes('retid') || nome.includes('retenç')) return 'despesas-retidos';
  return null;
}
```

---

## 5. Páginas de Consulta

### Estrutura Padrão

```html
<!DOCTYPE html>
<html>
<head>
  <!-- CSS -->
  <link rel="stylesheet" href="css/portal-transparencia.css">
  
  <!-- Bibliotecas externas -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>
</head>
<body>
  <!-- Sidebar -->
  <aside id="sidebar">...</aside>
  
  <!-- Header -->
  <header class="main-header">...</header>
  
  <!-- Page Header -->
  <section class="page-header">...</section>
  
  <!-- Content -->
  <main class="content-area">
    <!-- Filtros -->
    <div class="filter-section">...</div>
    
    <!-- Tabs -->
    <div class="tabs-container">...</div>
    
    <!-- Conteúdo das tabs -->
    <div class="tab-content" id="resumo">...</div>
    <div class="tab-content" id="detalhado">...</div>
    <div class="tab-content" id="grafico">...</div>
  </main>
  
  <!-- Scripts -->
  <script src="js/portal-transparencia.js"></script>
  <script src="js/indexeddb-utils.js"></script>
  <script src="js/exportar-dados.js"></script>
  
  <!-- Script específico da página -->
  <script>
    // Variáveis globais
    let todosOsDados = [];
    let dadosFiltradosGlobal = [];
    let dadosResumoGlobal = [];
    let paginaAtual = 1;
    let charts = {};
    
    // Funções da página
    function carregarDados() {...}
    function buscarDados() {...}
    function renderizarResumo() {...}
    function renderizarDetalhado() {...}
    function renderizarGraficos() {...}
    // etc.
  </script>
</body>
</html>
```

### Funções Principais

```javascript
// Carregar dados do IndexedDB
async function carregarDados() {
  const dados = await carregarDados('despesas-empenhados');
  todosOsDados = dados.dados || [];
  popularFiltros();
  renderizarDados(todosOsDados);
}

// Aplicar filtros
function buscarDados() {
  const filtros = obterFiltros();
  const dadosFiltrados = todosOsDados.filter(item => {
    // Lógica de filtro
    return true;
  });
  renderizarDados(dadosFiltrados);
}

// Renderizar dados
function renderizarDados(dados) {
  dadosFiltradosGlobal = dados;
  atualizarEstatisticas(calcularTotal(dados), dados.length);
  renderizarResumo();
  renderizarDetalhado();
  renderizarGraficos();
}
```

---

## 6. Ordenação

### Implementação

```javascript
let colunaOrdenacao = '';
let direcaoOrdenacao = 'asc';

function ordenarPor(coluna) {
  // Alterna direção se mesma coluna
  if (colunaOrdenacao === coluna) {
    direcaoOrdenacao = direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
  } else {
    colunaOrdenacao = coluna;
    direcaoOrdenacao = 'asc';
  }
  
  // Atualiza ícones visuais
  atualizarIconesOrdenacao(coluna);
  
  // Ordena dados
  dadosFiltradosGlobal.sort((a, b) => {
    let vA = getValor(a, coluna);
    let vB = getValor(b, coluna);
    
    // Tratamento por tipo
    if (coluna.includes('Valor') || coluna.includes('R$')) {
      vA = parseFloat(vA) || 0;
      vB = parseFloat(vB) || 0;
    } else if (coluna === 'Data') {
      vA = parseData(vA);
      vB = parseData(vB);
    } else {
      vA = String(vA).toLowerCase();
      vB = String(vB).toLowerCase();
    }
    
    if (vA < vB) return direcaoOrdenacao === 'asc' ? -1 : 1;
    if (vA > vB) return direcaoOrdenacao === 'asc' ? 1 : -1;
    return 0;
  });
  
  renderizarDetalhado();
}
```

### HTML do Cabeçalho

```html
<th onclick="ordenarPor('Data')" style="cursor: pointer;">
  Data <i class="fas fa-sort" id="sort-Data"></i>
</th>
```

---

## 7. Formatação de Data

### Função

```javascript
function formatarData(dataStr) {
  if (!dataStr || dataStr === '-') return '-';
  const str = String(dataStr).trim();
  
  // Se já está no formato DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
  
  // Se está no formato YYYY-MM-DD ou YYYY-MM-DD HH:MM:SS
  if (str.includes('-')) {
    const partes = str.split(' ')[0].split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
  }
  
  return str;
}
```

---

## 8. Gráficos (Chart.js)

### Configuração Básica

```javascript
let charts = {};

function renderizarGraficos() {
  const dados = dadosFiltradosGlobal;
  const agrupamento = document.getElementById('agrupamentoGrafico').value;
  
  // Agrupar dados
  const agrupado = {};
  dados.forEach(d => {
    const chave = getValor(d, agrupamento) || 'Não informado';
    const valor = parseFloat(getValor(d, 'Valor (R$)')) || 0;
    agrupado[chave] = (agrupado[chave] || 0) + valor;
  });
  
  // Top 30
  const top30 = Object.entries(agrupado)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);
  
  // Destruir gráfico anterior
  if (charts.unidades) charts.unidades.destroy();
  
  // Criar novo gráfico
  charts.unidades = new Chart(document.getElementById('chartUnidades'), {
    type: 'bar',
    data: {
      labels: top30.map(u => truncar(u[0], 30)),
      datasets: [{
        label: 'Valor (R$)',
        data: top30.map(u => u[1]),
        backgroundColor: '#3b82f6',
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { callback: v => formatarMoedaCompacta(v) } }
      }
    }
  });
}
```

---

## 9. Exportação

### PDF (jsPDF + autotable)

```javascript
// js/exportar-dados.js

function exportarPDF(dados, nomeArquivo, titulo, colunas) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'mm', 'a4'); // landscape
  
  // Cabeçalho
  doc.setFontSize(16);
  doc.text(titulo, 148, 15, { align: 'center' });
  
  // Data
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 148, 22, { align: 'center' });
  
  // Preparar dados
  const headers = colunas.map(c => c.titulo);
  const body = dados.map(item => colunas.map(c => {
    const valor = item[c.campo];
    if (c.formato === 'moeda') return formatarMoeda(valor);
    if (c.formato === 'data') return formatarData(valor);
    return valor || '-';
  }));
  
  // Tabela
  doc.autoTable({
    head: [headers],
    body: body,
    startY: 30,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [45, 152, 70] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: (data) => {
      // Rodapé com paginação
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, 148, 200, { align: 'center' });
      }
    }
  });
  
  doc.save(nomeArquivo);
}
```

### Excel (SheetJS)

```javascript
function exportarExcel(dados, nomeArquivo, colunas) {
  // Preparar dados
  const dadosFormatados = dados.map(item => {
    const obj = {};
    colunas.forEach(c => {
      obj[c.titulo] = item[c.campo] || '-';
    });
    return obj;
  });
  
  // Criar planilha
  const ws = XLSX.utils.json_to_sheet(dadosFormatados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  
  // Download
  XLSX.writeFile(wb, nomeArquivo);
}
```

---

## 10. Funções Utilitárias

### getValor

```javascript
function getValor(item, ...campos) {
  for (let campo of campos) {
    if (item[campo] !== undefined && item[campo] !== null && item[campo] !== '') {
      return item[campo];
    }
  }
  return '-';
}
```

### formatarMoeda

```javascript
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}
```

### formatarMoedaCompacta

```javascript
function formatarMoedaCompacta(v) {
  if (v >= 1e9) return 'R$ ' + (v / 1e9).toFixed(1).replace('.', ',') + ' bi';
  if (v >= 1e6) return 'R$ ' + (v / 1e6).toFixed(1).replace('.', ',') + ' mi';
  if (v >= 1e3) return 'R$ ' + (v / 1e3).toFixed(1).replace('.', ',') + ' mil';
  return formatarMoeda(v);
}
```

---

## 11. Adicionar Nova Página

### Passo a Passo

1. **Copie uma página existente** (ex: despesas-empenhados.html)
2. **Altere o título e subtítulo**
3. **Ajuste o store do IndexedDB** na função `carregarDados()`
4. **Configure as colunas** nos arrays `colunasDetalhado` e `colunasResumo`
5. **Ajuste os filtros** conforme necessário
6. **Atualize o menu lateral** em todas as páginas

---

## 12. Adicionar Novo Filtro

### No HTML

```html
<div class="filter-group">
  <label>Novo Filtro</label>
  <input type="text" id="filtroNovo" class="filter-input" placeholder="Digite...">
</div>
```

### No JavaScript

```javascript
function buscarDados() {
  const filtroNovo = document.getElementById('filtroNovo').value.toLowerCase().trim();
  
  const dadosFiltrados = todosOsDados.filter(item => {
    // ... outros filtros ...
    
    if (filtroNovo) {
      const valor = String(getValor(item, 'CampoNovo')).toLowerCase();
      if (!valor.includes(filtroNovo)) return false;
    }
    
    return true;
  });
  
  renderizarDados(dadosFiltrados);
}

function limparFiltros() {
  // ... outros ...
  document.getElementById('filtroNovo').value = '';
  renderizarDados(todosOsDados);
}
```

---

## 13. Manutenção

### Atualizar Bibliotecas

As bibliotecas são carregadas via CDN. Para atualizar, altere as URLs nos `<script>`:

```html
<!-- Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

<!-- SheetJS -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>

<!-- jsPDF -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>
```

### Debug

Abra o Console do navegador (F12) para ver erros e logs:

```javascript
console.log('Dados carregados:', todosOsDados.length);
console.log('Tipo selecionado:', tipoSelecionado);
```

---

## 14. Limitações Conhecidas

1. **Dados locais**: Cada navegador/computador tem seus próprios dados
2. **Sem sincronização**: Não há compartilhamento entre usuários
3. **Limite do navegador**: IndexedDB tem limite de armazenamento (~50GB no Chrome)
4. **Offline parcial**: Precisa de internet para carregar bibliotecas CDN

---

## 15. Possíveis Evoluções

1. **Backend com banco de dados centralizado** (PostgreSQL, MySQL)
2. **Autenticação de usuários**
3. **API REST** para integração com outros sistemas
4. **PWA** (Progressive Web App) para funcionamento offline completo
5. **Sincronização** entre dispositivos

---

*Documentação técnica - SEFAZ Caruaru*
*Atualizado em: Fevereiro 2026*
