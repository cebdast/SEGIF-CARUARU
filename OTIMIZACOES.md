# 🚀 Otimizações de Performance - SIGEF Caruaru

## Melhorias Implementadas

### 1. **Sistema de Cache** (30 segundos)
- Dados ficam em memória por 30 segundos
- Evita recarregar do IndexedDB a cada navegação
- Limpa automaticamente após importação de novos dados

### 2. **Carregamento Paginado**
- Carrega dados em blocos de 1000 registros
- Não trava o navegador com grandes volumes
- Permite navegação enquanto carrega

### 3. **Renderização em Lotes**
- Renderiza HTML em grupos de 100 linhas
- Dá "respiros" ao navegador entre lotes
- Interface permanece responsiva

### 4. **Contagem Rápida**
- Usa `count()` do IndexedDB (muito mais rápido que `getAll()`)
- Mostra total de registros instantaneamente

### 5. **Filtros em Memória**
- Filtra dados já carregados sem acessar o DB novamente
- Filtros instantâneos mesmo com milhares de registros

### 6. **Ordenação Otimizada**
- Ordena dados em memória
- Detecta automaticamente números vs texto
- Performance constante independente do volume

---

## 📋 Como Usar

### Incluir os Scripts

Em todas as páginas que exibem dados:

```html
<script src="js/indexeddb-utils.js"></script>
<script src="js/renderizacao-otimizada.js"></script>
```

### Exemplo 1: Carregamento Básico com Cache

```javascript
// ANTES (lento)
const dados = await carregarDadosPortal('despesas-pagos');

// DEPOIS (com cache)
const dados = await carregarDadosComCache('despesas-pagos');
```

### Exemplo 2: Renderização Otimizada

```javascript
// Função que renderiza UMA linha da tabela
function renderizarLinha(item, index) {
  return `
    <tr>
      <td>${item.empenho}</td>
      <td>${item.credor}</td>
      <td>${formatarMoeda(item.valor)}</td>
    </tr>
  `;
}

// Renderiza tabela em lotes (não trava)
await renderizarTabelaEmLotes(dados, 'tbodyDados', renderizarLinha);
```

### Exemplo 3: Carregamento Progressivo

```javascript
// Carrega E renderiza progressivamente
await renderizarProgressivo('despesas-pagos', 'tbodyDados', renderizarLinha, {
  loteSize: 1000,      // Carrega 1000 por vez
  mostrarLoading: true, // Mostra "Carregando..."
  onProgresso: (atual, total) => {
    console.log(`${atual}/${total} registros`);
  }
});
```

### Exemplo 4: Contar Registros (Super Rápido)

```javascript
// ANTES (lento - carrega tudo)
const dados = await carregarDadosPortal('despesas-pagos');
const total = dados.length;

// DEPOIS (instantâneo)
const total = await contarRegistros('despesas-pagos');
```

### Exemplo 5: Filtros Rápidos

```javascript
// Carrega dados uma vez
const todosDados = await carregarDadosComCache('despesas-pagos');

// Filtra em memória (instantâneo)
const filtrados = filtrarDados(todosDados, {
  credor: 'Maria',
  empenho: '2024'
});

// Re-renderiza apenas os filtrados
await renderizarTabelaEmLotes(filtrados, 'tbodyDados', renderizarLinha);
```

### Exemplo 6: Ordenação

```javascript
// Ordena por valor (crescente)
const ordenados = ordenarDados(dados, 'valor', 'asc');

// Ordena por data (decrescente)
const ordenados = ordenarDados(dados, 'data', 'desc');
```

### Exemplo 7: Limpar Cache (Após Importação)

```javascript
// Limpa cache de uma tabela específica
limparCache('despesas-pagos');

// Limpa TODO o cache
limparCache();
```

---

## 🎯 Resultados Esperados

### Antes das Otimizações
- ❌ Carregar 10.000 registros: ~3-5 segundos
- ❌ Navegador trava durante carregamento
- ❌ Filtros lentos (recarrega do DB)

### Depois das Otimizações
- ✅ Carregar 10.000 registros: ~0.5-1 segundo (primeira vez)
- ✅ Carregamentos seguintes: ~50ms (cache)
- ✅ Interface permanece responsiva
- ✅ Filtros instantâneos (<100ms)

---

## 📊 Indicador de Progresso

Para mostrar progresso visual durante carregamento:

```javascript
// Cria indicador
const indicador = criarIndicadorProgresso('content-area');

// Carrega com progresso
indicador.mostrar();

await renderizarProgressivo('despesas-pagos', 'tbodyDados', renderizarLinha, {
  onProgresso: (atual, total) => {
    indicador.atualizar(atual, total);
  }
});

indicador.esconder();
```

---

## ⚠️ Observações Importantes

1. **Cache de 30 segundos**: Dados ficam em cache por apenas 30 segundos. Após importar novos dados, chame `limparCache()`.

2. **Paginação no IndexedDB**: O `carregarDadosPaginados()` usa cursor, que é mais lento que `getAll()` para volumes pequenos (<5000 registros). Use apenas para volumes grandes.

3. **Renderização**: Para tabelas com MUITOS registros (>50.000), considere implementar scroll infinito ou paginação na UI.

4. **Memória**: O cache armazena dados em memória. Com volumes muito grandes (>100MB), pode impactar a RAM.

---

## 🔧 Ajustes Finos

### Alterar Duração do Cache

No arquivo `js/indexeddb-utils.js`:

```javascript
const CACHE_DURATION = 30000; // 30 segundos (padrão)
const CACHE_DURATION = 60000; // 60 segundos
const CACHE_DURATION = 0;     // Desabilita cache
```

### Alterar Tamanho dos Lotes

```javascript
// Lotes menores = mais fluido, mas mais lento
await renderizarTabelaEmLotes(dados, 'tbody', renderFn, 50);

// Lotes maiores = mais rápido, mas pode travar
await renderizarTabelaEmLotes(dados, 'tbody', renderFn, 500);
```

---

## 📝 TODO - Próximas Melhorias

- [ ] Virtual Scrolling (renderizar apenas linhas visíveis)
- [ ] Web Workers (processar dados em background)
- [ ] Compressão de dados em cache
- [ ] Índices customizados no IndexedDB
- [ ] Service Worker para cache offline

---

**Última Atualização**: 16/02/2026
**Versão**: 1.0.0
