/**
 * Transformação: Relação de Credores/Fornecedores
 * Port de CPFECNPJ.py
 *
 * Pipeline:
 * 1. Ler planilha como texto (preservar zeros à esquerda)
 * 2. Extrair CPF/CNPJ da coluna "CPF/CNPJ" → apenas 11 ou 14 dígitos
 * 3. Criar coluna Tipo (CPF ou CNPJ)
 * 4. Remover linhas sem CPF/CNPJ válido
 * 5. Manter apenas colunas: Código, Credor/Fornecedor, CPF/CNPJ, Cidade - UF, CPF_CNPJ, Tipo
 * 6. Retornar resultado
 */
function transformarCredores(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // Ler como texto (raw:false = SheetJS formata; defval='' = sem nulos)
  const matrix = sheetToMatrix(sheet, { raw: false, defval: '' });

  if (matrix.length < 2) throw new Error('Planilha vazia ou sem dados');

  const header = matrix[0];

  // Localizar coluna CPF/CNPJ pelo nome do cabeçalho
  const colCpfCnpj = findColumn(header, 'CPF/CNPJ');
  if (colCpfCnpj === -1) {
    throw new Error('Coluna "CPF/CNPJ" não encontrada. Colunas disponíveis: [' + header.join(', ') + ']');
  }

  function extrairDigitos(texto) {
    if (isEmptyCell(texto)) return null;
    const digits = String(texto).replace(/\D/g, '');
    return (digits.length === 11 || digits.length === 14) ? digits : null;
  }

  // Adicionar CPF_CNPJ e Tipo, filtrando linhas sem CPF/CNPJ válido
  const resultado = [[...header, 'CPF_CNPJ', 'Tipo']];

  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    const valorCpf = row.length > colCpfCnpj ? row[colCpfCnpj] : '';
    const cpfCnpj = extrairDigitos(valorCpf);
    if (cpfCnpj === null) continue; // Remove linhas sem CPF/CNPJ

    const tipo = cpfCnpj.length === 11 ? 'CPF' : 'CNPJ';
    resultado.push([...row, cpfCnpj, tipo]);
  }

  // Manter apenas colunas desejadas por nome (abordagem keep-by-name)
  const headerComExtras = resultado[0];
  const colunasDesejadas = ['Código', 'Credor/Fornecedor', 'CPF/CNPJ', 'Cidade - UF', 'CPF_CNPJ', 'Tipo'];
  const final = keepColumns(resultado, headerComExtras, colunasDesejadas);

  const outSheet = matrixToSheet(final);
  const outWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(outWb, outSheet, 'Resultado');

  return {
    workbook: outWb,
    matrix: final,
    stats: {
      linhasOriginal: matrix.length - 1,
      linhasFinal: final.length - 1,
      linhasRemovidas: (matrix.length - 1) - (final.length - 1)
    }
  };
}
