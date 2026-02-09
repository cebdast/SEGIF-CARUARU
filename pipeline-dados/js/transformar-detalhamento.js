/**
 * Transformação: Relatório da Despesa por Natureza Consolidado
 * (Detalhamento de Despesa)
 *
 * Pipeline:
 * 1. Desmesclar células (preencher merged)
 * 2. Excluir linha 1 (título do relatório)
 * 3. Manter somente colunas A (código) e B (descrição)
 * 4. Remover linhas de totais
 * 5. Remover linhas completamente vazias
 * 6. Resultado pronto para cruzamento (coluna A = chave)
 */
function transformarDetalhamento(workbook) {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // 1) Desmesclar preenchendo células
  fillMergedCells(sheet);

  let matrix = sheetToMatrix(sheet, { raw: false, defval: null });
  if (matrix.length < 3) throw new Error('Planilha com dados insuficientes');

  const linhasOriginal = matrix.length;

  // 2) Excluir linha 1 (título do relatório, ex: "Relatório da Despesa...")
  matrix.splice(0, 1);
  normalizeMatrix(matrix);

  // 3) Manter somente colunas 0 (código natureza) e 1 (descrição)
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r] || [];
    matrix[r] = [
      row.length > 0 ? row[0] : null,
      row.length > 1 ? row[1] : null
    ];
  }

  const header = matrix[0] || [];

  // 4) Remover linhas de totais
  const TERMOS_TOTAL = ['total geral', 'total da unidade', 'total do'];
  let filtered = [header];
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    let ehTotal = false;
    for (let c = 0; c < row.length; c++) {
      if (!isEmptyCell(row[c])) {
        const s = String(row[c]).trim().toLowerCase();
        if (TERMOS_TOTAL.some(t => s.startsWith(t))) {
          ehTotal = true;
          break;
        }
      }
    }
    if (!ehTotal) filtered.push(row);
  }

  // 5) Remover linhas completamente vazias
  filtered = removeEmptyRows(filtered, 1);

  const outSheet = matrixToSheet(filtered);
  const outWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(outWb, outSheet, 'Detalhamento');

  return {
    workbook: outWb,
    matrix: filtered,
    stats: {
      linhasOriginal: linhasOriginal - 1,
      linhasFinal: filtered.length - 1,
      linhasRemovidas: (linhasOriginal - 1) - (filtered.length - 1),
      colunasRemovidas: 'Mantidas somente A (código) e B (descrição)'
    }
  };
}
