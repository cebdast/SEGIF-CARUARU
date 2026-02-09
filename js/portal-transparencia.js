// ============================================
// PORTAL TRANSPARÊNCIA - JAVASCRIPT
// ============================================

// ============================================
// FORMATAÇÃO DE VALORES COM TOOLTIP
// ============================================

// Formatar valor monetário completo
function formatarMoedaCompleto(valor) {
  const num = parseFloat(valor) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Formatar valor monetário abreviado (mi, bi)
function formatarMoedaAbreviado(valor) {
  const num = parseFloat(valor) || 0;
  const absNum = Math.abs(num);
  
  if (absNum >= 1e9) {
    return (num / 1e9).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' bi';
  } else if (absNum >= 1e6) {
    return (num / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' mi';
  } else if (absNum >= 1e3) {
    return (num / 1e3).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' mil';
  }
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Definir valor em um elemento KPI com tooltip
function setKpiValue(elementId, valor, prefixo = 'R$ ') {
  const elemento = document.getElementById(elementId);
  if (!elemento) return;
  
  const valorNumerico = parseFloat(valor) || 0;
  const valorAbreviado = prefixo + formatarMoedaAbreviado(valorNumerico);
  const valorCompleto = formatarMoedaCompleto(valorNumerico);
  
  elemento.textContent = valorAbreviado;
  elemento.setAttribute('title', valorCompleto);
}

// Definir valor simples (quantidade) com tooltip
function setKpiCount(elementId, valor) {
  const elemento = document.getElementById(elementId);
  if (!elemento) return;
  
  const valorNumerico = parseInt(valor) || 0;
  elemento.textContent = valorNumerico.toLocaleString('pt-BR');
  elemento.setAttribute('title', valorNumerico.toLocaleString('pt-BR') + ' registros');
}

// ============================================
// HISTÓRICO DE IMPORTAÇÕES
// ============================================
const HISTORICO_KEY = 'historico-importacoes';

// Obter última importação do histórico
function obterUltimaImportacao() {
  try {
    const dados = localStorage.getItem(HISTORICO_KEY);
    const historico = dados ? JSON.parse(dados) : [];
    return historico.length > 0 ? historico[0] : null;
  } catch (e) {
    console.error('Erro ao ler histórico:', e);
    return null;
  }
}

// Formatar data da última importação
function formatarDataImportacao(dataString) {
  const data = new Date(dataString);
  const dataFormatada = data.toLocaleDateString('pt-BR');
  const horaFormatada = data.toLocaleTimeString('pt-BR');
  return `${dataFormatada} às ${horaFormatada}`;
}

// Atualizar elemento de data de atualização com a última importação
function atualizarDataUltimaImportacao(elementId = 'dataAtualizacao') {
  const elemento = document.getElementById(elementId);
  if (!elemento) return;

  const ultimaImportacao = obterUltimaImportacao();
  
  if (ultimaImportacao) {
    const dataFormatada = formatarDataImportacao(ultimaImportacao.dataHora);
    elemento.innerHTML = `<i class="fas fa-sync-alt"></i> Atualizado em ${dataFormatada}`;
  } else {
    elemento.innerHTML = `<i class="fas fa-exclamation-circle"></i> Sem dados importados`;
  }
}

// Toggle Sidebar
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
  sidebar.classList.toggle('open');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.remove('open');
}

// Toggle Section (Accordion)
function toggleSection(element) {
  const section = element.parentElement;
  const allSections = document.querySelectorAll('.menu-section');
  
  // Se a seção clicada já está expandida, apenas fecha ela
  if (section.classList.contains('expanded')) {
    section.classList.remove('expanded');
  } else {
    // Fecha todas as outras seções
    allSections.forEach(s => s.classList.remove('expanded'));
    // Abre a seção clicada
    section.classList.add('expanded');
  }
}

// Toggle Submenu
function toggleSubmenu(event, element) {
  event.preventDefault();
  const menuItem = element.parentElement;
  menuItem.classList.toggle('open');
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  // Menu link click - não remove mais o active pois cada página controla isso
  // Apenas adiciona hover effects

  // Tabs functionality
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      this.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // Submenu toggle for items with arrow
  document.querySelectorAll('.menu-link .arrow').forEach(arrow => {
    arrow.parentElement.addEventListener('click', function(e) {
      if (this.querySelector('.arrow')) {
        e.preventDefault();
        this.parentElement.classList.toggle('open');
      }
    });
  });

  // Close sidebar on overlay click (mobile)
  const overlay = document.querySelector('.sidebar-overlay');
  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }
});
