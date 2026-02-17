// =====================================================
// Renderização Otimizada - SIGEF Caruaru
// =====================================================
// Funções para renderizar grandes volumes de dados
// com performance otimizada

// Renderiza tabela em lotes (evita travar o navegador)
async function renderizarTabelaEmLotes(dados, tbodyId, renderLinhaFn, loteSize = 100) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) {
    console.error('Tbody não encontrado:', tbodyId);
    return;
  }

  tbody.innerHTML = ''; // Limpa tabela
  let linhasHTML = '';
  let contador = 0;

  console.log(`[Render] Renderizando ${dados.length} linhas em lotes de ${loteSize}`);
  const inicio = performance.now();

  for (let i = 0; i < dados.length; i++) {
    linhasHTML += renderLinhaFn(dados[i], i);
    contador++;

    // A cada lote, renderiza e dá um respiro pro navegador
    if (contador >= loteSize || i === dados.length - 1) {
      tbody.insertAdjacentHTML('beforeend', linhasHTML);
      linhasHTML = '';
      contador = 0;

      // Permite que o navegador processe eventos
      if (i < dados.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }

  const fim = performance.now();
  console.log(`[Render] Renderização concluída em ${(fim - inicio).toFixed(2)}ms`);
}

// Renderiza progressivamente (mostra dados enquanto carrega)
async function renderizarProgressivo(storeName, tbodyId, renderLinhaFn, opcoes = {}) {
  const {
    loteSize = 1000,
    mostrarLoading = true,
    onProgresso = null
  } = opcoes;

  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  if (mostrarLoading) {
    tbody.innerHTML = '<tr><td colspan="20" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Carregando dados...</td></tr>';
  }

  try {
    // Conta total de registros primeiro (rápido)
    const total = await contarRegistros(storeName);
    console.log(`[Render] Total de registros: ${total}`);

    if (total === 0) {
      tbody.innerHTML = '<tr><td colspan="20" style="text-align:center; padding:20px; color:#64748b;">Nenhum registro encontrado</td></tr>';
      return;
    }

    tbody.innerHTML = ''; // Limpa loading
    let offset = 0;
    let carregados = 0;

    // Carrega e renderiza em blocos
    while (offset < total) {
      const resultado = await carregarDadosPaginados(storeName, offset, loteSize);

      if (resultado.dados.length === 0) break;

      // Renderiza este lote
      await renderizarTabelaEmLotes(resultado.dados, tbodyId, renderLinhaFn, 100);

      carregados += resultado.dados.length;
      offset += loteSize;

      // Callback de progresso
      if (onProgresso) {
        onProgresso(carregados, total);
      }

      console.log(`[Render] Progresso: ${carregados}/${total} (${((carregados/total)*100).toFixed(1)}%)`);
    }

    console.log(`[Render] ✓ ${carregados} registros renderizados`);

  } catch (error) {
    console.error('[Render] Erro:', error);
    tbody.innerHTML = '<tr><td colspan="20" style="text-align:center; padding:20px; color:#dc2626;">Erro ao carregar dados</td></tr>';
  }
}

// Cria um indicador de progresso na página
function criarIndicadorProgresso(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const div = document.createElement('div');
  div.id = 'progressIndicator';
  div.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border: 1px solid #e5e7eb;
    z-index: 9999;
    font-size: 14px;
    color: #1f2937;
    display: none;
  `;
  div.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <i class="fas fa-spinner fa-spin" style="color: #059669;"></i>
      <div>
        <div style="font-weight: 600; margin-bottom: 4px;">Carregando dados...</div>
        <div id="progressText" style="font-size: 12px; color: #6b7280;">0 de 0</div>
      </div>
    </div>
  `;

  container.appendChild(div);

  return {
    mostrar: () => div.style.display = 'block',
    esconder: () => div.style.display = 'none',
    atualizar: (carregados, total) => {
      const texto = document.getElementById('progressText');
      if (texto) {
        const percentual = ((carregados / total) * 100).toFixed(0);
        texto.textContent = `${carregados.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} (${percentual}%)`;
      }
    }
  };
}

// Filtragem otimizada (não recarrega do DB, filtra dados em memória)
function filtrarDados(dados, filtros) {
  const inicio = performance.now();

  let resultado = dados;

  // Aplica cada filtro
  for (const [campo, valor] of Object.entries(filtros)) {
    if (!valor || valor === '') continue;

    const valorLower = String(valor).toLowerCase();
    resultado = resultado.filter(item => {
      const valorCampo = String(item[campo] || '').toLowerCase();
      return valorCampo.includes(valorLower);
    });
  }

  const fim = performance.now();
  console.log(`[Filtro] ${dados.length} → ${resultado.length} registros em ${(fim - inicio).toFixed(2)}ms`);

  return resultado;
}

// Ordenação otimizada
function ordenarDados(dados, campo, direcao = 'asc') {
  const inicio = performance.now();

  const dadosOrdenados = [...dados].sort((a, b) => {
    let valorA = a[campo];
    let valorB = b[campo];

    // Converte para número se possível
    const numA = parseFloat(valorA);
    const numB = parseFloat(valorB);

    if (!isNaN(numA) && !isNaN(numB)) {
      return direcao === 'asc' ? numA - numB : numB - numA;
    }

    // Comparação de string
    valorA = String(valorA || '').toLowerCase();
    valorB = String(valorB || '').toLowerCase();

    if (direcao === 'asc') {
      return valorA < valorB ? -1 : valorA > valorB ? 1 : 0;
    } else {
      return valorB < valorA ? -1 : valorB > valorA ? 1 : 0;
    }
  });

  const fim = performance.now();
  console.log(`[Sort] ${dados.length} registros ordenados em ${(fim - inicio).toFixed(2)}ms`);

  return dadosOrdenados;
}

// Exporta funções globalmente
window.renderizarTabelaEmLotes = renderizarTabelaEmLotes;
window.renderizarProgressivo = renderizarProgressivo;
window.criarIndicadorProgresso = criarIndicadorProgresso;
window.filtrarDados = filtrarDados;
window.ordenarDados = ordenarDados;
