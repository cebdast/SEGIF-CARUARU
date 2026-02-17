// ============================================
// PORTAL TRANSPARÊNCIA - JAVASCRIPT
// ============================================

// ============================================
// AUTENTICAÇÃO (FRONTEND)
// ============================================
(function enforceAuthGuard() {
  try {
    var page = (window.location.pathname.split('/').pop() || '').toLowerCase();
    if (!page || page === 'index.html') return;

    var token = localStorage.getItem('auth_token');
    var authTime = Number(localStorage.getItem('auth_time') || '0');

    if (!token || !authTime) {
      window.location.href = 'index.html';
      return;
    }

    var hours = (Date.now() - authTime) / (1000 * 60 * 60);
    if (hours >= 24) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_time');
      localStorage.removeItem('user_data');
      window.location.href = 'index.html';
    }
  } catch (e) {
    window.location.href = 'index.html';
  }
})();

function logoutSistema() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_time');
  localStorage.removeItem('user_data');
  window.location.href = 'index.html';
}

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
  const section = element.closest('.menu-section');
  if (!section) return;

  const menu = section.parentElement;
  if (!menu) return;

  const allSections = menu.querySelectorAll(':scope > .menu-section');
  const isExpanded = section.classList.contains('expanded');

  // Mantém somente uma seção aberta por vez na sidebar
  allSections.forEach(s => s.classList.remove('expanded'));

  // Se a clicada estava fechada, abre; se estava aberta, fecha (fica tudo recolhido)
  if (!isExpanded) {
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
  // Normalizar estado inicial do menu (evita múltiplas seções destacadas)
  document.querySelectorAll('.sidebar-menu').forEach(menu => {
    const sections = Array.from(menu.querySelectorAll(':scope > .menu-section'));
    if (!sections.length) return;

    let alvo = sections.find(s => s.querySelector('.menu-link.active')) || null;
    if (!alvo) alvo = sections.find(s => s.classList.contains('expanded')) || null;

    sections.forEach(s => s.classList.remove('expanded'));
    if (alvo) alvo.classList.add('expanded');
  });

  // Preencher dados do usuário logado no header e habilitar menu "Deslogar"
  const userMenu = document.querySelector('.user-menu');
  if (userMenu) {
    try {
      const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
      const nome = (userData.nome || userData.username || '').trim();
      const role = (userData.role || 'sigef').toString();

      const nomeEl = userMenu.querySelector('.user-name');
      const roleEl = userMenu.querySelector('.user-role');
      const avatarEl = userMenu.querySelector('.user-avatar');

      if (nomeEl && nome) nomeEl.textContent = nome;
      if (roleEl) roleEl.textContent = role.toUpperCase();
      if (avatarEl && nome) {
        const iniciais = nome
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map(p => p[0].toUpperCase())
          .join('');
        if (iniciais) avatarEl.textContent = iniciais;
      }
    } catch (e) {}

    if (!userMenu.querySelector('.user-menu-dropdown')) {
      const dropdown = document.createElement('div');
      dropdown.className = 'user-menu-dropdown';
      dropdown.innerHTML = '<button type=\"button\" id=\"btnLogoutMenu\"><i class=\"fas fa-sign-out-alt\"></i> Deslogar</button>';
      userMenu.appendChild(dropdown);

      const btnLogout = dropdown.querySelector('#btnLogoutMenu');
      if (btnLogout) {
        btnLogout.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          logoutSistema();
        });
      }

      userMenu.addEventListener('click', function(e) {
        if (e.target.closest('#btnLogoutMenu')) return;
        userMenu.classList.toggle('open');
      });

      document.addEventListener('click', function(e) {
        if (!userMenu.contains(e.target)) {
          userMenu.classList.remove('open');
        }
      });
    }
  }

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

  // Reorganizar filtros: Unidade Gestora ao lado de Exercício
  try {
    const selectExercicio = document.getElementById('filtroExercicio') || document.getElementById('filtroAno');
    const selectUnidadeGestora = document.getElementById('filtroUnidadeGestora');

    if (selectExercicio && selectUnidadeGestora) {
      const grupoExercicio = selectExercicio.closest('.filter-group');
      const grupoUnidadeGestora = selectUnidadeGestora.closest('.filter-group');
      const grid = grupoExercicio ? grupoExercicio.parentElement : null;

      if (grid && grupoExercicio && grupoUnidadeGestora && grupoExercicio !== grupoUnidadeGestora) {
        const next = grupoExercicio.nextElementSibling;
        if (next !== grupoUnidadeGestora) {
          grid.insertBefore(grupoUnidadeGestora, grupoExercicio.nextElementSibling);
        }
      }
    }
  } catch (e) {}
});


