/**
 * Transformação: Empenhos Retidos/Consignados Analítico por Data de Movimento
 *
 * Estrutura bruta (após desmesclar):
 *   R0: Título ("Valores em R$")
 *   R1: Cabeçalho [Data, Nr emp., Espécie, Unid. orçamentária, Despesa, Fonte, Beneficiário, "", Valor, ""]
 *   R2: Marcador "Unidade gestora: ..." com nome na col C
 *   Grupos repetidos:
 *     - Linha empenho:   [Data, Nr emp., Espécie, Unid.orç, Despesa, Fonte, Beneficiário, "", Valor, ""]
 *     - Sub-cabeçalho:   ["","","Documento fiscal","","Conta contábil","","","Valor Retido/Consignado","",""]
 *     - Detalhe(s):      ["","","doc_fiscal","","tipo_retenção","","", valor_retido, "",""]
 *   Totais: "Total da unidade gestora:" / "Total geral"
 *
 * Pipeline:
 *  1. Desmesclar (fillMergedCells)
 *  2. Detectar Unidade gestora → anotar + marcar
 *  3. Deletar título (row 0)
 *  4. Remover linhas: sub-cabeçalhos, totais, marcadores UG, vazias
 *  5. Separar colunas mistas: Espécie/Doc fiscal e Despesa/Tipo retenção
 *  6. Fill-down: Data, Nr emp., Espécie, Unid. orçamentária, Despesa, Fonte, Beneficiário, Valor
 *  7. Renomear col 7 → "Valor Retido/Consignado", remover col 9
 *  8. Formatar datas, Nr emp./ANO
 *  9. Inserir coluna "Unidade gestora"
 */
function transformarConsignados(workbook) {
  var sheet = workbook.Sheets[workbook.SheetNames[0]];
  fillMergedCells(sheet);
  var matrix = sheetToMatrix(sheet, { raw: true, defval: null });

  if (matrix.length < 4) throw new Error('Planilha com dados insuficientes');

  // Normalizar largura
  var maxC = 0;
  for (var i = 0; i < matrix.length; i++) {
    if ((matrix[i] || []).length > maxC) maxC = (matrix[i] || []).length;
  }
  for (var i = 0; i < matrix.length; i++) {
    if (!matrix[i]) matrix[i] = [];
    while (matrix[i].length < maxC) matrix[i].push(null);
  }

  var linhasOriginal = matrix.length;

  // ── 1) Detectar Unidade gestora ANTES de qualquer remoção ──
  {
    var unidadeAtual = null;
    for (var r = 0; r < matrix.length; r++) {
      var isMarker = false;
      var markerCol = -1;

      for (var c = 0; c < matrix[r].length; c++) {
        var v = matrix[r][c];
        if (v && typeof v === 'string' && /^unidade\s*gestora/i.test(v.trim())) {
          isMarker = true;
          markerCol = c;
          break;
        }
      }

      if (isMarker) {
        for (var c2 = 0; c2 < matrix[r].length; c2++) {
          if (c2 === markerCol) continue;
          var v2 = matrix[r][c2];
          if (v2 && typeof v2 === 'string' && v2.trim().length > 10) {
            unidadeAtual = v2.trim();
            break;
          }
        }
        matrix[r]._isUnidadeMarker = true;
      }

      matrix[r]._unidadeGestora = unidadeAtual;
    }
  }

  // ── 2) Deletar título (row 0: "Valores em R$") ──
  matrix.splice(0, 1);

  // Agora row 0 = cabeçalho
  // Colunas originais: 0=Data, 1=Nr emp., 2=Espécie, 3=Unid.orç, 4=Despesa,
  //                    5=Fonte, 6=Beneficiário, 7="", 8=Valor, 9=""

  // Renomear Beneficiário → Credor/Fornecedor (para compatibilidade com cruzamentos)
  if (matrix[0] && matrix[0][6] && /benefici/i.test(String(matrix[0][6]))) {
    matrix[0][6] = 'Credor/Fornecedor';
  }

  // ── 3) Filtrar linhas ──
  matrix = matrix.filter(function(row, r) {
    if (r === 0) return true;

    // Remover marcadores de Unidade gestora
    if (row._isUnidadeMarker) return false;

    // Remover sub-cabeçalhos ("Documento fiscal" / "Conta contábil")
    var col2 = row[2];
    if (col2 && typeof col2 === 'string') {
      var lower = col2.trim().toLowerCase();
      if (lower === 'documento fiscal') return false;
    }

    // Remover totais
    var col0 = row[0];
    if (col0 && typeof col0 === 'string') {
      var l0 = col0.trim().toLowerCase();
      if (l0.indexOf('total da unidade gestora') >= 0) return false;
      if (l0.indexOf('total geral') >= 0) return false;
    }

    // Remover linhas completamente vazias
    return row.some(function(v) { return !isEmptyCell(v); });
  });

  // ── 4) Separar colunas mistas ANTES do fill-down ──
  // Adicionar 2 novas colunas ao final: "Doc/nota fiscal" e "Tipo retenção"
  // Lógica: linhas de DETALHE (Nr emp. vazio, col 1) têm Doc fiscal na col 2 e Tipo retenção na col 4
  //         linhas de EMPENHO (Nr emp. preenchido) têm Espécie na col 2 e Despesa na col 4
  var colDocFiscal = maxC;     // nova coluna no final
  var colTipoRet = maxC + 1;  // outra nova coluna

  // Expandir todas as linhas para caber as novas colunas
  for (var r = 0; r < matrix.length; r++) {
    while (matrix[r].length <= colTipoRet) matrix[r].push(null);
  }

  // Cabeçalho das novas colunas
  matrix[0][colDocFiscal] = 'Doc/nota fiscal';
  matrix[0][colTipoRet] = 'Tipo retenção';

  // Também marcar cada linha com o sinal do Valor do empenho (para "Valor formula")
  var valorEmpenhoAtual = 0;

  for (var r = 1; r < matrix.length; r++) {
    var nrEmp = matrix[r][1];
    var isDetalhe = isEmptyCell(nrEmp);

    if (!isDetalhe) {
      // Linha de empenho: guardar o Valor para calcular sinal
      var valEmp = matrix[r][8];
      valorEmpenhoAtual = (typeof valEmp === 'number') ? valEmp : parseFloat(String(valEmp || '0'));
    }

    if (isDetalhe) {
      // Linha de detalhe: mover col 2 → Doc/nota fiscal, col 4 → Tipo retenção
      matrix[r][colDocFiscal] = matrix[r][2];
      matrix[r][colTipoRet] = matrix[r][4];
      // Limpar col 2 e col 4 para que fill-down preencha com dados do empenho
      matrix[r][2] = null;
      matrix[r][4] = null;
    }

    // Anotar o sinal do valor do empenho para uso posterior
    matrix[r]._valorEmpenho = valorEmpenhoAtual;
  }

  // ── 4b) Doc/nota fiscal: subir valores 1 linha + fill-down ──
  // Os valores de Doc/nota fiscal estão 1 linha abaixo do empenho; subir para alinhar
  for (var r = 1; r < matrix.length - 1; r++) {
    matrix[r][colDocFiscal] = matrix[r + 1][colDocFiscal];
  }
  matrix[matrix.length - 1][colDocFiscal] = null; // última linha fica vazia
  // Fill-down na coluna Doc/nota fiscal
  fillDown(matrix, colDocFiscal, 1);

  // ── 5) Fill-down nas colunas chave ──
  // Data(0), Nr emp.(1), Espécie(2), Unid. orçamentária(3), Despesa(4), Fonte(5), Beneficiário(6)
  // NÃO inclui Valor (8) — Valor só pertence à linha de empenho
  var fillCols = [0, 1, 2, 3, 4, 5, 6];
  for (var fi = 0; fi < fillCols.length; fi++) {
    fillDown(matrix, fillCols[fi], 1);
  }

  // ── 5b) Adicionar coluna "Valor formula" ──
  // Se Valor do empenho é negativo, Valor Retido vira negativo; senão mantém
  var colValorFormula = matrix[0].length;
  for (var r = 0; r < matrix.length; r++) {
    matrix[r].push(null);
  }
  matrix[0][colValorFormula] = 'Valor formula';

  for (var r = 1; r < matrix.length; r++) {
    var valRetido = matrix[r][7]; // Valor Retido/Consignado
    if (!isEmptyCell(valRetido)) {
      var numRetido = (typeof valRetido === 'number') ? valRetido : parseFloat(String(valRetido || '0'));
      var valEmpAnot = matrix[r]._valorEmpenho || 0;
      // Se o Valor do empenho é negativo, inverter o sinal do retido
      matrix[r][colValorFormula] = (valEmpAnot < 0) ? -Math.abs(numRetido) : Math.abs(numRetido);
    }
  }

  // ── 6) Excluir colunas: col 9 (vazia), col 8 (Valor), col 7 (Valor Retido/Consignado) ──
  // Deletar do maior índice para o menor para não deslocar
  var colsRemover = [9, 8, 7];
  for (var ci = 0; ci < colsRemover.length; ci++) {
    var colDel = colsRemover[ci];
    for (var r = 0; r < matrix.length; r++) {
      if (matrix[r].length > colDel) matrix[r].splice(colDel, 1);
    }
  }
  // Atualizar índices das colunas dinâmicas (cada uma desceu 3 posições)
  colDocFiscal -= 3;
  colTipoRet -= 3;
  colValorFormula -= 3;

  // Renomear "Valor formula" → "Valor Retido (R$)"
  matrix[0][colValorFormula] = 'Valor Retido (R$)';

  // ── 7) Filtrar: remover linhas sem Tipo retenção ──
  matrix = matrix.filter(function(row, r) {
    if (r === 0) return true; // cabeçalho
    return !isEmptyCell(row[colTipoRet]);
  });

  // ── 8) Formatar coluna Data (0) como DD/MM/AAAA ──
  for (var r = 1; r < matrix.length; r++) {
    var v = matrix[r][0];
    if (!isEmptyCell(v)) {
      matrix[r][0] = excelDateToString(v);
    }
  }

  // ── 9) Nr emp. → adicionar /ANO extraído da Data ──
  {
    var colNrEmp = 1;
    var colData = 0;
    formatNrEmpComAno(matrix, colNrEmp, colData, 1);
  }

  // ── 10) Inserir coluna "Unidade gestora" na posição 1 ──
  for (var r = 0; r < matrix.length; r++) {
    matrix[r].splice(1, 0, null);
  }
  matrix[0][1] = 'Unidade gestora';
  for (var r = 1; r < matrix.length; r++) {
    matrix[r][1] = matrix[r]._unidadeGestora || null;
  }

  // ── Montar workbook de saída ──
  var outSheet = matrixToSheet(matrix);
  var outWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(outWb, outSheet, 'Consignados');

  return {
    workbook: outWb,
    matrix: matrix,
    stats: {
      linhasOriginal: linhasOriginal - 1,
      linhasFinal: matrix.length - 1,
      linhasRemovidas: (linhasOriginal - 1) - (matrix.length - 1)
    }
  };
}
