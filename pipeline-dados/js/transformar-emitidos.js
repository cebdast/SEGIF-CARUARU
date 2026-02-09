/**
 * Transformação: Empenhos Emitidos
 * Port de Empenhos emitidos.py
 *
 * Pipeline:
 * 1. Ler matrix (sem preencher merges)
 * 2. Excluir linha "Unidade Gestora:"
 * 3. Limpar Valor quando H vazio, limpar "Objeto:" da Data
 * 4. Mover Nr emp. para coluna-alvo quando Espécie vazia
 * 5. Excluir coluna G, subir coluna-alvo, excluir coluna antiga
 * 6. Remover linhas vazias, fill-down Data
 * 7. Extrair Tipo/Documento (MEMO/PAD) do texto Objeto
 * 8. Formatar datas
 */

// =========================================================
// Regex pré-compilados para extração MEMO/PAD
// =========================================================
const _RE_EMI_LIMPAR = /\D/g;
const _RE_EMI_NUM_ANO = /([0-9][0-9\.\s]*)\s*\/\s*(\d{4})/;
const _RE_EMI_PAD_SEM = /\b(?:PAD|PA|PAA)\b[^0-9]*([0-9][0-9\.\s]*)/i;
const _RE_EMI_FIRST_N = /([0-9][0-9\.\s]*)/;
const _RE_EMI_PURO = /^[0-9][0-9\.]*\s*\/\s*\d{4}$/;
const _RE_EMI_DESP = /(?<!\d)\d{2}\.\d{2}(?!\d)/;
const _RE_EMI_CONTR = /CONTRATO.*PROCESSO\s+ADMINISTRATIVO/;
const _RE_EMI_PAREN = /^\(([^)]+)\)/;

function _emiLimpar(t) { return (t || '').replace(_RE_EMI_LIMPAR, ''); }

function _emiNumComAno(txt) {
  const s = typeof txt === 'string' ? txt : String(txt || '');
  const m = _RE_EMI_NUM_ANO.exec(s);
  if (!m) return '';
  const n = _emiLimpar(m[1]), a = m[2];
  return (n && a) ? `${n}/${a}` : '';
}

function _emiNumPadSem(txt) {
  const s = typeof txt === 'string' ? txt : String(txt || '');
  const m = _RE_EMI_PAD_SEM.exec(s);
  return m ? _emiLimpar(m[1]) : '';
}

function _emiEhPrestador(dv) {
  if (dv == null) return false;
  const s = String(dv);
  if (!s.trim()) return false;
  if (s.includes('.35.') || s.includes('.79.')) return false;
  return s.includes('.35') || s.includes('.79');
}

function _emiExtrair(val, despVal) {
  if (val == null) {
    if (despVal != null) return _emiEhPrestador(despVal) ? ['prestador', ''] : ['outros', ''];
    return ['', ''];
  }
  let s = String(val).trim();
  if (!s) {
    if (despVal != null) return _emiEhPrestador(despVal) ? ['prestador', ''] : ['outros', ''];
    return ['', ''];
  }
  if (s.startsWith('((')) s = '(' + s.substring(2);

  const mp = _RE_EMI_PAREN.exec(s);
  const princ = mp ? mp[1].trim() : s.trim();

  let un = princ.toUpperCase().trim()
    .replace(/MEMORANDO/g, 'MEMO')
    .replace(/\bMOEMORANDO\b/g, 'MEMO')
    .replace(/\bMEO\b/g, 'MEMO')
    .replace(/\bMWMO\b/g, 'MEMO')
    .replace(/\bMEMRANDOO\b/g, 'MEMO')
    .replace(/\bMEMRANDO\b/g, 'MEMO');

  const ui = un.replace(/[^\w]+/g, ' ').trim();
  const isPad = /^(PAD|PAA|PA)\b/.test(ui);
  let isPA = /^PROCESSO\s+ADMINI?STRATIVO\b/.test(ui);
  if (isPA && _RE_EMI_CONTR.test(un)) isPA = false;

  if (isPA || isPad) {
    const df = _emiNumComAno(princ);
    let no = df ? df.split('/')[0] : '';
    if (!no) no = _emiNumPadSem(princ);
    if (no && no.length <= 4) return ['pad', df || no];
    if (despVal != null) return _emiEhPrestador(despVal) ? ['prestador', ''] : ['outros', ''];
    return ['', ''];
  }

  if (un.includes('MEMO') || _RE_EMI_PURO.test(un)) {
    const df = _emiNumComAno(princ);
    if (df) return ['memo', df];
    const m0 = _RE_EMI_FIRST_N.exec(princ);
    return ['memo', m0 ? _emiLimpar(m0[1]) : ''];
  }

  if (despVal != null) return _emiEhPrestador(despVal) ? ['prestador', ''] : ['outros', ''];
  return ['', ''];
}

// =========================================================
// Detecção da coluna Despesa
// =========================================================
function _emiDetectDesp(header, body) {
  for (let c = 0; c < header.length; c++) {
    if (header[c] && String(header[c]).trim().toLowerCase() === 'despesa') return c;
  }
  let bc = -1, bs = 0;
  const mr = Math.min(body.length, 200);
  for (let c = 0; c < header.length; c++) {
    let sc = 0;
    for (let r = 0; r < mr; r++) {
      const v = (body[r] || [])[c];
      if (v == null) continue;
      const sv = String(v).trim();
      if (!sv || sv.includes('.35.') || sv.includes('.79.')) continue;
      if (sv.includes('.35') || sv.includes('.79')) { sc += 2; continue; }
      if (_RE_EMI_DESP.test(sv)) sc++;
    }
    if (sc > bs) { bs = sc; bc = c; }
  }
  return (bc >= 0 && bs >= 6) ? bc : -1;
}

// =========================================================
// Transformação principal
// =========================================================
function transformarEmitidos(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  fillMergedCells(sheet); // Desmesclar células antes de ler a matrix
  let matrix = sheetToMatrix(sheet, { raw: true });
  normalizeMatrix(matrix);
  const linhasOriginal = matrix.length - 1;

  // Pre-Step: Detectar Unidade gestora ANTES de qualquer remoção de linhas
  // Busca "Unidade gestora:" em qualquer coluna → nome da unidade em outra célula da mesma linha
  {
    let unidadeAtual = null;
    const reUnidade = /^unidade\s*gestora/i;
    for (let r = 1; r < matrix.length; r++) {
      let isMarker = false;
      let markerCol = -1;

      for (let c = 0; c < (matrix[r] || []).length; c++) {
        const v = matrix[r][c];
        if (v && typeof v === 'string' && reUnidade.test(v.trim())) {
          isMarker = true;
          markerCol = c;
          break;
        }
      }

      if (isMarker) {
        // Buscar o nome da unidade na mesma linha (primeira célula longa, ignorando o marcador)
        for (let c = 0; c < (matrix[r] || []).length; c++) {
          if (c === markerCol) continue;
          const v = matrix[r][c];
          if (v && typeof v === 'string' && v.trim().length > 10) {
            unidadeAtual = v.trim();
            break;
          }
        }
        matrix[r]._isUnidadeMarker = true;
      }

      matrix[r]._unidadeGestora = unidadeAtual;
    }
  }

  // 1) Excluir linha 2 (Unidade Gestora:) — somente se NÃO for marcadora (já será filtrada depois)
  if (matrix.length > 1 && !matrix[1]._isUnidadeMarker) {
    matrix.splice(1, 1);
  }

  const header = matrix[0] || [];
  const ct = createColTracker(header);

  // Localizar colunas por nome (fail-fast se não encontradas)
  const valorCol = ct.idx('Valor (R$)');
  const dataCol = ct.idx('Data');
  const especieCol = ct.idx('Espécie');
  const nrempCol = ct.idx('Nr emp.');
  const credorCol = ct.idx('Credor/Fornecedor');
  const fonteCol = ct.idx('Fonte de recursos');

  // 2) Credor/Fornecedor vazio → limpar Valor (R$)
  //    (linhas sem credor são linhas de texto "Objeto", não dados reais)
  for (let r = 1; r < matrix.length; r++) {
    if (isEmptyCell(safeGet(matrix, r, credorCol))) safeSet(matrix, r, valorCol, null);
  }

  // 3) Data contém "Objeto:" → limpar
  for (let r = 1; r < matrix.length; r++) {
    const v = safeGet(matrix, r, dataCol);
    if (typeof v === 'string' && v.includes('Objeto:')) safeSet(matrix, r, dataCol, null);
  }

  // 4) Espécie vazia → mover Nr emp. para coluna-alvo (última+1)
  let maxC = 0;
  for (let i = 0; i < matrix.length; i++) {
    const len = (matrix[i] || []).length;
    if (len > maxC) maxC = len;
  }
  const tgt = maxC;
  for (let r = 1; r < matrix.length; r++) {
    if (isEmptyCell(safeGet(matrix, r, especieCol))) {
      const val = safeGet(matrix, r, nrempCol);
      if (val !== null && val !== undefined && val !== '') {
        safeSet(matrix, r, tgt, val);
        safeSet(matrix, r, nrempCol, null);
      }
    }
  }

  // 5) Excluir coluna vazia entre "Fonte de recursos" e "Credor/Fornecedor"
  const emptyAfterFonte = fonteCol + 1;
  deleteColumn(matrix, emptyAfterFonte);
  ct.removeAt(emptyAfterFonte);
  let objetoCol = tgt - 1; // posição do Objeto após primeira deleção

  // 6) Subir coluna-alvo 1 linha (Objeto estava na linha de baixo)
  for (let r = 1; r < matrix.length - 1; r++) {
    safeSet(matrix, r, objetoCol, safeGet(matrix, r + 1, objetoCol));
  }
  if (matrix.length > 1) safeSet(matrix, matrix.length - 1, objetoCol, null);

  // 7) Excluir coluna vazia após "Valor (R$)"
  const valorIdxNow = ct.idx('Valor (R$)');
  const colToDelete = valorIdxNow + 1;
  deleteColumn(matrix, colToDelete);
  ct.removeAt(colToDelete);
  // Ajustar posição do Objeto se a coluna deletada estava antes dele
  if (colToDelete < objetoCol) objetoCol--;

  // 8) Remover linhas vazias e linhas marcadoras de "Unidade Gestora:"
  matrix = matrix.filter((row, r) => {
    if (r === 0) return true;
    if (row._isUnidadeMarker) return false;
    return (row || []).some(v => !isEmptyCell(v));
  });

  // 9) Fill-down coluna Data
  fillDown(matrix, ct.idx('Data'), 1);

  // 10) Detectar coluna Despesa
  const despIdx = ct.tryIdx('Despesa');

  // 11) Formatar coluna Data como DD/MM/AAAA (ANTES de extrair tipo/doc e Nr emp./ano)
  const dataFmt = ct.idx('Data');
  for (let r = 1; r < matrix.length; r++) {
    matrix[r][dataFmt] = excelDateToString(matrix[r][dataFmt]);
  }

  // 12) Nr emp. → adicionar /ANO extraído da coluna Data (ex: 235 → 235/2025)
  const nrEmpIdx = ct.idx('Nr emp.');
  console.log('[Emitidos] Nr emp. col=' + nrEmpIdx + ', Data col=' + dataFmt +
    ', amostra Nr emp.=[' + safeGet(matrix, 1, nrEmpIdx) + '], Data=[' + safeGet(matrix, 1, dataFmt) + ']');
  formatNrEmpComAno(matrix, nrEmpIdx, dataFmt, 1);
  console.log('[Emitidos] Após formatNrEmpComAno: Nr emp.=[' + safeGet(matrix, 1, nrEmpIdx) + ']');

  // 13) Extrair Tipo/Documento da coluna Objeto (rastreada por objetoCol)
  while (matrix[0].length <= objetoCol) matrix[0].push(null);
  // Renomear coluna Objeto para "Hist.Liq"
  matrix[0][objetoCol] = 'Hist.Liq';
  console.log('[Emitidos] objetoCol=' + objetoCol + ', header[objetoCol]=' + matrix[0][objetoCol] +
    ', amostra data=[' + safeGet(matrix, 1, objetoCol) + ']');

  const tipoI = matrix[0].length;
  const docI = matrix[0].length + 1;
  matrix[0].push('Tipo', 'Documento');

  for (let r = 1; r < matrix.length; r++) {
    while (matrix[r].length < docI + 1) matrix[r].push(null);
    const [tipo, doc] = _emiExtrair(
      safeGet(matrix, r, objetoCol),
      despIdx >= 0 ? safeGet(matrix, r, despIdx) : null
    );
    matrix[r][tipoI] = tipo || null;
    matrix[r][docI] = doc || null;
  }

  // 14) Adicionar coluna "Unidade gestora" usando anotação pré-calculada
  {
    for (let r = 0; r < matrix.length; r++) {
      matrix[r].splice(1, 0, null);
    }
    matrix[0][1] = 'Unidade gestora';
    for (let r = 1; r < matrix.length; r++) {
      matrix[r][1] = matrix[r]._unidadeGestora || null;
    }
  }

  const outSheet = matrixToSheet(matrix);
  const outWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(outWb, outSheet, workbook.SheetNames[0]);

  return {
    workbook: outWb,
    matrix: matrix,
    stats: {
      linhasOriginal,
      linhasFinal: matrix.length - 1,
      linhasRemovidas: linhasOriginal - (matrix.length - 1)
    }
  };
}
