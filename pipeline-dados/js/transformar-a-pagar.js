/**
 * Transformação: Empenhos a Pagar
 * Port de "Empenhos a pagar.py"
 *
 * Pipeline:
 * 1. Localizar coluna "Av. liquid." (case insensitive)
 * 2. Remover linhas onde "Av. liquid." está vazia
 * 3. Remover colunas completamente vazias
 * 4. Cortar "Av. liquid." para 7 primeiros caracteres
 * 5. Fill-down em colunas de data
 * 6. Formatar coluna A como data DD/MM/AAAA
 */
function transformarAPagar(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  fillMergedCells(sheet); // Desmesclar células antes de ler a matrix
  let matrix = sheetToMatrix(sheet, { raw: true, defval: null });

  if (matrix.length < 2) throw new Error('Planilha vazia ou sem dados');

  const header = matrix[0];

  // Pre-Step: Detectar Unidade gestora e anotar em cada linha ANTES de qualquer filtro
  // Busca "Unidade gestora:" em QUALQUER coluna da linha → nome da unidade em outra célula da mesma linha
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

  // 1) Localizar coluna "Av. liquid."
  let colAv = findColumn(header, 'av. liquid');
  if (colAv === -1) {
    throw new Error(`Coluna "Av. liquid." não encontrada. Colunas: ${header.join(', ')}`);
  }

  // 2) Remover linhas onde Av. liquid. está vazia + linhas marcadoras de unidade gestora
  const linhasAntes = matrix.length - 1;
  let filtered = [header];
  for (let r = 1; r < matrix.length; r++) {
    if (matrix[r]._isUnidadeMarker) continue;
    const val = safeGet(matrix, r, colAv);
    if (!isEmptyCell(val)) filtered.push(matrix[r]);
  }

  // 3) Remover colunas completamente vazias
  filtered = removeEmptyColumns(filtered);

  // Recalcular posição de Av. liquid. após remoção de colunas
  colAv = findColumn(filtered[0], 'av. liquid');

  // 4) Cortar "Av. liquid." para 7 primeiros caracteres
  if (colAv >= 0) {
    for (let r = 1; r < filtered.length; r++) {
      const val = safeGet(filtered, r, colAv);
      if (!isEmptyCell(val)) {
        safeSet(filtered, r, colAv, String(val).substring(0, 7));
      }
    }
  }

  // 5) Fill-down em colunas de data (localizadas por nome)
  const newHeader = filtered[0] || [];
  const dateKeywords = ['data', 'date', 'dt', 'emissao', 'vencimento'];
  const dateCols = [];
  for (let c = 0; c < newHeader.length; c++) {
    const nome = normalizeText(newHeader[c]);
    if (dateKeywords.some(k => nome.includes(k))) dateCols.push(c);
  }

  if (dateCols.length > 0) {
    for (const c of dateCols) fillDown(filtered, c, 1);
  } else {
    // Fallback: buscar coluna "Data" pelo nome
    const colData = findColumn(newHeader, 'Data');
    fillDown(filtered, colData >= 0 ? colData : 0, 1);
  }

  // 6) Converter coluna "Data" para DD/MM/AAAA (localizada por nome)
  const colDataFmt = findColumn(newHeader, 'Data');
  if (colDataFmt >= 0) {
    for (let r = 1; r < filtered.length; r++) {
      const val = safeGet(filtered, r, colDataFmt);
      if (!isEmptyCell(val)) safeSet(filtered, r, colDataFmt, excelDateToString(val));
    }
  }

  // 7) Nr emp. → adicionar /ANO extraído da coluna Data (ex: 235 → 235/2025)
  {
    const colNrEmp = findColumn(newHeader, 'nr emp');
    console.log('[A Pagar] Nr emp. col=' + colNrEmp + ', Data col=' + colDataFmt +
      ', amostra Nr emp.=[' + safeGet(filtered, 1, colNrEmp) + '], Data=[' + safeGet(filtered, 1, colDataFmt) + ']');
    formatNrEmpComAno(filtered, colNrEmp, colDataFmt, 1);
    console.log('[A Pagar] Após formatNrEmpComAno: Nr emp.=[' + safeGet(filtered, 1, colNrEmp) + ']');
  }

  // 8) Renomear "Av. liquid." → "Seq. Liq." para padronização
  {
    const colAvLiq = findColumn(filtered[0], 'Av. liquid');
    if (colAvLiq >= 0) filtered[0][colAvLiq] = 'Seq. Liq.';
  }

  // 9) Adicionar coluna "Unidade gestora" usando anotação pré-calculada
  {
    // Inserir nova coluna na posição 1 (logo após Data/coluna 0)
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
  XLSX.utils.book_append_sheet(outWb, outSheet, 'Sheet1');

  return {
    workbook: outWb,
    matrix: filtered,
    stats: {
      linhasOriginal: linhasAntes,
      linhasFinal: filtered.length - 1,
      linhasRemovidas: linhasAntes - (filtered.length - 1)
    }
  };
}
