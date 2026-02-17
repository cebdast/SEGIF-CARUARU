/**
 * Cruzamento de Dados SIGEF
 * Port de "Cruzamentos de dados.py" para JavaScript (browser)
 *
 * Recebe 9 matrizes (arrays 2D) já transformadas e cruza os dados
 * produzindo um workbook Excel com 5 abas.
 *
 * Dependências: SheetJS (XLSX), utils-transformacao.js (findColumn, etc.)
 */

// =========================================================
// Funções utilitárias de cruzamento
// =========================================================

/**
 * Extrai código numérico antes do hífen.
 * Ex: "123 - Manutenção predial" â†’ "123"
 *     "456" â†’ "456"
 */
function extractBeforeHyphen(value) {
  if (value == null) return '';
  var s = String(value).trim();
  var m = s.match(/^\s*(\d+)\s*-/);
  return m ? m[1].trim() : s;
}

/**
 * Extrai texto depois do hífen.
 * Ex: "123 - Manutenção predial" â†’ "Manutenção predial"
 */
function extractAfterHyphen(value) {
  if (value == null) return '';
  var s = String(value).trim();
  var idx = s.indexOf('-');
  return idx >= 0 ? s.substring(idx + 1).trim() : '';
}

/**
 * Remove todos os não-dígitos.
 * Ex: "12.345.678/0001-90" â†’ "12345678000190"
 */
function onlyDigits(value) {
  if (value == null) return '';
  return String(value).replace(/\D/g, '');
}

/**
 * Converte valor monetário brasileiro para float.
 * Aceita: "R$ 1.234,56", "1.234,56", "1234.56", "1234,56"
 */
function parseBRFloat(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  var s = String(value).trim()
    .replace(/\xa0/g, '')
    .replace(/R\$/g, '')
    .replace(/ /g, '');
  if (!s) return 0;

  // Formato brasileiro: 1.234,56 (ponto como milhar, vírgula como decimal)
  if (/\..*,/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.indexOf(',') >= 0) {
    // Apenas vírgula: 1234,56
    s = s.replace(',', '.');
  } else if (s.indexOf('.') >= 0) {
    // Possível separador de milhar: 30.000 (sem decimais)
    var parts = s.split('.');
    if (parts.length === 2 && parts[1].length > 2) {
      s = s.replace('.', ''); // Era milhar, não decimal
    }
  }

  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Normaliza string para comparação: trim + uppercase.
 */
function normKey(value) {
  if (value == null) return '';
  return String(value).trim();
}

// =========================================================
// Construção de Lookup Maps
// =========================================================

/**
 * Constrói um Map(chave â†’ objeto com valores) a partir de uma matrix.
 *
 * @param {Array[]} matrix       - Matrix 2D (row 0 = header)
 * @param {string}  keyColName   - Nome da coluna-chave no header
 * @param {Function} keyTransform - Função de transformação da chave (ex: extractBeforeHyphen)
 * @param {string[]} valueColNames - Nomes das colunas cujos valores queremos capturar
 * @returns {Map} chave â†’ { col1: val, col2: val, ... } (último valor prevalece)
 */
function buildLookupMap(matrix, keyColName, keyTransform, valueColNames) {
  var header = matrix[0] || [];
  var keyIdx = findColumn(header, keyColName);
  if (keyIdx < 0) return new Map();

  var valueIdxs = [];
  for (var i = 0; i < valueColNames.length; i++) {
    var idx = findColumn(header, valueColNames[i]);
    valueIdxs.push(idx);
  }

  var map = new Map();
  for (var r = 1; r < matrix.length; r++) {
    var row = matrix[r] || [];
    var rawKey = keyIdx < row.length ? row[keyIdx] : null;
    var key = keyTransform ? keyTransform(rawKey) : normKey(rawKey);
    if (!key) continue;

    var obj = {};
    for (var v = 0; v < valueColNames.length; v++) {
      var vi = valueIdxs[v];
      obj[valueColNames[v]] = (vi >= 0 && vi < row.length) ? row[vi] : null;
    }
    map.set(key, obj); // último valor prevalece (drop_duplicates keep="last")
  }
  return map;
}

/**
 * Constrói um Map(chave â†’ objeto) usando índice de coluna diretamente.
 * Útil quando a coluna-chave é identificada por índice.
 */
function buildLookupByIdx(matrix, keyIdx, keyTransform, valueSpecs) {
  // valueSpecs: [{ name: 'Nome', idx: 3 }, ...]
  var map = new Map();
  for (var r = 1; r < matrix.length; r++) {
    var row = matrix[r] || [];
    var rawKey = keyIdx < row.length ? row[keyIdx] : null;
    var key = keyTransform ? keyTransform(rawKey) : normKey(rawKey);
    if (!key) continue;

    var obj = {};
    for (var v = 0; v < valueSpecs.length; v++) {
      var spec = valueSpecs[v];
      obj[spec.name] = (spec.idx >= 0 && spec.idx < row.length) ? row[spec.idx] : null;
    }
    map.set(key, obj);
  }
  return map;
}

/**
 * Aplica um lookup map a uma matrix, adicionando novas colunas.
 *
 * @param {Array[]} matrix         - Matrix alvo (modificada in-place)
 * @param {string}  keyColName     - Nome da coluna-chave na matrix alvo
 * @param {Function} keyTransform  - Função de transformação da chave
 * @param {Map}     lookupMap      - Map(chave â†’ { col1: val, ... })
 * @param {string[]} newColNames   - Nomes das novas colunas a adicionar
 */
function applyLookup(matrix, keyColName, keyTransform, lookupMap, newColNames) {
  var header = matrix[0] || [];
  var keyIdx = findColumn(header, keyColName);
  if (keyIdx < 0) return;

  // Adicionar headers das novas colunas
  var startCol = header.length;
  for (var c = 0; c < newColNames.length; c++) {
    header.push(newColNames[c]);
  }

  // Preencher dados
  for (var r = 1; r < matrix.length; r++) {
    var row = matrix[r] || [];
    // Garantir tamanho
    while (row.length < startCol) row.push(null);

    var rawKey = keyIdx < row.length ? row[keyIdx] : null;
    var key = keyTransform ? keyTransform(rawKey) : normKey(rawKey);
    var found = key ? lookupMap.get(key) : null;

    for (var c2 = 0; c2 < newColNames.length; c2++) {
      row.push(found ? (found[newColNames[c2]] || null) : null);
    }
    matrix[r] = row;
  }
}

/**
 * Adiciona uma única coluna de source para target via join.
 */
function addColumnViaJoin(target, targetKeyCol, targetKeyTransform,
                          source, sourceKeyCol, sourceValueCol, newColName) {
  var sourceHeader = source[0] || [];
  var srcKeyIdx = findColumn(sourceHeader, sourceKeyCol);
  var srcValIdx = findColumn(sourceHeader, sourceValueCol);
  if (srcKeyIdx < 0 || srcValIdx < 0) return;

  // Build lookup
  var lookup = new Map();
  for (var r = 1; r < source.length; r++) {
    var row = source[r] || [];
    var rawKey = srcKeyIdx < row.length ? row[srcKeyIdx] : null;
    var key = targetKeyTransform ? targetKeyTransform(rawKey) : normKey(rawKey);
    if (key) lookup.set(key, (srcValIdx < row.length ? row[srcValIdx] : null));
  }

  // Apply
  var targetHeader = target[0] || [];
  var tKeyIdx = findColumn(targetHeader, targetKeyCol);
  if (tKeyIdx < 0) return;

  targetHeader.push(newColName);
  for (var r2 = 1; r2 < target.length; r2++) {
    var tRow = target[r2] || [];
    while (tRow.length < targetHeader.length - 1) tRow.push(null);
    var tRawKey = tKeyIdx < tRow.length ? tRow[tKeyIdx] : null;
    var tKey = targetKeyTransform ? targetKeyTransform(tRawKey) : normKey(tRawKey);
    tRow.push(tKey ? (lookup.get(tKey) || null) : null);
    target[r2] = tRow;
  }
}

/**
 * Busca coluna por nome com múltiplas tentativas.
 * Retorna o índice da primeira encontrada ou fallback.
 */
function findColMulti(header, names, fallbackIdx) {
  for (var i = 0; i < names.length; i++) {
    var idx = findColumn(header, names[i]);
    if (idx >= 0) return idx;
  }
  if (fallbackIdx !== undefined && fallbackIdx >= 0 && fallbackIdx < header.length) {
    return fallbackIdx;
  }
  return -1;
}


// =========================================================
// Cruzamento 1: Cruzar com Retidos
// =========================================================

/**
 * Cruza uma matrix-alvo com o workbook de retenções (multi-sheet).
 * Adiciona 11 colunas: Ret Total, Ret Total %, ISQN, ISQN %, IR, IR %,
 *                       INSS, INSS %, Outros, Outros %, Tipo Ret
 *
 * @param {Array[]} targetMatrix  - Matrix alvo (Liquidados, Pagos ou A Pagar)
 * @param {Object}  retWorkbook   - Workbook SheetJS do arquivo retidos
 * @param {string}  valorColName  - Nome da coluna de valor no target (para calcular %)
 */
function cruzarComRetidos(targetMatrix, retWorkbook, valorColName) {
  var somaTOTAL = {};
  var somaISQN = {};
  var somaIR = {};
  var somaINSS = {};
  var textoPorChave = {};

  var sheetNames = retWorkbook.SheetNames || [];

  for (var si = 0; si < sheetNames.length; si++) {
    var abaName = sheetNames[si];
    var abaUp = abaName.trim().toUpperCase();
    var ws = retWorkbook.Sheets[abaName];
    var abaMatrix = sheetToMatrix(ws, { raw: false, defval: '' });
    if (abaMatrix.length < 2) continue;

    var abaHeader = abaMatrix[0] || [];
    var chaveIdx = findColMulti(abaHeader, ['Seq. Liq.', 'Av.liquidação', 'Av. liquid'], 3);
    var valorRetidoIdx = findColumn(abaHeader, 'Valor retido');
    var valorIdx = findColumn(abaHeader, 'Valor');
    var retencaoIdx = findColumn(abaHeader, 'Retenção');

    if (chaveIdx < 0) continue;

    // Coletar textos de retenção (abas individuais, não GERAL/TOTAL/BRUTA/LISTA)
    if (abaUp !== 'GERAL' && abaUp !== 'TOTAL' &&
        abaUp !== 'PLANILHA BRUTA' && abaUp !== 'LISTA') {
      if (retencaoIdx >= 0) {
        for (var r = 1; r < abaMatrix.length; r++) {
          var chv = normKey(abaMatrix[r][chaveIdx]);
          var txt = normKey(abaMatrix[r][retencaoIdx]);
          if (chv && txt) {
            if (!textoPorChave[chv]) textoPorChave[chv] = {};
            textoPorChave[chv][txt] = true;
          }
        }
      }
    }

    // Somar por tipo
    if (abaUp === 'TOTAL') {
      _somarPorChave(abaMatrix, chaveIdx, valorIdx >= 0 ? valorIdx : 11, somaTOTAL);
      continue;
    }

    if (abaUp.indexOf('INSS') >= 0) {
      _somarPorChave(abaMatrix, chaveIdx, valorRetidoIdx >= 0 ? valorRetidoIdx : 8, somaINSS);
    } else if (abaUp.indexOf('IR') >= 0) {
      _somarPorChave(abaMatrix, chaveIdx, valorRetidoIdx >= 0 ? valorRetidoIdx : 8, somaIR);
    } else if (abaUp.indexOf('ISQN') >= 0 ||
               (abaUp.indexOf('ISS') >= 0 && abaUp.indexOf('INSS') < 0)) {
      _somarPorChave(abaMatrix, chaveIdx, valorRetidoIdx >= 0 ? valorRetidoIdx : 8, somaISQN);
    }
  }

  // Aplicar ao target
  var tHeader = targetMatrix[0] || [];
  var tChaveIdx = findColMulti(tHeader, ['Seq. liq.', 'Seq. Liq.', 'Av.liquidação', 'Av. liquid'], 2);
  var tValorIdx = findColumn(tHeader, valorColName);
  if (tChaveIdx < 0) return;

  // Adicionar 11 colunas
  var newCols = ['Ret Total', 'Ret Total %', 'ISQN', 'ISQN %', 'IR', 'IR %',
                 'INSS', 'INSS %', 'Outros', 'Outros %', 'Tipo Ret'];
  var startCol = tHeader.length;
  for (var nc = 0; nc < newCols.length; nc++) {
    tHeader.push(newCols[nc]);
  }

  for (var r2 = 1; r2 < targetMatrix.length; r2++) {
    var row = targetMatrix[r2] || [];
    while (row.length < startCol) row.push(null);

    var chave = normKey(row[tChaveIdx]);
    var valorBase = tValorIdx >= 0 ? parseBRFloat(row[tValorIdx]) : 0;

    var vTotal = chave ? (somaTOTAL[chave] || 0) : 0;
    var vISQN = chave ? (somaISQN[chave] || 0) : 0;
    var vIR = chave ? (somaIR[chave] || 0) : 0;
    var vINSS = chave ? (somaINSS[chave] || 0) : 0;
    var vOutros = vTotal - (vISQN + vIR + vINSS);

    // Arredondar a 2 casas decimais (número real, somável no Excel)
    var r2d = function(v) { return Math.round(v * 100) / 100; };
    // Retorna decimal bruto (0.30 = 30%). O formato % é aplicado na célula do Excel.
    var pct = function(a, b) {
      if (b === 0) return 0;
      return a / b; // Ex: 0.30 â†’ Excel exibe "30,00%"
    };

    var textos = '';
    if (chave && textoPorChave[chave]) {
      textos = Object.keys(textoPorChave[chave]).sort().join('; ');
    }

    row.push(r2d(vTotal));               // Ret Total
    row.push(pct(vTotal, valorBase));    // Ret Total %
    row.push(r2d(vISQN));               // ISQN
    row.push(pct(vISQN, valorBase));     // ISQN %
    row.push(r2d(vIR));                 // IR
    row.push(pct(vIR, valorBase));       // IR %
    row.push(r2d(vINSS));               // INSS
    row.push(pct(vINSS, valorBase));     // INSS %
    row.push(r2d(vOutros));             // Outros
    row.push(pct(vOutros, valorBase));   // Outros %
    row.push(textos);                    // Tipo Ret

    targetMatrix[r2] = row;
  }
}

/** Função auxiliar: soma valores de uma coluna agrupados por chave */
function _somarPorChave(abaMatrix, chaveIdx, valorIdx, destino) {
  for (var r = 1; r < abaMatrix.length; r++) {
    var row = abaMatrix[r] || [];
    var chave = normKey(chaveIdx < row.length ? row[chaveIdx] : '');
    if (!chave) continue;
    var valor = parseBRFloat(valorIdx < row.length ? row[valorIdx] : 0);
    destino[chave] = (destino[chave] || 0) + valor;
  }
}

/**
 * Adiciona coluna "Despesa" do Liquidados ao Retidos durante cruzarComRetidos.
 * Também usa para adicionar "Despesa" ao Pagos.
 */
function adicionarDespesaRetidos(retidosMatrix, liquidadosMatrix) {
  var srcHeader = liquidadosMatrix[0] || [];
  var srcKeyIdx = findColMulti(srcHeader, ['Seq. liq.', 'Seq. Liq.'], -1);
  var srcDespIdx = findColumn(srcHeader, 'Despesa');
  if (srcKeyIdx < 0 || srcDespIdx < 0) return;

  // Construir lookup: Seq. liq. â†’ Despesa
  var lookup = new Map();
  for (var r = 1; r < liquidadosMatrix.length; r++) {
    var row = liquidadosMatrix[r] || [];
    var key = normKey(srcKeyIdx < row.length ? row[srcKeyIdx] : '');
    var val = srcDespIdx < row.length ? row[srcDespIdx] : null;
    if (key && val != null) lookup.set(key, val);
  }

  // Aplicar ao target
  var tHeader = retidosMatrix[0] || [];
  var tKeyIdx = findColMulti(tHeader, ['Seq. Liq.', 'Seq. liq.', 'Av.liquidação'], -1);
  if (tKeyIdx < 0) return;

  // Verificar se "Despesa" já existe
  var existente = findColumn(tHeader, 'Despesa');
  if (existente >= 0) return; // Já tem

  tHeader.push('Despesa');
  for (var r2 = 1; r2 < retidosMatrix.length; r2++) {
    var tRow = retidosMatrix[r2] || [];
    while (tRow.length < tHeader.length - 1) tRow.push(null);
    var tKey = normKey(tKeyIdx < tRow.length ? tRow[tKeyIdx] : '');
    tRow.push(tKey ? (lookup.get(tKey) || null) : null);
    retidosMatrix[r2] = tRow;
  }
}


// =========================================================
// Cruzamento 2: Cruzar com Credores
// =========================================================

/**
 * Adiciona Município, CNPJ&CPF, Tipo de Cadastro a partir do arquivo Credores.
 *
 * Chave: "Credor/Fornecedor" â†’ extrai código antes de " - "
 * Lookup: Credores."Código"
 */
function cruzarComCredor(targetMatrix, credoresMatrix) {
  var credHeader = credoresMatrix[0] || [];
  var credKeyIdx = findColumn(credHeader, 'Código');
  if (credKeyIdx < 0) credKeyIdx = 0; // fallback

  var cidadeIdx = findColumn(credHeader, 'Cidade - UF');
  if (cidadeIdx < 0) cidadeIdx = findColumn(credHeader, 'Cidade');
  var cpfCnpjIdx = findColumn(credHeader, 'CPF_CNPJ');
  if (cpfCnpjIdx < 0) cpfCnpjIdx = findColumn(credHeader, 'CNPJ&CPF');
  var tipoIdx = findColumn(credHeader, 'Tipo');

  if (credKeyIdx < 0) return;

  // Construir lookup
  var lookup = new Map();
  for (var r = 1; r < credoresMatrix.length; r++) {
    var row = credoresMatrix[r] || [];
    var key = normKey(credKeyIdx < row.length ? row[credKeyIdx] : '');
    if (!key) continue;
    lookup.set(key, {
      'Município': cidadeIdx >= 0 && cidadeIdx < row.length ? row[cidadeIdx] : null,
      'CNPJ&CPF': cpfCnpjIdx >= 0 && cpfCnpjIdx < row.length ? row[cpfCnpjIdx] : null,
      'Tipo de Cadastro': tipoIdx >= 0 && tipoIdx < row.length ? row[tipoIdx] : null
    });
  }

  // Aplicar ao target
  var tHeader = targetMatrix[0] || [];
  var tCredIdx = findColumn(tHeader, 'Credor/Fornecedor');
  if (tCredIdx < 0) tCredIdx = findColumn(tHeader, 'Credor');
  if (tCredIdx < 0) return;

  var newCols = ['Município', 'CNPJ&CPF', 'Tipo de Cadastro'];
  var startCol = tHeader.length;
  for (var c = 0; c < newCols.length; c++) {
    tHeader.push(newCols[c]);
  }

  for (var r2 = 1; r2 < targetMatrix.length; r2++) {
    var tRow = targetMatrix[r2] || [];
    while (tRow.length < startCol) tRow.push(null);

    var rawCred = tCredIdx < tRow.length ? tRow[tCredIdx] : '';
    var key2 = extractBeforeHyphen(rawCred);
    var found = key2 ? lookup.get(key2) : null;

    for (var c2 = 0; c2 < newCols.length; c2++) {
      tRow.push(found ? (found[newCols[c2]] || null) : null);
    }
    targetMatrix[r2] = tRow;
  }
}


// =========================================================
// Cruzamento 3: Cruzar com Simples Nacional
// =========================================================

/**
 * Adiciona dados do Simples Nacional via CNPJ.
 *
 * Chave: "CNPJ&CPF" (ou "CNPJ" para retidos) â†’ somente dígitos
 * Lookup: Simples coluna 0 â†’ somente dígitos
 */
function cruzarComSimples(targetMatrix, simplesMatrix) {
  var simpHeader = simplesMatrix[0] || [];

  // Coluna-chave no Simples: primeira coluna (CNPJ)
  var simpKeyIdx = 0;

  // Identificar colunas no Simples por nome
  var optanteIdx = findColMulti(simpHeader, ['Optante', 'Optante?'], 5);
  var dataIniIdx = findColMulti(simpHeader, ['Data início', 'Data inicio', 'Data Início Simples'], 6);
  var natJurIdx = findColMulti(simpHeader, ['Natureza Jurídica', 'Natureza Juridica'], 11);
  var cnaePrinIdx = findColMulti(simpHeader, ['CNAE Principal'], 12);
  var cnaeDescIdx = findColMulti(simpHeader, ['CNAE Descrição', 'CNAE Descricao'], 13);

  // Construir lookup
  var lookup = new Map();
  for (var r = 1; r < simplesMatrix.length; r++) {
    var row = simplesMatrix[r] || [];
    var key = onlyDigits(row[simpKeyIdx]);
    if (!key) continue;
    lookup.set(key, {
      'Optante?': optanteIdx >= 0 && optanteIdx < row.length ? row[optanteIdx] : null,
      'Data início Simples': dataIniIdx >= 0 && dataIniIdx < row.length ? row[dataIniIdx] : null,
      'Natureza Jurídica': natJurIdx >= 0 && natJurIdx < row.length ? row[natJurIdx] : null,
      'CNAE Principal': cnaePrinIdx >= 0 && cnaePrinIdx < row.length ? row[cnaePrinIdx] : null,
      'CNAE Descrição': cnaeDescIdx >= 0 && cnaeDescIdx < row.length ? row[cnaeDescIdx] : null
    });
  }

  // Aplicar ao target
  var tHeader = targetMatrix[0] || [];
  // Buscar coluna CNPJ por múltiplos nomes possíveis
  var tCnpjIdx = findColMulti(tHeader, ['CNPJ&CPF', 'CNPJ', 'CPF_CNPJ', 'CPF/CNPJ'], -1);
  if (tCnpjIdx < 0) return; // Sem coluna CNPJ no target

  var newCols = ['Optante?', 'Data início Simples', 'Natureza Jurídica', 'CNAE Principal', 'CNAE Descrição'];
  var startCol = tHeader.length;
  for (var c = 0; c < newCols.length; c++) {
    tHeader.push(newCols[c]);
  }

  for (var r2 = 1; r2 < targetMatrix.length; r2++) {
    var tRow = targetMatrix[r2] || [];
    while (tRow.length < startCol) tRow.push(null);

    var rawCnpj = tCnpjIdx < tRow.length ? tRow[tCnpjIdx] : '';
    var key2 = onlyDigits(rawCnpj);
    var found = key2 ? lookup.get(key2) : null;

    for (var c2 = 0; c2 < newCols.length; c2++) {
      tRow.push(found ? (found[newCols[c2]] || null) : null);
    }
    targetMatrix[r2] = tRow;
  }
}


// =========================================================
// Cruzamento 4: Cruzar com Balancete
// =========================================================

/**
 * Adiciona Ação, Natureza da Despesa, Função, SubFunção, Programa.
 *
 * Chave no target: "Despesa" â†’ extrai código antes de " - "
 * Chave no Balancete: busca coluna por nome, fallback índice 6
 */
function cruzarComBalancete(targetMatrix, balanceteMatrix) {
  var balHeader = balanceteMatrix[0] || [];

  // Coluna-chave no Balancete (Nr emp. ou Empenho ou índice 6)
  var balKeyIdx = findColMulti(balHeader, ['Nr emp.', 'Nr empenho', 'Empenho'], 6);
  if (balKeyIdx < 0) return;

  // Colunas de valor no Balancete
  var acaoIdx = findColMulti(balHeader, ['Ação', 'Acao'], 5);
  var natDespIdx = findColMulti(balHeader, ['Natureza da Despesa', 'Natureza'], 9);
  var funcaoIdx = findColMulti(balHeader, ['Função', 'Funcao'], 2);
  var subFuncIdx = findColMulti(balHeader, ['SubFunção', 'SubFuncao', 'Subfunção', 'Subfuncao'], 3);
  var programaIdx = findColMulti(balHeader, ['Programa'], 4);

  // Construir lookup
  var lookup = new Map();
  for (var r = 1; r < balanceteMatrix.length; r++) {
    var row = balanceteMatrix[r] || [];
    var key = normKey(balKeyIdx < row.length ? row[balKeyIdx] : '');
    if (!key) continue;
    lookup.set(key, {
      'Ação': acaoIdx >= 0 && acaoIdx < row.length ? row[acaoIdx] : null,
      'Natureza da Despesa': natDespIdx >= 0 && natDespIdx < row.length ? row[natDespIdx] : null,
      'Função': funcaoIdx >= 0 && funcaoIdx < row.length ? row[funcaoIdx] : null,
      'SubFunção': subFuncIdx >= 0 && subFuncIdx < row.length ? row[subFuncIdx] : null,
      'Programa': programaIdx >= 0 && programaIdx < row.length ? row[programaIdx] : null
    });
  }

  // Aplicar ao target via coluna "Despesa"
  var tHeader = targetMatrix[0] || [];
  var tDespIdx = findColumn(tHeader, 'Despesa');
  if (tDespIdx < 0) return; // Sem coluna Despesa â†’ pular

  var newCols = ['Ação', 'Natureza da Despesa', 'Função', 'SubFunção', 'Programa'];
  var startCol = tHeader.length;
  for (var c = 0; c < newCols.length; c++) {
    tHeader.push(newCols[c]);
  }

  for (var r2 = 1; r2 < targetMatrix.length; r2++) {
    var tRow = targetMatrix[r2] || [];
    while (tRow.length < startCol) tRow.push(null);

    var rawDesp = tDespIdx < tRow.length ? tRow[tDespIdx] : '';
    var key2 = extractBeforeHyphen(rawDesp);
    var found = key2 ? lookup.get(key2) : null;

    for (var c2 = 0; c2 < newCols.length; c2++) {
      tRow.push(found ? (found[newCols[c2]] || null) : null);
    }
    targetMatrix[r2] = tRow;
  }
}


// =========================================================
// Cruzamento 5: Cruzar com Detalhamento
// =========================================================

/**
 * Adiciona Detalhamento despesa.
 *
 * Chave no target: "Despesa" â†’ extrai texto depois de " - "
 * Chave no Detalhamento: primeira coluna
 */
function cruzarComDetalhamento(targetMatrix, detalhamentoMatrix) {
  var detHeader = detalhamentoMatrix[0] || [];
  var detKeyIdx = 0; // Primeira coluna
  var detValIdx = detHeader.length > 1 ? 1 : 0; // Segunda coluna

  // Buscar por nome se possível
  var detValByName = findColumn(detHeader, 'Detalhamento');
  if (detValByName >= 0) detValIdx = detValByName;

  // Construir lookup
  var lookup = new Map();
  for (var r = 1; r < detalhamentoMatrix.length; r++) {
    var row = detalhamentoMatrix[r] || [];
    var key = normKey(detKeyIdx < row.length ? row[detKeyIdx] : '');
    if (!key) continue;
    lookup.set(key, detValIdx < row.length ? row[detValIdx] : null);
  }

  // Aplicar ao target via coluna "Despesa" (texto após o hífen)
  var tHeader = targetMatrix[0] || [];
  var tDespIdx = findColumn(tHeader, 'Despesa');
  if (tDespIdx < 0) return; // Sem coluna Despesa â†’ pular

  tHeader.push('Detalhamento despesa');
  for (var r2 = 1; r2 < targetMatrix.length; r2++) {
    var tRow = targetMatrix[r2] || [];
    while (tRow.length < tHeader.length - 1) tRow.push(null);

    var rawDesp = tDespIdx < tRow.length ? tRow[tDespIdx] : '';
    var key2 = extractAfterHyphen(rawDesp);
    var found = key2 ? lookup.get(key2) : null;

    tRow.push(found || null);
    targetMatrix[r2] = tRow;
  }
}


// =========================================================
// Auto-detecção de arquivos por nome
// =========================================================

var _CRUZAR_ALVOS = [
  {
    role: 'liquidados',
    label: 'Emp. Liquidados',
    gruposFortes: [['liquidados']],
    palavras: ['relacao', 'empenhos', 'liquidados', 'movimento', 'mensal', 'completo', 'final'],
    obrigatorio: true
  },
  {
    role: 'pagos',
    label: 'Emp. Pagos',
    gruposFortes: [['pagos', 'sintetico'], ['empenhos', 'pagos']],
    palavras: ['empenhos', 'pagos', 'sintetico', 'relacao'],
    obrigatorio: true
  },
  {
    role: 'emitidos',
    label: 'Emp. Emitidos',
    gruposFortes: [['empenhos', 'emitidos']],
    palavras: ['empenhos', 'emitidos', 'relacao', 'mensal'],
    obrigatorio: true
  },
  {
    role: 'aPagar',
    label: 'Empenhos a pagar',
    gruposFortes: [['empenhos', 'pagar']],
    palavras: ['relacao', 'empenhos', 'pagar', 'a'],
    obrigatorio: true
  },
  {
    role: 'retidos',
    label: 'Empenhos retidos',
    gruposFortes: [['retencao'], ['retencoes'], ['retencao', 'separada'], ['retencao', 'final']],
    palavras: ['retencao', 'retencoes', 'reten', 'final', 'separada'],
    antiPalavras: ['consignados', 'analitico'],
    obrigatorio: true
  },
  {
    role: 'credores',
    label: 'Credores',
    gruposFortes: [['credores'], ['fornecedores']],
    palavras: ['relacao', 'credores', 'fornecedores', 'credor'],
    obrigatorio: true
  },
  {
    role: 'simples',
    label: 'Simples Nacional (opcional)',
    gruposFortes: [['simples', 'nacional'], ['simples']],
    palavras: ['simples', 'nacional', 'resultado', 'planilha'],
    obrigatorio: false
  },
  {
    role: 'balancete',
    label: 'Balancete',
    gruposFortes: [['balancete', 'despesa'], ['balancete']],
    palavras: ['balancete', 'despesa'],
    obrigatorio: true
  },
  {
    role: 'detalhamento',
    label: 'Detalhamento',
    gruposFortes: [['detalhamento'], ['despesa', 'natureza'], ['relatorio', 'natureza', 'consolidado']],
    palavras: ['despesa', 'natureza', 'detalhamento', 'relatorio', 'consolidado'],
    obrigatorio: true
  }
];

function _normNomeArquivo(s) {
  if (!s) return '';
  // Remove acentos e converte para lowercase
  var n = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  n = n.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  return n;
}

function _scoreNome(nome, alvo) {
  var n = _normNomeArquivo(nome);
  var score = 0;

  // Anti-palavras: se o nome contiver alguma, retornar score 0 (rejeitar)
  if (alvo.antiPalavras) {
    for (var ap = 0; ap < alvo.antiPalavras.length; ap++) {
      if (n.indexOf(_normNomeArquivo(alvo.antiPalavras[ap])) >= 0) return 0;
    }
  }

  for (var p = 0; p < alvo.palavras.length; p++) {
    if (n.indexOf(_normNomeArquivo(alvo.palavras[p])) >= 0) score += 3;
  }

  for (var g = 0; g < alvo.gruposFortes.length; g++) {
    var grupo = alvo.gruposFortes[g];
    var ok = true;
    for (var gi = 0; gi < grupo.length; gi++) {
      if (n.indexOf(_normNomeArquivo(grupo[gi])) < 0) { ok = false; break; }
    }
    if (ok) score += 25;
  }

  return score;
}

/**
 * Auto-detecta arquivos por nome.
 *
 * @param {File[]} files - Lista de File objects
 * @returns {{ matches: Object, missing: string[] }}
 *   matches: { role: File, ... }
 *   missing: roles não encontradas
 */
function autoDetectarArquivos(files) {
  var matches = {};
  var missing = [];
  var usados = {};

  for (var a = 0; a < _CRUZAR_ALVOS.length; a++) {
    var alvo = _CRUZAR_ALVOS[a];
    var melhor = null;
    var melhorScore = 0;

    for (var f = 0; f < files.length; f++) {
      var file = files[f];
      var nome = file.name || '';
      if (usados[nome]) continue; // Já usado por outro role

      var ext = nome.toLowerCase();
      if (!ext.endsWith('.xlsx') && !ext.endsWith('.xls') && !ext.endsWith('.xlsm')) continue;
      if (nome.startsWith('~$')) continue; // Temporário do Excel

      var score = _scoreNome(nome, alvo);
      if (score > melhorScore) {
        melhorScore = score;
        melhor = file;
      }
    }

    if (melhor && melhorScore >= 25) {
      matches[alvo.role] = melhor;
      usados[melhor.name] = true;
    } else if (alvo.obrigatorio) {
      missing.push(alvo.label);
    }
  }

  return { matches: matches, missing: missing };
}


// =========================================================
// Orquestrador principal
// =========================================================

/**
 * Executa todo o pipeline de cruzamento.
 *
 * @param {Object} matrices - { liquidados, pagos, emitidos, aPagar, retidos, credores, simples, balancete, detalhamento }
 *   Cada valor é uma matrix 2D (array de arrays) exceto retidos que é o workbook SheetJS.
 * @param {Object} retWorkbook - Workbook SheetJS do arquivo retidos (multi-sheet)
 * @param {Function} onProgress - Callback(fase, mensagem) para progresso
 * @returns {Object} workbook SheetJS de saída
 */
function executarCruzamento(matrices, retWorkbook, onProgress, options) {
  var log = onProgress || function() {};
  var opts = options || {};

  var liquidados = matrices.liquidados;
  var pagos = matrices.pagos;
  var emitidos = matrices.emitidos;
  var aPagar = matrices.aPagar;
  var retidos = matrices.retidos; // Matrix da aba GERAL (ou primeira aba)
  var consignados = matrices.consignados; // Matrix de Consignados (V2)
  var credores = matrices.credores;
  var simples = matrices.simples;
  var balancete = matrices.balancete;
  var detalhamento = matrices.detalhamento;

  // A 5ª aba: retidos (padrão) ou consignados (V2)
  var quintaAba = opts.skipRetidos ? consignados : retidos;
  var quintaAbaNome = opts.skipRetidos ? 'Empenhos retidos' : 'Empenhos retidos';

  if (!opts.skipRetidos) {
    // =====================================================
    // Fase 0: Enriquecer Retidos e Pagos com "Despesa"
    // =====================================================
    log(0, 'Adicionando coluna Despesa ao Retidos e Pagos...');
    adicionarDespesaRetidos(retidos, liquidados);
    adicionarDespesaRetidos(pagos, liquidados);

    // =====================================================
    // Fase 1: Cruzar com Retidos
    // =====================================================
    log(1, 'Cruzando com Retenções (Liquidados, Pagos, A Pagar)...');
    cruzarComRetidos(liquidados, retWorkbook, 'Valor (R$)');
    cruzarComRetidos(pagos, retWorkbook, 'Valor (R$)');
    cruzarComRetidos(aPagar, retWorkbook, 'Valor (R$)');
  } else {
    log(0, 'Modo V2 — pulando enriquecimento Retidos...');
    log(1, 'Modo V2 — pulando cruzamento com Retenções...');
  }

  // =====================================================
  // Fase 2: Cruzar com Credores (TODAS as 5 abas)
  // =====================================================
  log(2, 'Cruzando com Credores...');
  var allTabs = [liquidados, pagos, emitidos, aPagar, quintaAba];
  for (var t = 0; t < allTabs.length; t++) {
    cruzarComCredor(allTabs[t], credores);
  }

  // =====================================================
  // Fase 3: Cruzar com Balancete (TODAS as 5 abas)
  // =====================================================
  log(3, 'Cruzando com Balancete...');
  for (var t3 = 0; t3 < allTabs.length; t3++) {
    cruzarComBalancete(allTabs[t3], balancete);
  }

  // =====================================================
  // Fase 4: Cruzar com Detalhamento (TODAS as 5 abas)
  // =====================================================
  log(4, 'Cruzando com Detalhamento...');
  for (var t4 = 0; t4 < allTabs.length; t4++) {
    cruzarComDetalhamento(allTabs[t4], detalhamento);
  }

  // =====================================================
  // Fase 5: Cruzar com Simples Nacional (OPCIONAL - TODAS as 5 abas)
  // Fica por último para que suas colunas fiquem no final
  // =====================================================
  if (simples && simples.length > 1) {
    log(5, 'Cruzando com Simples Nacional...');
    for (var t2 = 0; t2 < allTabs.length; t2++) {
      cruzarComSimples(allTabs[t2], simples);
    }
  } else {
    log(5, 'Simples Nacional não fornecido — pulando...');
  }

  // =====================================================
  // Formatação final: arredondar valores numéricos a 2 casas decimais
  // =====================================================
  log(6, 'Formatando valores...');

  var allMatrices = [liquidados, pagos, emitidos, aPagar, quintaAba];
  var colsParaArredondar = ['Valor (R$)', 'Valor retido', 'Valor'];

  for (var fm = 0; fm < allMatrices.length; fm++) {
    var mat = allMatrices[fm];
    if (!mat || mat.length < 2) continue;
    var hdr = mat[0];

    for (var fc = 0; fc < colsParaArredondar.length; fc++) {
      var ci = findColumn(hdr, colsParaArredondar[fc]);
      if (ci < 0) continue;
      for (var fr = 1; fr < mat.length; fr++) {
        var val = mat[fr] && ci < mat[fr].length ? mat[fr][ci] : null;
        if (val == null) continue;
        if (typeof val === 'number') {
          mat[fr][ci] = Math.round(val * 100) / 100;
        } else if (typeof val === 'string') {
          var num = parseFloat(val.replace(',', '.'));
          if (!isNaN(num)) mat[fr][ci] = Math.round(num * 100) / 100;
        }
      }
    }
  }

  // =====================================================
  // Preparar lista de abas
  // =====================================================
  var abas = [
    { nome: 'Emp. Liquidados', matrix: liquidados },
    { nome: 'Emp. Pagos', matrix: pagos },
    { nome: 'Emp. Emitidos', matrix: emitidos },
    { nome: 'Empenhos a pagar', matrix: aPagar },
    { nome: quintaAbaNome, matrix: quintaAba }
  ];

  // =====================================================
  // Modo leve: retornar apenas matrizes (sem gerar workbook pesado)
  // =====================================================
  if (opts.returnMatricesOnly) {
    log(7, 'Concluído (modo leve — matrizes)!');
    return { abas: abas };
  }

  // =====================================================
  // Gerar workbook de saída (modo padrão)
  // =====================================================
  log(7, 'Gerando workbook final...');
  var outWb = XLSX.utils.book_new();

  // Colunas que devem ter formato de porcentagem no Excel (só quando tem retidos)
  var colsPct = opts.skipRetidos ? [] : ['Ret Total %', 'ISQN %', 'IR %', 'INSS %', 'Outros %'];

  for (var a2 = 0; a2 < abas.length; a2++) {
    var ws = matrixToSheet(abas[a2].matrix);

    // Aplicar formato % nas colunas de porcentagem
    if (colsPct.length > 0) {
      var hdr = abas[a2].matrix[0] || [];
      for (var pc = 0; pc < colsPct.length; pc++) {
        var colIdx = -1;
        for (var hc = 0; hc < hdr.length; hc++) {
          if (hdr[hc] === colsPct[pc]) { colIdx = hc; break; }
        }
        if (colIdx < 0) continue;

        // Percorrer todas as linhas de dados e aplicar z:'0.00%'
        for (var pr = 1; pr < abas[a2].matrix.length; pr++) {
          var cellRef = XLSX.utils.encode_cell({ r: pr, c: colIdx });
          if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
            ws[cellRef].z = '0.00%';
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(outWb, ws, abas[a2].nome);
  }

  log(7, 'Concluído!');
  return outWb;
}


// =========================================================
// Exportar para uso global
// =========================================================
if (typeof window !== 'undefined') {
  window.CruzarDados = {
    extractBeforeHyphen: extractBeforeHyphen,
    extractAfterHyphen: extractAfterHyphen,
    onlyDigits: onlyDigits,
    parseBRFloat: parseBRFloat,
    normKey: normKey,
    buildLookupMap: buildLookupMap,
    applyLookup: applyLookup,
    addColumnViaJoin: addColumnViaJoin,
    findColMulti: findColMulti,
    cruzarComRetidos: cruzarComRetidos,
    adicionarDespesaRetidos: adicionarDespesaRetidos,
    cruzarComCredor: cruzarComCredor,
    cruzarComSimples: cruzarComSimples,
    cruzarComBalancete: cruzarComBalancete,
    cruzarComDetalhamento: cruzarComDetalhamento,
    autoDetectarArquivos: autoDetectarArquivos,
    executarCruzamento: executarCruzamento,
    _CRUZAR_ALVOS: _CRUZAR_ALVOS
  };
}

