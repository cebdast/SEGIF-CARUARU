/**
 * Transformação: Empenhos Retidos/Consignações
 * Port de Empenhos retidos.py
 *
 * Pipeline (refatorado com buscas por nome de coluna):
 * 1. Ler aba(s) como strings, localizar colunas por nome no cabeçalho
 * 2. Copiar coluna entre "Protocolo" e "Doc. fiscal" para última
 * 3. Remover totais e linhas com termos
 * 4. Excluir colunas desnecessárias (computado dinamicamente dos nomes)
 * 5. Fill-down nas colunas-chave (por nome), trocar "Seq. estor." com última
 * 6. Padronizar para 12 colunas, converter valores numéricos
 * 7. Separar por tipo de retenção em múltiplas abas
 *
 * Saída: workbook com GERAL, TOTAL, abas individuais, LISTA, Planilha Bruta
 */

// =========================================================
// Utilitários
// =========================================================
const _RET_INVALID_CHARS = /[:\\/\?\*\[\]]/g;

function _retNomeAba(txt) {
  if (txt == null) txt = '';
  let n = String(txt).trim().replace(_RET_INVALID_CHARS, '_');
  if (!n || n.toLowerCase() === 'nan') n = 'RETENCAO';
  return n.substring(0, 31);
}

function _retValorFloat(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  let s = String(v).trim().replace('R$', '').replace(/ /g, '');
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
    const f = parseFloat(s);
    return isNaN(f) ? 0 : f;
  }
  const f = parseFloat(s);
  return isNaN(f) ? 0 : f;
}

function _retConverterNum(v) {
  if (v == null) return v;
  const s = String(v).trim();
  if (!s) return v;
  const s2 = s.replace(/\./g, ',');
  const n = parseFloat(s2.replace(/,/g, '.'));
  return isNaN(n) ? v : n;
}

function _retNormBusca(txt) {
  if (txt == null) return '';
  return String(txt).replace(/\xa0/g, ' ').replace(/[\r\n\t]+/g, ' ').trim().toLowerCase();
}

function _retLinhaContem(row, termo) {
  for (const v of row) {
    if (_retNormBusca(v).includes(termo)) return true;
  }
  return false;
}

function _retLinhaContemAlgum(row, termos) {
  for (const t of termos) {
    if (_retLinhaContem(row, t)) return true;
  }
  return false;
}

function _retLinhaVazia(row) {
  return row.every(v => _retNormBusca(v) === '');
}

// Converte data serial do Excel para "DD/MM/AAAA" (padrão brasileiro)
function _retDateStr(v) {
  if (typeof v === 'number' && v > 30000 && v < 70000) {
    return excelDateToString(v);
  }
  // Se já for string no formato "YYYY-MM-DD..." converter para DD/MM/AAAA
  if (typeof v === 'string') {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    if (m) return m[3] + '/' + m[2] + '/' + m[1];
  }
  return v;
}

// =========================================================
// Cabeçalho final (12 colunas)
// =========================================================
const NOVO_CABECALHO = [
  'Data', 'Retenção', 'Sequência', 'Seq. Liq.', 'Fonte recursos',
  'Nr emp.', 'Credor/Fornecedor', 'CNPJ',
  'Valor retido', 'Doc. fiscal', 'Doc.extra', 'Valor'
];

// =========================================================
// Localização de colunas no cabeçalho bruto (row 1)
// =========================================================
function _retLocalizarColunas(rawHeader) {
  // Buscar colunas nomeadas no cabeçalho bruto (case-insensitive, parcial)
  const cols = {};

  cols.data = findColumn(rawHeader, 'Data', true);
  if (cols.data < 0) cols.data = 0; // fallback

  cols.sequencia = findColumn(rawHeader, 'Sequência');
  if (cols.sequencia < 0) cols.sequencia = findColumn(rawHeader, 'Sequ');

  cols.seqEstor = findColumn(rawHeader, 'Seq. estor');
  if (cols.seqEstor < 0) cols.seqEstor = findColumn(rawHeader, 'estor');

  cols.fonte = findColumn(rawHeader, 'Fonte recursos');
  if (cols.fonte < 0) cols.fonte = findColumn(rawHeader, 'Fonte');

  cols.nrEmpenho = findColumn(rawHeader, 'empenho');

  cols.credor = findColumn(rawHeader, 'Credor/Fornecedor');
  if (cols.credor < 0) cols.credor = findColumn(rawHeader, 'Credor');

  cols.avLiquid = findColumn(rawHeader, 'Av. liquid');
  if (cols.avLiquid < 0) cols.avLiquid = findColumn(rawHeader, 'liquid');

  cols.protocolo = findColumn(rawHeader, 'Protocolo');

  cols.docFiscal = findColumn(rawHeader, 'Doc. fiscal');
  if (cols.docFiscal < 0) cols.docFiscal = findColumn(rawHeader, 'fiscal');

  cols.valor = findColumn(rawHeader, 'Valor', true);

  return cols;
}

// =========================================================
// Transformação principal
// =========================================================
function transformarRetidos(workbook) {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Ler como raw (preservar tipos)
  let rows = sheetToMatrix(sheet, { raw: true, defval: null });
  if (rows.length < 3) throw new Error('Planilha com dados insuficientes');

  // Row 1 é o cabeçalho real (row 0 geralmente é "Valores em R$" ou título)
  const rawHeader = rows.length > 1 ? rows[1] : rows[0];
  const loc = _retLocalizarColunas(rawHeader);

  // Converter datas na coluna "Data" (localizada por nome) para formato string
  for (let r = 0; r < rows.length; r++) {
    if (rows[r] && rows[r][loc.data] != null) {
      rows[r][loc.data] = _retDateStr(rows[r][loc.data]);
    }
  }

  // Converter tudo para string (simula dtype=str)
  for (let r = 0; r < rows.length; r++) {
    if (!rows[r]) { rows[r] = []; continue; }
    for (let c = 0; c < rows[r].length; c++) {
      const v = rows[r][c];
      if (v == null) rows[r][c] = '';
      else if (typeof v === 'number') {
        rows[r][c] = Number.isInteger(v) ? String(v) : String(v);
      } else {
        rows[r][c] = String(v);
      }
    }
  }

  // Normalizar largura
  let ncols = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].length > ncols) ncols = rows[i].length;
  }
  for (const rw of rows) while (rw.length < ncols) rw.push('');

  const linhasOriginal = rows.length;

  // Coluna a copiar para o final: "Av. liquid." (dados de Av. liquidação)
  const copyColIdx = loc.avLiquid >= 0 ? loc.avLiquid : 14;

  // Inserir 2 colunas em branco + copiar coluna "Av. liquid." para última
  for (const rw of rows) { rw.push(''); rw.push(''); }
  if (copyColIdx < ncols) {
    for (const rw of rows) rw.push(rw[copyColIdx] || '');
  } else {
    for (const rw of rows) rw.push('');
  }

  // Remover "total geral"
  rows = rows.filter(rw => !_retLinhaContem(rw, 'total geral'));

  // =========================================================
  // Determinar colunas a MANTER (computado dinamicamente dos nomes)
  // Layout SIGEF: colunas nomeadas intercaladas com colunas vazias
  // que podem carregar dados em linhas mescladas.
  // =========================================================
  const keepSet = new Set();

  // Data + coluna adjacente à direita (contém dados de Retenção)
  if (loc.data >= 0) { keepSet.add(loc.data); keepSet.add(loc.data + 1); }

  // Sequência, Seq. estor., Fonte recursos (sem adjacentes)
  for (const idx of [loc.sequencia, loc.seqEstor, loc.fonte]) {
    if (idx >= 0) keepSet.add(idx);
  }

  // Nr. empenho
  if (loc.nrEmpenho >= 0) keepSet.add(loc.nrEmpenho);

  // Credor/Fornecedor + 2ª e 3ª colunas adjacentes (dados CNPJ e valor auxiliar)
  // Pula a 1ª adjacente (padding vazio)
  if (loc.credor >= 0) {
    keepSet.add(loc.credor);
    keepSet.add(loc.credor + 2);
    keepSet.add(loc.credor + 3);
  }

  // Doc. fiscal + 1 adjacente (dados Doc.extra)
  if (loc.docFiscal >= 0) {
    keepSet.add(loc.docFiscal);
    keepSet.add(loc.docFiscal + 1);
  }

  // Valor + adjacentes restantes até o fim das colunas originais
  if (loc.valor >= 0) {
    keepSet.add(loc.valor);
    keepSet.add(loc.valor + 1);
    keepSet.add(loc.valor + 2);
  }

  // Colunas adicionadas (2 blancos + cópia de Av. liquid.)
  keepSet.add(ncols);
  keepSet.add(ncols + 1);
  keepSet.add(ncols + 2);

  // Construir lista de exclusão (tudo que NÃO está no keepSet)
  const totalWidth = rows[0].length;
  const colsExcluir = [];
  for (let c = 0; c < totalWidth; c++) {
    if (!keepSet.has(c)) colsExcluir.push(c);
  }
  // Deletar em ordem decrescente para manter índices corretos
  const colsDelSorted = colsExcluir.sort((a, b) => b - a);
  for (const ci of colsDelSorted) {
    for (const rw of rows) { if (ci < rw.length) rw.splice(ci, 1); }
  }

  // Excluir linhas com termos (a partir da linha 3 = índice 2)
  const termos = ['conta contábil', 'valor', 'doc. extraorçamentário'];
  if (rows.length > 2) {
    const head2 = rows.slice(0, 2);
    const body = rows.slice(2).filter(rw => !_retLinhaContemAlgum(rw, termos));
    rows = head2.concat(body);
  }

  // Excluir linhas vazias
  rows = rows.filter(rw => !_retLinhaVazia(rw));

  // Excluir linha 0 (título "Valores em R$" ou similar)
  if (rows.length > 1) rows.splice(0, 1);

  // =========================================================
  // Fill-down: calcular posições pós-exclusão a partir dos nomes originais
  // =========================================================
  const keepSorted = Array.from(keepSet).sort((a, b) => a - b);

  function postDelPos(origIdx) {
    return keepSorted.indexOf(origIdx);
  }

  const fillTargets = [];
  // Colunas nomeadas para fill-down
  const fillOrigCols = [
    loc.data,       // Data
    loc.sequencia,  // Sequência
    loc.fonte,      // Fonte recursos
    loc.nrEmpenho,  // Nr. empenho
    loc.credor      // Credor/Fornecedor
  ];
  for (const origIdx of fillOrigCols) {
    if (origIdx >= 0) {
      const p = postDelPos(origIdx);
      if (p >= 0) fillTargets.push(p);
    }
  }
  // Doc. fiscal (dados que precisam de fill-down)
  if (loc.docFiscal >= 0) {
    const p = postDelPos(loc.docFiscal);
    if (p >= 0) fillTargets.push(p);
  }
  // Última coluna (cópia de Av. liquid.)
  const lastIdx = rows[0].length - 1;
  if (lastIdx >= 0 && !fillTargets.includes(lastIdx)) fillTargets.push(lastIdx);

  for (const ci of fillTargets) {
    let lastV = '';
    for (let r = 0; r < rows.length; r++) {
      const v = rows[r][ci];
      if (v === '' || v == null) {
        rows[r][ci] = lastV;
      } else {
        lastV = v;
      }
    }
  }

  // Trocar coluna "Seq. estor." com a última
  const swapIdx = loc.seqEstor >= 0 ? postDelPos(loc.seqEstor) : 3;
  if (swapIdx >= 0 && rows[0].length > swapIdx) {
    const li = rows[0].length - 1;
    for (const rw of rows) {
      const tmp = rw[swapIdx];
      rw[swapIdx] = rw[li];
      rw[li] = tmp;
    }
  }

  // Ajustar para 12 colunas (NOVO_CABECALHO.length)
  for (const rw of rows) {
    if (rw.length > NOVO_CABECALHO.length) rw.length = NOVO_CABECALHO.length;
    while (rw.length < NOVO_CABECALHO.length) rw.push('');
  }

  // Inserir header (no Python, df.columns = NOVO_CABECALHO não sobrescreve dados)
  rows.unshift([...NOVO_CABECALHO]);

  // Converter valores numéricos por nome de coluna no NOVO_CABECALHO
  const iVR = NOVO_CABECALHO.indexOf('Valor retido');
  const iV = NOVO_CABECALHO.indexOf('Valor');
  for (let r = 1; r < rows.length; r++) {
    if (iVR >= 0) rows[r][iVR] = _retConverterNum(rows[r][iVR]);
    if (iV >= 0) rows[r][iV] = _retConverterNum(rows[r][iV]);
  }

  // df_bruta = rows processados (com header)
  const dfBruta = rows.map(rw => [...rw]);

  // =========================================================
  // Parte 2: Separar por Retenção (usando nomes do NOVO_CABECALHO)
  // =========================================================
  const header = rows[0];
  const dataRows = rows.slice(1);

  const retIdx = NOVO_CABECALHO.indexOf('Retenção');
  const vrIdx = NOVO_CABECALHO.indexOf('Valor retido');

  // Separar em válidas e vazias
  const validas = dataRows.filter(rw => {
    const rt = String(rw[retIdx]).trim();
    return rt && rt.toLowerCase() !== 'nan' && rt.toLowerCase() !== 'none';
  });
  const vazias = dataRows.filter(rw => {
    const rt = String(rw[retIdx]).trim();
    return !rt || rt.toLowerCase() === 'nan' || rt.toLowerCase() === 'none';
  });

  // Tipos únicos ordenados
  const tipos = [...new Set(validas.map(rw => String(rw[retIdx]).trim()))].sort();

  // =========================================================
  // Montar workbook de saída
  // =========================================================
  const outWb = XLSX.utils.book_new();

  // GERAL
  const mGeral = [header, ...validas];
  XLSX.utils.book_append_sheet(outWb, matrixToSheet(mGeral), 'GERAL');

  // TOTAL
  if (vazias.length > 0) {
    XLSX.utils.book_append_sheet(outWb, matrixToSheet([header, ...vazias]), 'TOTAL');
  }

  // Abas individuais
  for (const tipo of tipos) {
    const bloco = validas.filter(rw => String(rw[retIdx]).trim() === tipo);
    const nome = _retNomeAba(tipo);
    XLSX.utils.book_append_sheet(outWb, matrixToSheet([header, ...bloco]), nome);
  }

  // LISTA (resumo)
  const listaHeader = ['Retenção', 'Qtd Linhas', 'Soma Geral', 'Soma Individuais'];
  const listaRows = [listaHeader];
  let totalQtd = 0, totalGeral = 0, totalIndiv = 0;
  for (const tipo of tipos) {
    const bloco = validas.filter(rw => String(rw[retIdx]).trim() === tipo);
    const qtd = bloco.length;
    const soma = bloco.reduce((s, rw) => s + _retValorFloat(rw[vrIdx]), 0);
    listaRows.push([tipo, qtd, soma, soma]);
    totalQtd += qtd;
    totalGeral += soma;
    totalIndiv += soma;
  }
  listaRows.push(['TOTAL GERAL', totalQtd, totalGeral, totalIndiv]);
  XLSX.utils.book_append_sheet(outWb, matrixToSheet(listaRows), 'LISTA');

  // Planilha Bruta
  XLSX.utils.book_append_sheet(outWb, matrixToSheet(dfBruta), 'Planilha Bruta');

  return {
    workbook: outWb,
    matrix: mGeral,
    matrixBruta: dfBruta,
    stats: {
      linhasOriginal: linhasOriginal - 1,
      linhasFinal: validas.length,
      tiposRetencao: tipos.length,
      totalAbas: outWb.SheetNames.length
    }
  };
}
