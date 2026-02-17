/**
 * Transformação: Empenhos Pagos
 * Port de "Empenhos pagos.py"
 *
 * Pipeline:
 * 1. Desmesclar células (preencher merged)
 * 2. Excluir linha 2 (subtítulo do relatório SIGEF)
 * 3. Remover linhas de totais (Total do empenho, Total da UG, Total Geral)
 * 4. Fill-down coluna C (Credor/Fornecedor)
 * 5. Seq. Liq. â†’ apenas dígitos, máximo 7 caracteres
 * 6. Formatar coluna Data como DD/MM/AAAA
 * 7. Remover linhas vazias
 */
function transformarPagos(workbook) {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Desmesclar preenchendo células (relatórios SIGEF usam merge)
  fillMergedCells(sheet);

  let matrix = sheetToMatrix(sheet, { raw: true, defval: null });
  if (matrix.length < 3) throw new Error('Planilha com dados insuficientes');

  const linhasOriginal = matrix.length - 1;

  // Pre-Step: Detectar Unidade gestora ANTES de qualquer remoção de linhas
  // Formato: "Unidade Gestora: Nome da Unidade" (tudo na mesma célula)
  {
    let unidadeAtual = null;
    const reUnidade = /^unidade\s+gestora\s*:\s*/i;
    for (let r = 1; r < matrix.length; r++) {
      for (let c = 0; c < (matrix[r] || []).length; c++) {
        const v = matrix[r][c];
        if (v && typeof v === 'string' && reUnidade.test(v.trim())) {
          const nome = v.trim().replace(reUnidade, '').trim();
          if (nome.length > 5) unidadeAtual = nome;
          matrix[r]._isUnidadeMarker = true;
          break;
        }
      }
      matrix[r]._unidadeGestora = unidadeAtual;
    }
  }

  // 1) Excluir linha 2 (subtítulo) — somente se NÃO for marcadora de unidade
  if (matrix.length >= 2 && !matrix[1]._isUnidadeMarker) {
    matrix.splice(1, 1);
  }
  normalizeMatrix(matrix);

  // Detectar linha de cabeçalho (pula títulos extras)
  const headerRowIdx = detectHeaderRow(matrix);
  if (headerRowIdx > 0) {
    console.log(`[Pagos] Removendo ${headerRowIdx} linhas de título`);
    matrix.splice(0, headerRowIdx);
  }

  const header = matrix[0];

  // Localizar colunas
  const colSeqLiq = findColumn(header, 'seq. liq');
  const colData = findColumn(header, 'data', true);

  // 2) Remover linhas de totais e linhas marcadoras de unidade gestora
  const ALVOS = ['total do empenho:', 'total da unidade gestora:', 'total geral'];
  let filtered = [header];
  for (let r = 1; r < matrix.length; r++) {
    // Remover linhas marcadoras de "Unidade Gestora:"
    if (matrix[r]._isUnidadeMarker) continue;
    const valA = safeGet(matrix, r, 0);
    if (!isEmptyCell(valA)) {
      const s = String(valA).trim().toLowerCase();
      if (ALVOS.some(a => s.startsWith(a))) continue;
    }
    filtered.push(matrix[r]);
  }

  // 3) Fill-down coluna Data (localizada por nome no header)
  const colDataFill = findColumn(filtered[0], 'data', true);
  fillDown(filtered, colDataFill >= 0 ? colDataFill : 2, 1);

  // 4) Seq. Liq. â†’ extrair dígitos, máximo 7 caracteres
  if (colSeqLiq >= 0) {
    for (let r = 1; r < filtered.length; r++) {
      const val = safeGet(filtered, r, colSeqLiq);
      if (!isEmptyCell(val)) {
        const digits = extractDigits(val);
        safeSet(filtered, r, colSeqLiq, digits.substring(0, 7));
      }
    }
  }

  // 5) Formatar coluna Data como DD/MM/AAAA
  if (colData >= 0) {
    for (let r = 1; r < filtered.length; r++) {
      const val = safeGet(filtered, r, colData);
      if (!isEmptyCell(val)) {
        safeSet(filtered, r, colData, excelDateToString(val));
      }
    }
  }

  // 6) Remover linhas completamente vazias
  filtered = removeEmptyRows(filtered, 1);

  // 7) Nr emp. â†’ adicionar /ANO extraído da coluna Data (ex: 235 â†’ 235/2025)
  {
    const colNrEmp = findColumn(filtered[0], 'nr emp');
    const colDataNr = findColumn(filtered[0], 'data', true);
    console.log('[Pagos] Nr emp. col=' + colNrEmp + ', Data col=' + colDataNr +
      ', amostra Nr emp.=[' + safeGet(filtered, 1, colNrEmp) + '], Data=[' + safeGet(filtered, 1, colDataNr) + ']');
    formatNrEmpComAno(filtered, colNrEmp, colDataNr, 1);
    console.log('[Pagos] Após formatNrEmpComAno: Nr emp.=[' + safeGet(filtered, 1, colNrEmp) + ']');
  }

  // 8) Adicionar coluna "Unidade gestora" usando anotação pré-calculada
  {
    for (let r = 0; r < filtered.length; r++) {
      filtered[r].splice(1, 0, null);
    }
    filtered[0][1] = 'Unidade gestora';
    for (let r = 1; r < filtered.length; r++) {
      filtered[r][1] = filtered[r]._unidadeGestora || null;
    }
  }

  const outSheet = matrixToSheet(filtered);
  const outWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(outWb, outSheet, sheetName);

  return {
    workbook: outWb,
    matrix: filtered,
    stats: {
      linhasOriginal: linhasOriginal,
      linhasFinal: filtered.length - 1,
      linhasRemovidas: linhasOriginal - (filtered.length - 1)
    }
  };
}


