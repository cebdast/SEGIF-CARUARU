// =====================================================
// Sidebar Menu Dinamico - SIGEF Caruaru
// =====================================================
// Renderiza o menu lateral de forma centralizada para
// todas as novas paginas. Paginas existentes mantem
// seu menu inline para compatibilidade.

function renderSidebarMenu(paginaAtual) {
  const container = document.getElementById('sidebarMenu');
  if (!container) return;

  const menuData = [
    {
      title: 'Visão Geral',
      icon: 'fa-tachometer-alt',
      items: [
        { href: 'dashboard.html', icon: 'fa-home', label: 'Dashboard Executivo' },
        { href: 'resultado-orcamentario.html', icon: 'fa-chart-pie', label: 'Resultado Orçamentário' }
      ]
    },
    {
      title: 'Receitas',
      icon: 'fa-hand-holding-usd',
      items: [
        { href: 'receitas-previsao.html', icon: 'fa-chart-line', label: 'Previsão' },
        { href: 'receitas-arrecadacao.html', icon: 'fa-money-bill-wave', label: 'Arrecadação' },
        { href: 'receitas-retencoes.html', icon: 'fa-hand-holding-usd', label: 'Retenções' },
        { href: 'receitas-deducoes.html', icon: 'fa-minus-circle', label: 'Deduções' },
        { href: 'receitas-gerencial.html', icon: 'fa-tachometer-alt', label: 'Gerencial' },
        { href: 'receitas-comparativos.html', icon: 'fa-balance-scale', label: 'Comparativos' }
      ]
    },
    {
      title: 'Despesas',
      icon: 'fa-file-invoice-dollar',
      items: [
        { href: 'despesas-empenhados.html', icon: 'fa-file-invoice', label: 'Empenhados' },
        { href: 'despesas-liquidados.html', icon: 'fa-check-circle', label: 'Liquidados' },
        { href: 'despesas-retidos.html', icon: 'fa-hand-holding-usd', label: 'Retidos' },
        { href: 'despesas-pagos.html', icon: 'fa-money-check-alt', label: 'Pagos' },
        { href: 'despesas-a-pagar.html', icon: 'fa-clock', label: 'A Pagar' },
        { href: 'despesas-gerencial.html', icon: 'fa-chart-line', label: 'Gerencial' },
        { href: 'despesas-comparativos.html', icon: 'fa-balance-scale', label: 'Comparativos' }
      ]
    },
    {
      title: 'Análises',
      icon: 'fa-search-dollar',
      items: [
        { href: 'despesas-analise.html', icon: 'fa-chart-pie', label: 'Análise Financeira' },
        { href: 'despesas-execucao.html', icon: 'fa-chart-bar', label: 'Execução Orçamentária' },
        { href: 'despesas-fontes.html', icon: 'fa-layer-group', label: 'Fontes de Recursos' },
        { href: 'despesas-credores.html', icon: 'fa-users', label: 'Credores' },
        { href: 'despesas-natureza.html', icon: 'fa-sitemap', label: 'Natureza da Despesa' },
        { href: 'limites-legais.html', icon: 'fa-gavel', label: 'Limites Legais' },
        { href: 'despesas-alertas.html', icon: 'fa-exclamation-triangle', label: 'Alertas' }
      ]
    },
    {
      title: 'Banco de Dados',
      icon: 'fa-database',
      items: [
        { href: 'banco-importar-dados.html', icon: 'fa-file-import', label: 'Importar Dados' },
        { href: 'banco-historico.html', icon: 'fa-history', label: 'Histórico' },
        { href: 'admin-usuarios.html', icon: 'fa-user-shield', label: 'Usuários' }
      ]
    }
  ];

  let html = '';
  menuData.forEach(section => {
    const hasActive = section.items.some(item => item.href === paginaAtual);
    const isExpanded = hasActive;

    html += `<div class="menu-section${isExpanded ? ' expanded' : ''}">`;
    html += `<div class="menu-section-title" onclick="toggleSection(this)">`;
    html += `<i class="fas ${section.icon}"></i><span>${section.title}</span>`;
    html += `<i class="fas fa-chevron-right section-arrow"></i></div><ul>`;

    section.items.forEach(item => {
      const isActive = item.href === paginaAtual;
      html += `<li class="menu-item"><a href="${item.href}" class="menu-link${isActive ? ' active' : ''}">`;
      html += `<i class="fas ${item.icon}"></i><span>${item.label}</span></a></li>`;
    });

    html += '</ul></div>';
  });

  container.innerHTML = html;
}

window.renderSidebarMenu = renderSidebarMenu;
