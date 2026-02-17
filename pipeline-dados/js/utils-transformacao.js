/**
 * Utilitários compartilhados para transformação de dados SIGEF
 * Dependência: SheetJS (XLSX) deve estar carregado globalmente
 */

/** Verifica se uma célula está vazia */
function isEmptyCell(value) {
  return value === null || value === undefined ||
    (typeof value === 'string' && value.trim() === '');
}

/** Extrai apenas dígitos de um texto */
function extractDigits(text) {
  if (isEmptyCell(text)) return '';
  return String(text).replace(/\D/g, '');
}

/** Converte sheet do SheetJS para matrix 2D (array de arrays) */
function sheetToMatrix(sheet, opts = {}) {
  const raw = opts.raw !== undefined ? opts.raw : false;
  const defval = opts.defval !== undefined ? opts.defval : null;
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1, raw, defval, blankrows: true
  });
}

/** Converte matrix 2D para sheet do SheetJS */
function matrixToSheet(matrix) {
  return XLSX.utils.aoa_to_sheet(matrix);
}

/**
 * Fill-down: preenche células vazias com o último valor não-vazio acima
 * @param {Array[]} matrix
 * @param {number} colIndex - 0-based
 * @param {number} startRow - 0-based (normalmente 1 para pular header)
 */
function fillDown(matrix, colIndex, startRow = 1) {
  let lastValue = null;
  for (let r = 0; r < matrix.length; r++) {
    if (r < startRow) {
      if (colIndex < (matrix[r] || []).length) lastValue = matrix[r][colIndex];
      continue;
    }
    const row = matrix[r] || [];
    if (colIndex < row.length && !isEmptyCell(row[colIndex])) {
      lastValue = row[colIndex];
    } else {
      safeSet(matrix, r, colIndex, lastValue);
    }
  }
}

/** Remove colunas completamente vazias (ignora header) */
function removeEmptyColumns(matrix) {
  if (!matrix || matrix.length === 0) return matrix;
  let maxCols = 0;
  for (let i = 0; i < matrix.length; i++) {
    const len = (matrix[i] || []).length;
    if (len > maxCols) maxCols = len;
  }
  const keep = [];
  for (let c = 0; c < maxCols; c++) {
    for (let r = 1; r < matrix.length; r++) {
      if (c < (matrix[r] || []).length && !isEmptyCell(matrix[r][c])) {
        keep.push(c);
        break;
      }
    }
  }
  return matrix.map(row => {
    const newRow = keep.map(c => c < (row || []).length ? row[c] : null);
    // Preservar propriedades custom (ex: _unidadeGestora, _isUnidadeMarker)
    if (row && row._unidadeGestora !== undefined) newRow._unidadeGestora = row._unidadeGestora;
    if (row && row._isUnidadeMarker) newRow._isUnidadeMarker = row._isUnidadeMarker;
    return newRow;
  });
}

/** Remove linhas completamente vazias a partir de startRow */
function removeEmptyRows(matrix, startRow = 1) {
  const result = [];
  for (let r = 0; r < matrix.length; r++) {
    if (r < startRow) { result.push(matrix[r]); continue; }
    if ((matrix[r] || []).some(v => !isEmptyCell(v))) result.push(matrix[r]);
  }
  return result;
}

/** Deleta uma coluna da matrix */
function deleteColumn(matrix, colIndex) {
  for (const row of matrix) {
    if (row && colIndex < row.length) row.splice(colIndex, 1);
  }
}

/** Deleta múltiplas colunas (ordena automaticamente em decrescente) */
function deleteColumns(matrix, colIndices) {
  const sorted = [...colIndices].sort((a, b) => b - a);
  for (const idx of sorted) deleteColumn(matrix, idx);
}

/** Insere uma coluna vazia na posição indicada */
function insertColumn(matrix, colIndex) {
  for (const row of matrix) {
    if (!row) continue;
    while (row.length < colIndex) row.push(null);
    row.splice(colIndex, 0, null);
  }
}

/** Acesso seguro a célula */
function safeGet(matrix, r, c) {
  if (r < 0 || r >= matrix.length) return null;
  const row = matrix[r] || [];
  return c >= 0 && c < row.length ? row[c] : null;
}

/** Escrita segura em célula (estende a linha se necessário) */
function safeSet(matrix, r, c, val) {
  if (r < 0 || c < 0) return;
  while (matrix.length <= r) matrix.push([]);
  const row = matrix[r];
  while (row.length <= c) row.push(null);
  row[c] = val;
}

/** Normaliza texto: lowercase, trim, remove acentos */
function normalizeText(text) {
  if (isEmptyCell(text)) return '';
  return String(text).trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Converte data serial do Excel para DD/MM/AAAA */
function excelDateToString(value) {
  if (typeof value === 'string') {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const p = value.split('T')[0].split('-');
      return `${p[2]}/${p[1]}/${p[0]}`;
    }
    return value;
  }
  if (typeof value === 'number' && value > 0 && value < 100000) {
    const msPerDay = 86400000;
    // Excel serial: dia 1 = Jan 1, 1900. Bug do Excel: serial 60 = Feb 29, 1900 (inexistente)
    // Para serial > 60: offset = 25569 (corrige o bug do ano bissexto 1900)
    // Para serial <= 60: offset = 25568
    const adjust = value > 60 ? 25569 : 25568;
    const date = new Date((value - adjust) * msPerDay);
    if (isNaN(date.getTime())) return value;
    const d = String(date.getUTCDate()).padStart(2, '0');
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${date.getUTCFullYear()}`;
  }
  return value;
}

/** Converte letra de coluna para índice 0-based (A=0, B=1, ..., Z=25, AA=26) */
function col0(letter) {
  letter = letter.trim().toUpperCase();
  let n = 0;
  for (const ch of letter) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Garante que a matrix é retangular (seguro para matrizes grandes) */
function normalizeMatrix(matrix) {
  if (!matrix || matrix.length === 0) return matrix;
  let maxCols = 0;
  for (let i = 0; i < matrix.length; i++) {
    const len = (matrix[i] || []).length;
    if (len > maxCols) maxCols = len;
  }
  for (const row of matrix) {
    while ((row || []).length < maxCols) row.push(null);
  }
  return matrix;
}

/** Converte indice de coluna para letra(s) Excel (0=A, 1=B, 25=Z, 26=AA, etc.) */
function _colToLetter(c) {
  var s = '';
  c++;
  while (c > 0) {
    c--;
    s = String.fromCharCode(65 + (c % 26)) + s;
    c = Math.floor(c / 26);
  }
  return s;
}

/** Preenche merged cells no sheet do SheetJS (desmescla preenchendo)
 *  OTIMIZADO: calculo manual de endereco em vez de XLSX.utils.encode_cell()
 */
function fillMergedCells(sheet) {
  if (!sheet['!merges'] || sheet['!merges'].length === 0) return;

  // Pre-calcular letras de colunas para evitar recalculo repetido
  var maxCol = 0;
  var merges = sheet['!merges'];
  for (var m = 0; m < merges.length; m++) {
    if (merges[m].e.c > maxCol) maxCol = merges[m].e.c;
  }
  var colLetters = new Array(maxCol + 1);
  for (var ci = 0; ci <= maxCol; ci++) {
    colLetters[ci] = _colToLetter(ci);
  }

  for (var m = 0; m < merges.length; m++) {
    var merge = merges[m];
    var addr0 = colLetters[merge.s.c] + (merge.s.r + 1);
    var val = sheet[addr0] ? sheet[addr0].v : undefined;
    if (val === undefined) continue;

    var cellTemplate = { t: 's', v: val };
    for (var r = merge.s.r; r <= merge.e.r; r++) {
      var rowStr = String(r + 1);
      for (var c = merge.s.c; c <= merge.e.c; c++) {
        var addr = colLetters[c] + rowStr;
        if (!sheet[addr]) sheet[addr] = { t: cellTemplate.t, v: cellTemplate.v };
      }
    }
  }
  delete sheet['!merges'];
}

/** Localiza coluna pelo nome do header (case insensitive, parcial) */
function findColumn(header, name, exact = false) {
  const target = name.toLowerCase();
  for (let c = 0; c < header.length; c++) {
    const h = String(header[c] || '').trim().toLowerCase();
    if (exact ? h === target : h.includes(target)) return c;
  }
  return -1;
}

/** Encontra coluna pelo nome exato */
function findColumnExact(header, name) {
  for (let c = 0; c < header.length; c++) {
    if (header[c] && String(header[c]).trim() === name) return c;
  }
  return -1;
}

// =========================================================
// Detectar linha de cabeçalho
// =========================================================

/**
 * Procura a linha que contém os nomes das colunas reais,
 * pulando linhas de título/cabeçalho extras.
 *
 * @param {Array[]} matrix - Matriz de dados
 * @param {string[]} expectedColumns - Colunas esperadas (opcional)
 * @returns {number} Índice da linha de cabeçalho (0-based)
 */
function detectHeaderRow(matrix, expectedColumns = null) {
  if (!matrix || matrix.length === 0) return 0;

  // Colunas comuns em planilhas SIGEF
  const commonColumns = expectedColumns || [
    'Data', 'Valor', 'Empenho', 'Credor', 'CPF/CNPJ', 'CNPJ/CPF',
    'Unidade Gestora', 'Unidade Orçamentária', 'Detalhamento',
    'Valor (R$)', 'Valor(R$)', 'Nr Empenho', 'Nº Empenho',
    'Data de Emissão', 'Data Emissão', 'Data do Empenho'
  ];

  // Procura nas primeiras 10 linhas
  const maxLinesToCheck = Math.min(10, matrix.length);

  for (let rowIdx = 0; rowIdx < maxLinesToCheck; rowIdx++) {
    const row = matrix[rowIdx] || [];

    // Conta quantas colunas conhecidas existem nesta linha
    let matchCount = 0;
    let totalNonEmpty = 0;

    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cell = row[colIdx];

      if (cell !== null && cell !== undefined && String(cell).trim() !== '') {
        totalNonEmpty++;

        const cellStr = String(cell).trim();

        // Verifica se é uma coluna conhecida (case-insensitive)
        for (const expectedCol of commonColumns) {
          if (cellStr.toLowerCase().includes(expectedCol.toLowerCase()) ||
              expectedCol.toLowerCase().includes(cellStr.toLowerCase())) {
            matchCount++;
            break;
          }
        }
      }
    }

    // Se encontrou pelo menos 3 colunas conhecidas, ou
    // se tem pelo menos 5 células não-vazias (provável header)
    if (matchCount >= 3 || (totalNonEmpty >= 5 && rowIdx > 0)) {
      console.log(`[DetectHeader] Cabeçalho detectado na linha ${rowIdx} (${matchCount} colunas conhecidas, ${totalNonEmpty} não-vazias)`);
      return rowIdx;
    }
  }

  // Se não encontrou, assume que é a primeira linha
  console.warn('[DetectHeader] Cabeçalho não detectado, usando linha 0');
  return 0;
}

// ColTracker — rastreador de colunas por nome
// =========================================================

/**
 * Cria um rastreador de colunas que mapeia nomes de header para índices.
 * Atualiza-se automaticamente em inserções/deleções.
 *
 * Uso:
 *   const headerRowIdx = detectHeaderRow(matrix);
 *   const ct = createColTracker(matrix[headerRowIdx]);
 *   ct.idx('Data')            // retorna índice atual
 *   ct.insert(3, 'NewCol')    // insere e atualiza mapping
 *   ct.remove('Espécie')      // remove por nome
 *   ct.removeAt(5)            // remove por índice
 *   ct.rename('old', 'new')   // renomeia
 *   ct.names()                // retorna array de nomes atual
 */
function createColTracker(headerRow) {
  // Normaliza: gera nomes únicos para colunas vazias
  const _names = [];
  let emptyCount = 0;
  for (let i = 0; i < (headerRow || []).length; i++) {
    const raw = headerRow[i];
    if (raw == null || String(raw).trim() === '') {
      _names.push('_empty_' + emptyCount++);
    } else {
      _names.push(String(raw).trim());
    }
  }

  function _normalize(name) {
    return String(name || '').trim().toLowerCase();
  }

  function _findIndex(name) {
    const target = _normalize(name);
    for (let i = 0; i < _names.length; i++) {
      if (_normalize(_names[i]) === target) return i;
    }
    return -1;
  }

  return {
    /** Retorna o índice atual de uma coluna pelo nome (case-insensitive). Lança erro se não encontrada. */
    idx: function (name) {
      const i = _findIndex(name);
      if (i === -1) {
        throw new Error(
          'ColTracker: coluna "' + name + '" não encontrada. ' +
          'Colunas disponíveis: [' + _names.join(', ') + ']'
        );
      }
      return i;
    },

    /** Retorna o índice ou -1 se não encontrada (sem erro). */
    tryIdx: function (name) {
      return _findIndex(name);
    },

    /** Retorna o índice do primeiro nome encontrado dentre os argumentos. */
    idxOf: function () {
      for (let a = 0; a < arguments.length; a++) {
        const i = _findIndex(arguments[a]);
        if (i !== -1) return i;
      }
      throw new Error(
        'ColTracker: nenhuma coluna encontrada dentre ["' +
        Array.from(arguments).join('", "') + '"]. ' +
        'Colunas disponíveis: [' + _names.join(', ') + ']'
      );
    },

    /** Registra inserção de coluna na posição indicada. */
    insertAt: function (index, name) {
      _names.splice(index, 0, name || ('_ins_' + index));
    },

    /** Registra remoção de coluna pelo nome. Retorna o índice removido. */
    remove: function (name) {
      const i = _findIndex(name);
      if (i === -1) throw new Error('ColTracker.remove: coluna "' + name + '" não encontrada.');
      _names.splice(i, 1);
      return i;
    },

    /** Registra remoção de coluna pelo índice. */
    removeAt: function (index) {
      if (index >= 0 && index < _names.length) _names.splice(index, 1);
    },

    /** Renomeia uma coluna. */
    rename: function (oldName, newName) {
      const i = _findIndex(oldName);
      if (i !== -1) _names[i] = newName;
    },

    /** Retorna o nome da coluna no índice. */
    nameAt: function (index) {
      return index >= 0 && index < _names.length ? _names[index] : null;
    },

    /** Retorna cópia do array de nomes atual. */
    names: function () { return _names.slice(); },

    /** Retorna a quantidade de colunas rastreadas. */
    length: function () { return _names.length; },

    /** Debug: imprime mapeamento atual no console. */
    dump: function () {
      for (let i = 0; i < _names.length; i++) console.log('  [' + i + '] ' + _names[i]);
    }
  };
}

// =========================================================
// Wrappers: operação na matrix + atualização do tracker
// =========================================================

/** Deleta coluna por nome, atualizando matrix e tracker. */
function trackedDeleteCol(matrix, ct, name) {
  const idx = ct.idx(name);
  deleteColumn(matrix, idx);
  ct.removeAt(idx);
}

/** Deleta coluna por índice, atualizando matrix e tracker. */
function trackedDeleteAt(matrix, ct, index) {
  deleteColumn(matrix, index);
  ct.removeAt(index);
}

/** Insere coluna vazia na posição, atualizando matrix e tracker. */
function trackedInsertCol(matrix, ct, position, name) {
  insertColumn(matrix, position);
  ct.insertAt(position, name);
  if (matrix[0]) matrix[0][position] = name;
}

/** Mantém apenas as colunas cujos nomes estão na lista (por ordem da lista). */
function keepColumns(matrix, headerRow, keepNames) {
  const lowerKeep = keepNames.map(function (n) { return n.trim().toLowerCase(); });
  const indices = [];
  for (let k = 0; k < lowerKeep.length; k++) {
    for (let c = 0; c < headerRow.length; c++) {
      const h = String(headerRow[c] || '').trim().toLowerCase();
      if (h === lowerKeep[k] && indices.indexOf(c) === -1) { indices.push(c); break; }
    }
  }
  return matrix.map(function (row) {
    return indices.map(function (c) { return c < (row || []).length ? row[c] : null; });
  });
}

// =========================================================
// Nr emp. + Ano: formata "235" â†’ "235/2025" usando a coluna Data
// =========================================================

/**
 * Formata "Nr emp." adicionando o ano extraído da coluna "Data".
 * Ex: "235" com Data "15/01/2025" â†’ "235/2025"
 * Não altera valores que já contenham "/YYYY".
 *
 * @param {Array[]} matrix
 * @param {number}  colNrEmp - índice da coluna Nr emp.
 * @param {number}  colData  - índice da coluna Data
 * @param {number}  startRow - linha inicial (1 para pular header)
 */
function formatNrEmpComAno(matrix, colNrEmp, colData, startRow) {
  if (colNrEmp < 0 || colData < 0) return;
  for (let r = startRow; r < matrix.length; r++) {
    const nrEmp = safeGet(matrix, r, colNrEmp);
    const data = safeGet(matrix, r, colData);
    if (isEmptyCell(nrEmp) || isEmptyCell(data)) continue;

    const nrStr = String(nrEmp).trim();
    // Pular se vazio ou já contém /YYYY
    if (!nrStr || /\/\d{4}/.test(nrStr)) continue;

    const dataStr = String(data).trim();
    let ano = null;

    // Formato DD/MM/YYYY
    const m1 = /\/(\d{4})$/.exec(dataStr);
    if (m1) ano = m1[1];

    // Formato YYYY-MM-DD
    if (!ano) {
      const m2 = /^(\d{4})-/.exec(dataStr);
      if (m2) ano = m2[1];
    }

    if (ano) safeSet(matrix, r, colNrEmp, nrStr + '/' + ano);
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.TransformUtils = {
    isEmptyCell, extractDigits, sheetToMatrix, matrixToSheet,
    fillDown, removeEmptyColumns, removeEmptyRows,
    deleteColumn, deleteColumns, insertColumn,
    safeGet, safeSet, normalizeText, excelDateToString,
    col0, normalizeMatrix, fillMergedCells,
    findColumn, findColumnExact,
    createColTracker, trackedDeleteCol, trackedDeleteAt,
    trackedInsertCol, keepColumns, formatNrEmpComAno
  };
}

