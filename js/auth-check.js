// =====================================================
// Verificação de Autenticação - SIGEF Caruaru
// =====================================================
// Este script deve ser incluído em TODAS as páginas
// protegidas do sistema (exceto index.html)

(function verificarAutenticacao() {
  'use strict';

  try {
    var token = localStorage.getItem('auth_token');
    var authTime = Number(localStorage.getItem('auth_time') || '0');

    console.log('[Auth] Verificando autenticação...');
    console.log('[Auth] Token:', token ? 'Presente' : 'Ausente');
    console.log('[Auth] AuthTime:', authTime);

    // Verifica se tem token e timestamp
    if (!token || !authTime) {
      console.warn('[Auth] Sessão inválida - Token ou AuthTime ausente');
      redirecionarParaLogin('Acesso não autorizado. Faça login.');
      return;
    }

    // Verifica se a sessão expirou (24 horas)
    var horas = (Date.now() - authTime) / (1000 * 60 * 60);
    console.log('[Auth] Tempo desde login:', horas.toFixed(2), 'horas');

    if (horas >= 24) {
      console.warn('[Auth] Sessão expirada');
      limparSessao();
      redirecionarParaLogin('Sua sessão expirou. Faça login novamente.');
      return;
    }

    console.log('[Auth] ✓ Sessão válida');
    // Sessão válida - carrega dados do usuário
    carregarDadosUsuario();

  } catch (erro) {
    console.error('[Auth] Erro na verificação de autenticação:', erro);
    redirecionarParaLogin('Erro ao verificar autenticação.');
  }

  function redirecionarParaLogin(mensagem) {
    if (mensagem) {
      sessionStorage.setItem('auth_message', mensagem);
    }
    window.location.href = 'index.html';
  }

  function limparSessao() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_time');
    localStorage.removeItem('user_data');
  }

  function carregarDadosUsuario() {
    // Aguarda o DOM estar pronto antes de atualizar os elementos
    function atualizarDadosNoDOM() {
      try {
        var userDataStr = localStorage.getItem('user_data');
        if (userDataStr) {
          var userData = JSON.parse(userDataStr);

          // Atualiza nome do usuário no header (se existir)
          var userNameEl = document.querySelector('.user-name');
          if (userNameEl && userData.nome) {
            userNameEl.textContent = userData.nome;
          }

          // Atualiza role do usuário no header (se existir)
          var userRoleEl = document.querySelector('.user-role');
          if (userRoleEl && userData.perfil) {
            userRoleEl.textContent = userData.perfil;
          }

          // Atualiza avatar com iniciais do nome (se existir)
          var userAvatarEl = document.querySelector('.user-avatar');
          if (userAvatarEl && userData.nome) {
            var iniciais = userData.nome
              .split(' ')
              .map(function(n) { return n[0]; })
              .slice(0, 2)
              .join('')
              .toUpperCase();
            userAvatarEl.textContent = iniciais;
          }
        }
      } catch (e) {
        console.warn('Erro ao carregar dados do usuário:', e);
      }
    }

    // Executa quando o DOM estiver pronto
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', atualizarDadosNoDOM);
    } else {
      atualizarDadosNoDOM();
    }
  }
})();

// =====================================================
// Função de Logout
// =====================================================
function fazerLogout() {
  if (confirm('Deseja realmente sair do sistema?')) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_time');
    localStorage.removeItem('user_data');
    window.location.href = 'index.html';
  }
}

// Disponibiliza função globalmente
window.fazerLogout = fazerLogout;
