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
      alert('Banco de dados bloqueado. Feche outras abas do SIGEF e recarregue a página.');
    };
  });
}

// Carregar dados do IndexedDB
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

// Exportar funções globalmente
window.initPortalDB = initPortalDB;
window.carregarDadosPortal = carregarDadosPortal;
