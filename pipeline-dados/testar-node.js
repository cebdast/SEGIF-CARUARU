/**
 * Teste automatizado das transformações JS vs Python
 * Roda no Node.js, compara célula a célula com os resultados Python
 *
 * Uso: node testar-node.js [credores|a-pagar|pagos|emitidos|liquidados|retidos|todos]
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// ================================================================
// Carregar utils e transformações (simular ambiente browser)
// ================================================================
eval(fs.readFileSync(path.join(__dirname, 'js', 'utils-transformacao.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'js', 'transformar-credores.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'js', 'transformar-a-pagar.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'js', 'transformar-pagos.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'js', 'transformar-emitidos.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'js', 'transformar-liquidados.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'js', 'transformar-retidos.js'), 'utf8'));

// ================================================================
// Configuração dos testes
// ================================================================
const TESTES = {
  'credores': {
    nome: 'Credores/Fornecedores (CPFECNPJ.py)',
    bruto: 'dados-brutos/Relacao_de_Credores_Fornecedores (1).xlsx',
    esperado: 'processados/Relacao_de_Credores_Fornecedores (1)_FILTRADO_TIPO.xlsx',
    funcao: transformarCredores
  },
  'a-pagar': {
    nome: 'Empenhos a Pagar (Empenhos a pagar.py)',
    bruto: 'dados-brutos/Relacao_de_Empenhos_a_Pagar_por_Data_de_Emissao___Completo (1).xlsx',
    esperado: 'processados/Relacao_de_Empenhos_a_Pagar_por_Data_de_Emissao___Completo (1)_FILTRADO.xlsx',
    funcao: transformarAPagar
  },
  'pagos': {
    nome: 'Empenhos Pagos (Empenhos pagos.py)',
    bruto: 'dados-brutos/Relacao_de_Empenhos_Pagos_Sintetico_por_Numero_de_Empenho (4).xlsx',
    esperado: 'processados/Relacao_de_Empenhos_Pagos_Sintetico_por_Numero_de_Empenho (4)_SAIDA.xlsx',
    funcao: transformarPagos
  },
  'emitidos': {
    nome: 'Empenhos Emitidos (Empenhos emitidos.py)',
    bruto: 'dados-brutos/Relacao_de_Empenhos_Emitidos_por_Data_de_Emissao___Mensal_Diario___Completo (4).xlsx',
    esperado: 'processados/Relacao_de_Empenhos_Emitidos_por_Data_de_Emissao___Mensal_Diario___Completo (4)_SAIDA.xlsx',
    funcao: transformarEmitidos
  },
  'liquidados': {
    nome: 'Empenhos Liquidados (Empenhos Liquidados.py)',
    bruto: 'dados-brutos/Relacao_de_Empenhos_Liquidados_por_Data_de_Movimento___Mensal_Diario___Completo (5).xlsx',
    esperado: 'processados/Relacao_de_Empenhos_Liquidados_por_Data_de_Movimento___Mensal_Diario___Completo (5)_FINAL.xlsx',
    funcao: transformarLiquidados,
    sheets: [
      { jsKey: 'matrix', pySheet: 'Liquidados Final', label: 'Liquidados Final' },
      { jsKey: 'matrixBruta', pySheet: 'Planilha Bruta Liq', label: 'Planilha Bruta Liq' }
    ]
  },
  'retidos': {
    nome: 'Empenhos Retidos (Empenhos retidos.py)',
    bruto: 'dados-brutos/Relacao_de_Retencoes_Consignacoes (1).xlsx',
    esperadoPattern: 'processados',
    esperadoFile: 'Retenção_Final_Separada.xlsx',
    funcao: transformarRetidos,
    sheets: [
      { jsKey: 'matrix', pySheet: 'GERAL', label: 'GERAL' },
      { jsKey: 'matrixBruta', pySheet: 'Planilha Bruta', label: 'Planilha Bruta' }
    ]
  }
};

// ================================================================
// Funções de comparação
// ================================================================
function normalizar(v) {
  if (v === null || v === undefined) return '';
  let s = String(v).trim();
  if (['nan', 'none', 'null', ''].includes(s.toLowerCase())) return '';
  return s;
}

function valoresIguais(a, b) {
  const sa = normalizar(a);
  const sb = normalizar(b);
  if (sa === sb) return true;
  if (sa === '' && sb === '') return true;

  // Comparar como números
  const na = parseFloat(sa.replace(',', '.'));
  const nb = parseFloat(sb.replace(',', '.'));
  if (!isNaN(na) && !isNaN(nb)) {
    const diff = Math.abs(na - nb);
    if (diff < 0.05) return true;
    // Tolerância relativa para números grandes (floating point)
    if (diff / Math.max(Math.abs(na), Math.abs(nb), 1) < 1e-8) return true;
  }

  // Comparar lowercase sem espaços extras
  if (sa.toLowerCase().replace(/\s+/g, '') === sb.toLowerCase().replace(/\s+/g, '')) return true;

  // Comparar datas em formatos diferentes
  // "DD/MM/YYYY" vs "YYYY-MM-DD 00:00:00"
  const dA = parseDate(sa), dB = parseDate(sb);
  if (dA && dB && dA.getTime() === dB.getTime()) return true;

  return false;
}

function parseDate(s) {
  // DD/MM/YYYY
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  // YYYY-MM-DD[ HH:MM:SS]
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return null;
}

function compararMatrizes(matrizJS, matrizPython, maxDiffs = 200) {
  const rowsJS = matrizJS.length;
  const rowsPy = matrizPython.length;
  const colsJS = matrizJS[0] ? matrizJS[0].length : 0;
  const colsPy = matrizPython[0] ? matrizPython[0].length : 0;

  const maxRows = Math.max(rowsJS, rowsPy);
  const maxCols = Math.max(colsJS, colsPy);

  const diffs = [];
  for (let r = 0; r < maxRows; r++) {
    for (let c = 0; c < maxCols; c++) {
      const vJS = r < rowsJS && c < (matrizJS[r] || []).length
        ? normalizar(matrizJS[r][c]) : '';
      const vPy = r < rowsPy && c < (matrizPython[r] || []).length
        ? normalizar(matrizPython[r][c]) : '';

      if (!valoresIguais(vJS, vPy)) {
        diffs.push({ row: r, col: c, js: vJS.substring(0, 60), python: vPy.substring(0, 60) });
      }
      if (diffs.length >= maxDiffs) break;
    }
    if (diffs.length >= maxDiffs) break;
  }

  return { diffs, rowsJS, rowsPy, colsJS, colsPy };
}

// ================================================================
// Resolver caminho do arquivo esperado (retidos tem encoding especial)
// ================================================================
function resolverEsperado(cfg) {
  if (cfg.esperado) return path.join(__dirname, cfg.esperado);
  if (cfg.esperadoPattern && cfg.esperadoFile) {
    const dir = path.join(__dirname, cfg.esperadoPattern);
    const files = fs.readdirSync(dir);
    const found = files.find(f => f.includes('Reten'));
    if (found) return path.join(dir, found);
    return path.join(dir, cfg.esperadoFile);
  }
  return null;
}

// ================================================================
// Executar teste (suporta single e multi-sheet)
// ================================================================
function executarTeste(chave) {
  const cfg = TESTES[chave];
  if (!cfg) { console.error(`Teste desconhecido: ${chave}`); return false; }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`TESTE: ${cfg.nome}`);
  console.log(`${'='.repeat(60)}`);

  const pathBruto = path.join(__dirname, cfg.bruto);
  const pathEsperado = resolverEsperado(cfg);

  if (!fs.existsSync(pathBruto)) {
    console.error(`  ERRO: Arquivo bruto nao encontrado: ${cfg.bruto}`);
    return false;
  }
  if (!pathEsperado || !fs.existsSync(pathEsperado)) {
    console.error(`  ERRO: Arquivo esperado nao encontrado`);
    return false;
  }

  console.log(`  Lendo bruto: ${cfg.bruto}`);
  const t0 = Date.now();
  const wbBruto = XLSX.readFile(pathBruto);

  console.log(`  Executando transformacao JS...`);
  let resultado;
  try {
    resultado = cfg.funcao(wbBruto);
  } catch (e) {
    console.error(`  ERRO na transformacao: ${e.message}`);
    console.error(e.stack);
    return false;
  }
  const tempoMs = Date.now() - t0;
  console.log(`  Tempo: ${tempoMs}ms`);
  console.log(`  Stats: ${JSON.stringify(resultado.stats)}`);

  // Ler esperado
  console.log(`  Lendo esperado...`);
  const wbEsperado = XLSX.readFile(pathEsperado);

  // Multi-sheet comparison
  const sheetsToCompare = cfg.sheets || [{ jsKey: 'matrix', pySheet: wbEsperado.SheetNames[0], label: 'Principal' }];

  let allOk = true;
  for (const sc of sheetsToCompare) {
    console.log(`\n  --- Comparando aba: ${sc.label} ---`);

    // Get JS matrix
    const matrizJS = (resultado[sc.jsKey] || resultado.matrix).map(row =>
      (row || []).map(v => v === null || v === undefined ? '' : String(v))
    );

    // Get Python matrix
    const pySheet = wbEsperado.Sheets[sc.pySheet];
    if (!pySheet) {
      console.log(`  WARN: Aba "${sc.pySheet}" nao encontrada no esperado`);
      continue;
    }
    const matrizPython = XLSX.utils.sheet_to_json(pySheet, { header: 1, raw: false, defval: '' });

    const comp = compararMatrizes(matrizJS, matrizPython);
    console.log(`  JS:     ${comp.rowsJS} linhas x ${comp.colsJS} colunas`);
    console.log(`  Python: ${comp.rowsPy} linhas x ${comp.colsPy} colunas`);

    if (comp.diffs.length === 0 && comp.rowsJS === comp.rowsPy && comp.colsJS === comp.colsPy) {
      console.log(`  RESULTADO: IDENTICOS!`);
    } else {
      allOk = false;
      console.log(`  RESULTADO: ${comp.diffs.length} DIFERENCA(S)`);
      if (comp.rowsJS !== comp.rowsPy) {
        console.log(`  Linhas: JS=${comp.rowsJS} vs Python=${comp.rowsPy}`);
      }
      if (comp.colsJS !== comp.colsPy) {
        console.log(`  Colunas: JS=${comp.colsJS} vs Python=${comp.colsPy}`);
      }
      for (const d of comp.diffs.slice(0, 20)) {
        const hdr = matrizJS[0] && d.col < matrizJS[0].length ? matrizJS[0][d.col] : `Col${d.col}`;
        console.log(`  Linha ${d.row + 1}, Col "${hdr}" [${d.col}]:`);
        console.log(`    JS     = "${d.js}"`);
        console.log(`    Python = "${d.python}"`);
      }
      if (comp.diffs.length > 20) console.log(`  ... e mais ${comp.diffs.length - 20} diferencas`);
    }
  }

  // Salvar resultado JS
  if (!allOk) {
    const outPath = path.join(__dirname, `teste-resultado-${chave}.xlsx`);
    XLSX.writeFile(resultado.workbook, outPath);
    console.log(`\n  Resultado JS salvo em: ${outPath}`);
  }
  console.log(`${'='.repeat(60)}`);
  return allOk;
}

// ================================================================
// Main
// ================================================================
const args = process.argv.slice(2);
const alvo = args[0] || 'todos';
const CHAVES_VALIDAS = Object.keys(TESTES);

let resultados = {};

if (alvo === 'todos') {
  for (const ch of CHAVES_VALIDAS) resultados[ch] = executarTeste(ch);
} else if (TESTES[alvo]) {
  resultados[alvo] = executarTeste(alvo);
} else {
  console.error(`Uso: node testar-node.js [${CHAVES_VALIDAS.join('|')}|todos]`);
  process.exit(1);
}

// Resumo
console.log(`\n${'='.repeat(60)}`);
console.log('RESUMO DOS TESTES');
console.log(`${'='.repeat(60)}`);
let allOk = true;
for (const [ch, ok] of Object.entries(resultados)) {
  const ico = ok ? 'OK' : 'XX';
  console.log(`  [${ico}] ${ch}: ${ok ? 'PASS' : 'FAIL'}`);
  if (!ok) allOk = false;
}
console.log(`${'='.repeat(60)}`);
process.exit(allOk ? 0 : 1);

