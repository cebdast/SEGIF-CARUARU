/**
 * Transformação: Empenhos Liquidados
 * Port de Empenhos Liquidados.py (39 etapas)
 *
 * Saída: workbook com 2 abas — "Liquidados Final" e "Planilha Bruta Liq"
 */

// =========================================================
// Regex pré-compilados
// =========================================================
const _LIQ_OBJETO_RE = /objeto:/gi;
const _LIQ_YEAR_DUP = /\/(\d{4})\/(\1)/gi;
const _LIQ_MEMO_PAD = /(?:MEMO|PAD)[^0-9]*([0-9\.]+)/i;
const _LIQ_PAREN = /^\(([^)]+)\)/i;
const _LIQ_EXTRACT = /(.{0,80}\/\d{4})/i;

// =========================================================
// Extração Tipo/Documento para Liquidados (col L de ws_m)
// =========================================================
function _liqProcessarConteudo(rawL) {
  if (typeof rawL !== 'string' || !rawL.trim()) return [null, null, ''];

  let txtL = rawL.trim();
  if (txtL.startsWith('((')) txtL = '(' + txtL.substring(2);

  const mP = _LIQ_PAREN.exec(txtL);
  let principal = mP ? mP[1].trim() : txtL;
  principal = principal.replace(_LIQ_YEAR_DUP, '/$1');
  const up = principal.toUpperCase();

  let categoria, texto2;
  if (up.includes('MEMORANDO') || up.includes('MEMO')) {
    categoria = 'memo';
    texto2 = up.replace(/MEMORANDO/g, 'MEMO');
  } else if (up.includes('PAD') || up.includes('PROCESSO ADMINISTRATIVO')) {
    categoria = 'pad';
    texto2 = up.replace(/PROCESSO ADMINISTRATIVO/g, 'PAD');
  } else {
    categoria = 'prestador';
    texto2 = principal;
  }

  const m2 = _LIQ_EXTRACT.exec(texto2);
  if (m2) texto2 = m2[1];
  texto2 = texto2.replace(/:/g, '').replace(/\)/g, '').replace(/\(/g, '').trim();
  texto2 = texto2.replace(_LIQ_YEAR_DUP, '/$1');

  let numero = '';
  if (categoria === 'memo' || categoria === 'pad') {
    const m3 = _LIQ_MEMO_PAD.exec(texto2);
    if (m3) {
      let base = m3[1].replace(/\./g, '').replace(/ /g, '');
      const anoM = /\/(\d{4})/.exec(base);
      if (anoM) {
        numero = base;
      } else {
        const anoOrig = /\/(\d{4})/.exec(texto2);
        numero = anoOrig ? base + '/' + anoOrig[1] : base + '/2025';
      }
    }
  }
  return [texto2, categoria, numero];
}

// =========================================================
// Funções auxiliares de data
// =========================================================
function _liqParseDate(val) {
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    const msDay = 86400000;
    const adj = val > 60 ? 25569 : 25568;
    return new Date((val - adj) * msDay);
  }
  if (typeof val === 'string') {
    const s = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00Z');
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
      const p = s.split('/');
      return new Date(`${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}T00:00:00Z`);
    }
  }
  return val;
}

function _liqDateToStr(val) {
  if (val instanceof Date && !isNaN(val.getTime())) {
    const d = String(val.getUTCDate()).padStart(2, '0');
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${val.getUTCFullYear()}`;
  }
  if (typeof val === 'number') return excelDateToString(val);
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
      const p = val.split('T')[0].split('-');
      return `${p[2]}/${p[1]}/${p[0]}`;
    }
  }
  return val;
}

// =========================================================
// Transformação principal — 39 etapas (refatorada com ColTracker)
// =========================================================
function transformarLiquidados(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  fillMergedCells(sheet); // Desmesclar células antes de ler a matrix
  let matrix = sheetToMatrix(sheet, { raw: true });
  normalizeMatrix(matrix);

  // Trim trailing empty rows
  while (matrix.length > 1 && (matrix[matrix.length - 1] || []).every(v => isEmptyCell(v))) {
    matrix.pop();
  }

  // Ensure rectangular
  let maxC = 0;
  for (let i = 0; i < matrix.length; i++) {
    const len = (matrix[i] || []).length;
    if (len > maxC) maxC = len;
  }
  for (const row of matrix) {
    while (row.length < maxC) row.push(null);
    if (row.length > maxC) row.length = maxC;
  }

  const linhasOriginal = matrix.length - 1;

  // Pre-Step: Detectar Unidade gestora e anotar em cada linha ANTES de qualquer processamento
  // Busca "Unidade gestora:" em QUALQUER coluna â†’ nome da unidade em outra célula da mesma linha
  {
    let unidadeAtual = null;
    for (let r = 1; r < matrix.length; r++) {
      let isMarker = false;
      let markerCol = -1;

      // Buscar "Unidade gestora:" em qualquer coluna da linha
      for (let c = 0; c < (matrix[r] || []).length; c++) {
        const v = matrix[r][c];
        if (v && typeof v === 'string' && /^unidade gestora/i.test(v.trim())) {
          isMarker = true;
          markerCol = c;
          break;
        }
      }

      if (isMarker) {
        // Buscar o nome da unidade na mesma linha (primeira célula longa, ignorando a célula do marcador)
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

  // Step 4: Delete row 2 (Unidade gestora:)
  if (matrix.length >= 2) matrix.splice(1, 1);

  // Detectar linha de cabeçalho (pula títulos extras como "Prefeitura Municipal...")
  const headerRowIdx = detectHeaderRow(matrix);
  console.log(`[Liquidados] Usando linha ${headerRowIdx} como cabeçalho`);

  // Remove linhas de título antes do cabeçalho
  if (headerRowIdx > 0) {
    console.log(`[Liquidados] Removendo ${headerRowIdx} linhas de título`);
    matrix.splice(0, headerRowIdx);
  }

  // Criar ColTracker a partir do cabeçalho
  // Esperado: Data, Nr emp., Seq. liq., Espécie, Unidade orçamentária, [vazio],
  //           Despesa, [vazio], Fonte de recursos, Beneficiário, [vazio], [vazio], Valor (R$), [vazio]
  const ct = createColTracker(matrix[0]);

  // Detectar formato: se "Doc/nota fiscal" e "Hist.Empenho" já existem como colunas
  // nomeadas, pular extração complexa (Steps 5, 13-34, 36-38).
  const _isNewFormat = ct.tryIdx('Doc/nota fiscal') >= 0 && ct.tryIdx('Hist.Empenho') >= 0;

  // Step 5: Deletar colunas vazias desnecessárias (apenas formato antigo)
  if (!_isNewFormat) {
    const valorI = ct.idx('Valor (R$)');
    if (valorI + 1 < ct.length() && ct.nameAt(valorI + 1).startsWith('_empty')) {
      trackedDeleteAt(matrix, ct, valorI + 1);
    }
    const benefI = ct.idxOf('Beneficiário', 'Credor/Fornecedor');
    const valorI2 = ct.idx('Valor (R$)');
    for (let c = valorI2 - 1; c > benefI; c--) {
      if (ct.nameAt(c).startsWith('_empty')) {
        trackedDeleteAt(matrix, ct, c);
        break;
      }
    }
  }

  // Step 6: Remover "Objeto:" da coluna "Nr emp."
  {
    const iNrEmp = ct.idx('Nr emp.');
    for (let r = 0; r < matrix.length; r++) {
      const v = safeGet(matrix, r, iNrEmp);
      if (typeof v === 'string' && /objeto:/i.test(v)) {
        const nv = v.replace(_LIQ_OBJETO_RE, '').trim();
        safeSet(matrix, r, iNrEmp, nv || null);
      }
    }
  }

  // Steps 7-9: Filtrar linhas (documento fiscal, totais, vazias, marcadoras de unidade gestora)
  matrix = matrix.filter((row, r) => {
    if (r === 0) return true;
    // Remover linhas marcadoras de "Unidade gestora:" (não são dados reais)
    if (row._isUnidadeMarker) return false;
    if (row.some(v => typeof v === 'string' && v.toLowerCase().includes('documento fiscal'))) return false;
    const txt = normalizeText(row.map(v => String(v || '')).join(' '));
    if (['total do dia', 'total do mes', 'total da unidade gestora', 'total geral'].some(p => txt.includes(p))) return false;
    return row.some(v => !isEmptyCell(v));
  });

  // Step 10: Fill-down em colunas nomeadas
  {
    const benefName = ct.tryIdx('Beneficiário') >= 0 ? 'Beneficiário' : 'Credor/Fornecedor';
    const fillNames = ['Data', 'Nr emp.', 'Espécie', 'Unidade orçamentária',
                       'Despesa', 'Fonte de recursos', benefName];
    for (const name of fillNames) fillDown(matrix, ct.idx(name), 2);
  }

  // Step 11: Adicionar coluna "Unidade gestora" usando anotação pré-calculada (_unidadeGestora)
  {
    // Inserir nova coluna na posição 1 (logo após Data)
    insertColumn(matrix, 1);
    ct.insertAt(1, 'Unidade gestora');
    matrix[0][1] = 'Unidade gestora';

    // Preencher usando a propriedade _unidadeGestora anotada em cada row antes dos filtros
    for (let r = 1; r < matrix.length; r++) {
      safeSet(matrix, r, 1, matrix[r]._unidadeGestora || null);
    }
  }

  // Steps 13-34: Extração complexa de colunas (apenas formato antigo com colunas vazias)
  if (!_isNewFormat) {

  // Step 13: Inserir coluna auxiliar antes de "Seq. liq." para dados extraídos
  {
    const seqIdx = ct.idx('Seq. liq.');
    insertColumn(matrix, seqIdx);
    ct.insertAt(seqIdx, '_aux_seq_liq');
  }

  // Step 14: Valor não-vazio E Seq.liq. não-vazio â†’ _aux_seq_liq = Seq.liq., Seq.liq. = null
  {
    const iValor = ct.idx('Valor (R$)');
    const iSeq = ct.idx('Seq. liq.');
    const iAux = ct.idx('_aux_seq_liq');
    for (let r = 0; r < matrix.length; r++) {
      if (!isEmptyCell(safeGet(matrix, r, iValor)) && !isEmptyCell(safeGet(matrix, r, iSeq))) {
        safeSet(matrix, r, iAux, safeGet(matrix, r, iSeq));
        safeSet(matrix, r, iSeq, null);
      }
    }
  }

  // Step 15: Inserir coluna auxiliar antes de "Seq. liq." para doc
  {
    const seqIdx = ct.idx('Seq. liq.');
    insertColumn(matrix, seqIdx);
    ct.insertAt(seqIdx, '_aux_doc');
  }

  // Step 16: _empty_0 não-vazio E Seq.liq. não-vazio â†’ _aux_doc = Seq.liq., Seq.liq. = null
  {
    const iEmpty0 = ct.idx('_empty_0');
    const iSeq = ct.idx('Seq. liq.');
    const iDoc = ct.idx('_aux_doc');
    for (let r = 0; r < matrix.length; r++) {
      if (!isEmptyCell(safeGet(matrix, r, iEmpty0)) && !isEmptyCell(safeGet(matrix, r, iSeq))) {
        safeSet(matrix, r, iDoc, safeGet(matrix, r, iSeq));
        safeSet(matrix, r, iSeq, null);
      }
    }
  }

  // Step 17: Valor vazio E Seq.liq. não-vazio â†’ coluna trabalho = Seq.liq., Seq.liq. = null
  {
    const iValor = ct.idx('Valor (R$)');
    const iSeq = ct.idx('Seq. liq.');
    const iHist = ct.length();
    ct.insertAt(iHist, '_work_hist_emp');
    for (let r = 0; r < matrix.length; r++) {
      if (isEmptyCell(safeGet(matrix, r, iValor)) && !isEmptyCell(safeGet(matrix, r, iSeq))) {
        safeSet(matrix, r, iHist, safeGet(matrix, r, iSeq));
        safeSet(matrix, r, iSeq, null);
      }
    }
  }

  // Step 18: Fill-down em _aux_seq_liq
  fillDown(matrix, ct.idx('_aux_seq_liq'), 2);

  // Step 19: Deletar coluna "Seq. liq."
  trackedDeleteCol(matrix, ct, 'Seq. liq.');

  // Step 20: Processar _aux_seq_liq (pegar antes do primeiro "-")
  {
    const iAux = ct.idx('_aux_seq_liq');
    for (let r = 0; r < matrix.length; r++) {
      const cv = safeGet(matrix, r, iAux);
      if (cv != null) {
        const s = String(cv);
        const p = s.indexOf('-');
        const nv = p > 0 ? s.substring(0, p).trim() : s.trim();
        safeSet(matrix, r, iAux, nv || null);
      }
    }
  }

  // Step 21: _work_hist_emp(r) e (r+1) ambos não-vazios â†’ nova col(r) = hist_emp(r), hist_emp(r) = null
  {
    const iN = ct.idx('_work_hist_emp');
    const iO = ct.length();
    ct.insertAt(iO, '_work_hist_liq');
    for (let r = 0; r < matrix.length - 1; r++) {
      if (!isEmptyCell(safeGet(matrix, r, iN)) && !isEmptyCell(safeGet(matrix, r + 1, iN))) {
        safeSet(matrix, r, iO, safeGet(matrix, r, iN));
        safeSet(matrix, r, iN, null);
      }
    }
  }

  // Step 22: Mover _work_hist_emp 2 posições acima
  {
    const iN = ct.idx('_work_hist_emp');
    for (let r = 2; r < matrix.length; r++) {
      const v = safeGet(matrix, r, iN);
      if (!isEmptyCell(v)) { safeSet(matrix, r - 2, iN, v); safeSet(matrix, r, iN, null); }
    }
  }

  // Step 23: Mover _work_hist_liq 1 posição acima
  {
    const iO = ct.idx('_work_hist_liq');
    for (let r = 1; r < matrix.length; r++) {
      const v = safeGet(matrix, r, iO);
      if (!isEmptyCell(v)) { safeSet(matrix, r - 1, iO, v); safeSet(matrix, r, iO, null); }
    }
  }

  // Step 24: hist_emp e Valor ambos não-vazios â†’ nova col = hist_emp, hist_emp = null
  {
    const iP = ct.length();
    ct.insertAt(iP, '_work_P');
    const iValor = ct.idx('Valor (R$)');
    const iN = ct.idx('_work_hist_emp');
    for (let r = 0; r < matrix.length; r++) {
      if (!isEmptyCell(safeGet(matrix, r, iN)) && !isEmptyCell(safeGet(matrix, r, iValor))) {
        safeSet(matrix, r, iP, safeGet(matrix, r, iN));
        safeSet(matrix, r, iN, null);
      }
    }
  }

  // Step 25: Mover _work_hist_emp 1 posição abaixo (de baixo para cima)
  {
    const iN = ct.idx('_work_hist_emp');
    for (let r = matrix.length - 1; r >= 0; r--) {
      const v = safeGet(matrix, r, iN);
      if (!isEmptyCell(v) && (r + 1) < matrix.length) {
        safeSet(matrix, r + 1, iN, v);
        safeSet(matrix, r, iN, null);
      }
    }
  }

  // Step 26: Mover _aux_doc, _empty_0, _empty_1, _empty_2 — 3 posições acima
  {
    for (const name of ['_aux_doc', '_empty_0', '_empty_1', '_empty_2']) {
      const ic = ct.idx(name);
      for (let r = 3; r < matrix.length; r++) {
        const v = safeGet(matrix, r, ic);
        if (!isEmptyCell(v)) { safeSet(matrix, r - 3, ic, v); safeSet(matrix, r, ic, null); }
      }
    }
  }

  // Step 27: hist_emp(r) não-vazio E _aux_doc(r-1) não-vazio â†’ _aux_doc(r)=_aux_doc(r-1), _aux_doc(r-1)=null
  {
    const iD = ct.idx('_aux_doc');
    const iN = ct.idx('_work_hist_emp');
    for (let r = 1; r < matrix.length; r++) {
      if (!isEmptyCell(safeGet(matrix, r, iN)) && !isEmptyCell(safeGet(matrix, r - 1, iD))) {
        safeSet(matrix, r, iD, safeGet(matrix, r - 1, iD));
        safeSet(matrix, r - 1, iD, null);
      }
    }

    // Step 28: Mesmo para _empty_0 e _empty_2
    for (const name of ['_empty_0', '_empty_2']) {
      const ic = ct.idx(name);
      for (let r = 1; r < matrix.length; r++) {
        if (!isEmptyCell(safeGet(matrix, r, iN)) && !isEmptyCell(safeGet(matrix, r - 1, ic))) {
          safeSet(matrix, r, ic, safeGet(matrix, r - 1, ic));
          safeSet(matrix, r - 1, ic, null);
        }
      }
    }
  }

  // Step 29: Inserir coluna "Doc/nota fiscal" antes de _aux_doc
  trackedInsertCol(matrix, ct, ct.idx('_aux_doc'), 'Doc/nota fiscal');

  // Step 30: Construir "Doc/nota fiscal" a partir de _aux_doc + _empty_1
  {
    const iDocNew = ct.idx('Doc/nota fiscal');
    const iAuxDoc = ct.idx('_aux_doc');
    const iEmpty1 = ct.idx('_empty_1');
    let r = 0;
    while (r < matrix.length) {
      const ev = safeGet(matrix, r, iAuxDoc), jv = safeGet(matrix, r, iEmpty1);
      if (!isEmptyCell(ev) || !isEmptyCell(jv)) {
        const ini = r;
        const parts = [];
        while (r < matrix.length) {
          const e2 = safeGet(matrix, r, iAuxDoc), j2 = safeGet(matrix, r, iEmpty1);
          if (isEmptyCell(e2) && isEmptyCell(j2)) break;
          if (!isEmptyCell(e2)) parts.push(String(e2).trim());
          if (!isEmptyCell(j2)) parts.push(String(j2).trim());
          r++;
        }
        safeSet(matrix, ini, iDocNew, parts.join(';'));
      } else { r++; }
    }
  }

  // Step 31: Atualizar headers com nomes descritivos
  {
    const renames = [
      ['_aux_seq_liq', 'Seq. liq.'],
      ['_empty_0', 'Valor auxiliar 1'],
      ['_empty_1', 'doc/nota fiscal auxiliar'],
      ['_empty_2', 'Valor auxiliar 2'],
      ['_work_hist_liq', 'Hist.Empenho'],
      ['_work_P', 'Hist.Liq']
    ];
    for (const [oldName, newName] of renames) {
      const idx = ct.tryIdx(oldName);
      if (idx >= 0) {
        ct.rename(oldName, newName);
        safeSet(matrix, 0, idx, newName);
      }
    }
    // Garantir header "Doc/nota fiscal"
    safeSet(matrix, 0, ct.idx('Doc/nota fiscal'), 'Doc/nota fiscal');
  }

  // Step 32: Deletar coluna _aux_doc
  trackedDeleteCol(matrix, ct, '_aux_doc');

  // Step 33: Mover dados de _work_hist_emp para Hist.Empenho
  {
    const iN = ct.idx('_work_hist_emp');
    const iO = ct.idx('Hist.Empenho');
    for (let r2 = 0; r2 < matrix.length; r2++) {
      const v = safeGet(matrix, r2, iN);
      if (!isEmptyCell(v)) { safeSet(matrix, r2, iO, v); safeSet(matrix, r2, iN, null); }
    }
  }

  // Step 34: Deletar coluna _work_hist_emp
  trackedDeleteCol(matrix, ct, '_work_hist_emp');

  } // fim do if (!_isNewFormat) — Steps 13-34

  // =========================================================
  // Funções auxiliares de finalização
  // =========================================================
  function renameHeader(mat, old, nw) {
    if (!mat || !mat[0]) return;
    const lo = normalizeText(old);
    for (let i = 0; i < mat[0].length; i++) {
      if (typeof mat[0][i] === 'string' && normalizeText(mat[0][i]) === lo) { mat[0][i] = nw; break; }
    }
  }

  function convertDates(mat) {
    if (!mat || !mat[0]) return;
    const dateCols = [];
    for (let c = 0; c < mat[0].length; c++) {
      if (mat[0][c] && String(mat[0][c]).toLowerCase().includes('data')) dateCols.push(c);
    }
    for (const c of dateCols) {
      for (let r2 = 1; r2 < mat.length; r2++) {
        if (mat[r2] && c < mat[r2].length) mat[r2][c] = _liqDateToStr(mat[r2][c]);
      }
    }
    for (let r2 = 1; r2 < mat.length; r2++) {
      if (mat[r2] && mat[r2][0] != null) mat[r2][0] = _liqDateToStr(mat[r2][0]);
    }
  }

  // =========================================================
  // FORMATO NOVO: caminho otimizado (pula matMain e workbook de 2 abas)
  // =========================================================
  if (_isNewFormat) {
    // Step 35: Filtrar linhas onde "Valor (R$)" tem conteúdo
    const iFilterCol = ct.idx('Valor (R$)');
    let wsFinal = [matrix[0].slice()];
    for (let r = 1; r < matrix.length; r++) {
      const v = matrix[r].length > iFilterCol ? matrix[r][iFilterCol] : null;
      if (v != null && v !== '' && (typeof v !== 'string' || v.trim())) wsFinal.push(matrix[r]);
    }
    matrix = null; // liberar

    renameHeader(wsFinal, 'Beneficiário', 'Credor/Fornecedor');
    convertDates(wsFinal);

    {
      const nrEmpIdx = findColumn(wsFinal[0], 'Nr emp');
      const dataIdx = findColumn(wsFinal[0], 'Data');
      formatNrEmpComAno(wsFinal, nrEmpIdx, dataIdx, 1);
    }

    return {
      workbook: null,
      matrix: wsFinal,
      matrixBruta: null,
      stats: {
        linhasOriginal,
        linhasFinal: wsFinal.length - 1,
        linhasBruta: 0
      }
    };
  }

  // =========================================================
  // FORMATO ANTIGO: caminho completo com matMain e workbook de 2 abas
  // =========================================================
  let matMain = matrix.map(row => [...row]);

  // Trim bottom empty rows
  while (matMain.length > 1 && (matMain[matMain.length - 1] || []).every(v => isEmptyCell(v))) {
    matMain.pop();
  }

  // Normalize column count
  let mc2 = 1;
  for (const rw of matMain) if (rw.length > mc2) mc2 = rw.length;
  let lastDataCol = 0;
  for (let c = mc2 - 1; c >= 0; c--) {
    if (matMain.some(rw => rw[c] != null && rw[c] !== '' && String(rw[c]).trim())) { lastDataCol = c + 1; break; }
  }
  for (const rw of matMain) {
    while (rw.length < lastDataCol) rw.push(null);
    if (rw.length > lastDataCol) rw.length = lastDataCol;
  }

  // Step 35: Criar ws_m (linhas onde "Valor (R$)" tem conteúdo)
  const iFilterCol = ct.idx('Valor (R$)');
  let wsM = [matMain[0].slice()];
  for (let r = 1; r < matMain.length; r++) {
    const v = matMain[r].length > iFilterCol ? matMain[r][iFilterCol] : null;
    if (v != null && v !== '' && (typeof v !== 'string' || v.trim())) wsM.push([...matMain[r]]);
  }

  const ctM = createColTracker(wsM[0]);

  // Deletar colunas auxiliares do ws_m
  for (const name of ['Valor auxiliar 2', 'doc/nota fiscal auxiliar', 'Valor auxiliar 1']) {
    const idx = ctM.tryIdx(name);
    if (idx >= 0) {
      for (const rw of wsM) { if (idx < rw.length) rw.splice(idx, 1); }
      ctM.removeAt(idx);
    }
  }

  for (const rw of wsM) while (rw.length < 15) rw.push(null);

  // Steps 36-38: Processar conteúdo da coluna "Hist.Liq"
  let wsFinal = wsM;
  {
    const iContent = ctM.idx('Hist.Liq');
    const iTexto = ctM.length();
    ctM.insertAt(iTexto, '_work_texto');
    const iTipo = ctM.length();
    ctM.insertAt(iTipo, 'Tipo');
    const iDocFinal = ctM.length();
    ctM.insertAt(iDocFinal, 'Documento');

    let ultimaUtil = 0;
    for (let rr = 0; rr < wsM.length; rr++) {
      const vL = wsM[rr].length > iContent ? wsM[rr][iContent] : null;
      if (typeof vL === 'string' && vL.trim()) ultimaUtil = rr;
    }

    for (let rr = 0; rr <= ultimaUtil; rr++) {
      const rawL = wsM[rr].length > iContent ? wsM[rr][iContent] : null;
      const [texto2, cat, num] = _liqProcessarConteudo(rawL);
      if (iTexto < wsM[rr].length) wsM[rr][iTexto] = texto2;
      else { while (wsM[rr].length <= iTexto) wsM[rr].push(null); wsM[rr][iTexto] = texto2; }
      if (iTipo < wsM[rr].length) wsM[rr][iTipo] = cat;
      else { while (wsM[rr].length <= iTipo) wsM[rr].push(null); wsM[rr][iTipo] = cat; }
      if (iDocFinal < wsM[rr].length) wsM[rr][iDocFinal] = num;
      else { while (wsM[rr].length <= iDocFinal) wsM[rr].push(null); wsM[rr][iDocFinal] = num; }
    }

    if (wsFinal.length > 0) {
      const tipoIdx = ctM.idx('Tipo');
      if (tipoIdx < wsFinal[0].length) wsFinal[0][tipoIdx] = 'Tipo';
      const docIdx = ctM.idx('Documento');
      if (docIdx < wsFinal[0].length) wsFinal[0][docIdx] = 'Documento';
      const textoIdx = ctM.idx('_work_texto');
      for (const rw of wsFinal) { if (textoIdx < rw.length) rw.splice(textoIdx, 1); }
      ctM.removeAt(textoIdx);
    }
  }

  renameHeader(wsFinal, 'Beneficiário', 'Credor/Fornecedor');
  renameHeader(matMain, 'Beneficiário', 'Credor/Fornecedor');

  convertDates(wsFinal);
  convertDates(matMain);

  {
    const nrEmpIdx = findColumn(wsFinal[0], 'Nr emp');
    const dataIdx = findColumn(wsFinal[0], 'Data');
    console.log('[Liquidados-Final] Nr emp. col=' + nrEmpIdx + ', Data col=' + dataIdx +
      ', amostra Nr emp.=[' + safeGet(wsFinal, 1, nrEmpIdx) + '], Data=[' + safeGet(wsFinal, 1, dataIdx) + ']');
    formatNrEmpComAno(wsFinal, nrEmpIdx, dataIdx, 1);
    console.log('[Liquidados-Final] Após: Nr emp.=[' + safeGet(wsFinal, 1, nrEmpIdx) + ']');
  }
  {
    const nrEmpIdx = findColumn(matMain[0], 'Nr emp');
    const dataIdx = findColumn(matMain[0], 'Data');
    formatNrEmpComAno(matMain, nrEmpIdx, dataIdx, 1);
  }

  const ws1 = matrixToSheet(wsFinal);
  const ws2 = matrixToSheet(matMain);
  const outWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(outWb, ws1, 'Liquidados Final');
  XLSX.utils.book_append_sheet(outWb, ws2, 'Planilha Bruta Liq');

  return {
    workbook: outWb,
    matrix: wsFinal,
    matrixBruta: matMain,
    stats: {
      linhasOriginal,
      linhasFinal: wsFinal.length - 1,
      linhasBruta: matMain.length - 1
    }
  };
}

