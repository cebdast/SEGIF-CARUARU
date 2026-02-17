// =====================================================
// IndexedDB Utilities - SIGEF Caruaru
// =====================================================

const DB_NAME = 'PortalTransparenciaDB';
const DB_VERSION = 2; // Versão 2 inclui stores de receitas
let dbInstance = null;

// Inicializar IndexedDB
function initPortalDB() {
  return new Promise((resolve, reject) => {
    // Se já tiver instância com versão correta, reutiliza
    if (dbInstance && dbInstance.version >= DB_VERSION) {
      resolve(dbInstance);
      return;
    }
    
    // Fechar conexão antiga se existir
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
    
    console.log('Abrindo IndexedDB versão', DB_VERSION);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('Erro ao abrir IndexedDB:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      console.log('IndexedDB conectado! Versão:', dbInstance.version);
      console.log('Stores disponíveis:', Array.from(dbInstance.objectStoreNames));
      resolve(dbInstance);
    };
    
    request.onupgradeneeded = (event) => {
      console.log('Atualizando schema do IndexedDB...');
      const database = event.target.result;
      
      // Stores de despesas E receitas
      const stores = [
        'despesas-empenhados',
        'despesas-liquidados', 
        'despesas-pagos',
        'despesas-retidos',
        'despesas-a-pagar',
        // Stores de Receitas
        'receitas-previsao',
        'receitas-arrecadacao',
        'receitas-retencoes',
        'receitas-deducoes'
      ];
      
      stores.forEach(storeName => {
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
          console.log(`Store criado: ${storeName}`);
        }
      });
    };
    
    request.onblocked = () => {
      console.warn('IndexedDB bloqueado! Feche outras abas.');
      // Não mostra alert imediatamente, tenta novamente após 2s
      setTimeout(() => {
        if (dbInstance && dbInstance.version >= DB_VERSION) {
          return; // Já conectou
        }
        alert('Banco de dados bloqueado.\n\nFECHE todas as outras abas do SIGEF e recarregue esta página (F5).');
        reject(new Error('IndexedDB bloqueado'));
      }, 2000);
    };
  });
}

// Cache de dados para evitar recarregamentos
const dataCache = new Map();
const CACHE_DURATION = 30000; // 30 segundos

// Carregar dados do IndexedDB (versão original - compatibilidade)
async function carregarDadosPortal(storeName) {
  try {
    const db = await initPortalDB();

    return new Promise((resolve, reject) => {
      // Verificar se o store existe
      if (!db.objectStoreNames.contains(storeName)) {
        console.log(`Store ${storeName} não existe ainda`);
        resolve([]);
        return;
      }

      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        console.log(`Carregados ${request.result.length} registros de ${storeName}`);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Erro ao carregar dados:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Erro ao conectar IndexedDB:', error);
    return [];
  }
}

// NOVA: Carregar dados com CACHE
async function carregarDadosComCache(storeName) {
  const cacheKey = `data_${storeName}`;
  const cached = dataCache.get(cacheKey);

  // Verifica se tem cache válido
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`[Cache] Usando dados em cache de ${storeName} (${cached.data.length} registros)`);
    return cached.data;
  }

  // Carrega dados frescos
  const data = await carregarDadosPortal(storeName);

  // Salva no cache
  dataCache.set(cacheKey, {
    data: data,
    timestamp: Date.now()
  });

  return data;
}

// NOVA: Contar registros (MUITO mais rápido que getAll())
async function contarRegistros(storeName) {
  try {
    const db = await initPortalDB();

    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(storeName)) {
        resolve(0);
        return;
      }

      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Erro ao contar registros:', error);
    return 0;
  }
}

// NOVA: Carregar dados PAGINADOS (para grandes volumes)
async function carregarDadosPaginados(storeName, offset = 0, limit = 1000) {
  try {
    const db = await initPortalDB();

    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(storeName)) {
        resolve({ dados: [], total: 0, temMais: false });
        return;
      }

      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);

      // Primeiro, pega o total
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        const total = countRequest.result;

        // Agora pega os dados paginados
        const dados = [];
        let contador = 0;
        const cursorRequest = store.openCursor();

        cursorRequest.onsuccess = (event) => {
          const cursor = event.target.result;

          if (cursor) {
            // Pula até o offset
            if (contador < offset) {
              contador++;
              cursor.continue();
              return;
            }

            // Adiciona se estiver dentro do limite
            if (dados.length < limit) {
              dados.push(cursor.value);
              contador++;
              cursor.continue();
            } else {
              // Chegou no limite
              resolve({
                dados: dados,
                total: total,
                temMais: (offset + limit) < total,
                offset: offset,
                limit: limit
              });
            }
          } else {
            // Acabaram os dados
            resolve({
              dados: dados,
              total: total,
              temMais: false,
              offset: offset,
              limit: limit
            });
          }
        };

        cursorRequest.onerror = () => reject(cursorRequest.error);
      };

      countRequest.onerror = () => reject(countRequest.error);
    });
  } catch (error) {
    console.error('Erro ao carregar dados paginados:', error);
    return { dados: [], total: 0, temMais: false };
  }
}

// NOVA: Limpar cache (útil após importação de dados)
function limparCache(storeName = null) {
  if (storeName) {
    dataCache.delete(`data_${storeName}`);
    console.log(`[Cache] Cache de ${storeName} limpo`);
  } else {
    dataCache.clear();
    console.log('[Cache] Todo cache limpo');
  }
}

// Exportar funções globalmente
window.initPortalDB = initPortalDB;
window.carregarDadosPortal = carregarDadosPortal;
window.carregarDadosComCache = carregarDadosComCache;
window.contarRegistros = contarRegistros;
window.carregarDadosPaginados = carregarDadosPaginados;
window.limparCache = limparCache;

