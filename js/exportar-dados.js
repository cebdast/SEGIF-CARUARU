// =====================================================
// Funções de Exportação - SEFAZ Caruaru
// =====================================================

// Limite máximo de registros para exportação (evita Out of Memory)
const LIMITE_EXPORT_EXCEL = 100000;
const LIMITE_EXPORT_PDF = 50000;

// Função para formatar datas corretamente
function formatarDataExport(dataStr) {
  if (!dataStr || dataStr === '-' || dataStr === '') return '-';

  // Se já é um objeto Date
  if (dataStr instanceof Date) {
    const d = dataStr;
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  // Se é número serial do Excel
  if (typeof dataStr === 'number' && dataStr > 40000 && dataStr < 60000) {
    const d = new Date((dataStr - 25569) * 86400 * 1000);
    return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`;
  }

  const str = String(dataStr).trim();

  // Já está no formato DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;

  // Formato estranho: "02 00:00:00/01/2024"
  if (/^\d{2}\s+\d{2}:\d{2}:\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const m = str.match(/^(\d{2})\s+\d{2}:\d{2}:\d{2}\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  }

  // String numérica que pode ser serial do Excel
  const num = parseFloat(str);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const d = new Date((num - 25569) * 86400 * 1000);
    return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`;
  }

  // Formato ISO (YYYY-MM-DD)
  if (str.includes('-')) {
    const p = str.split('T')[0].split(' ')[0].split('-');
    if (p.length === 3 && p[0].length === 4) return `${p[2]}/${p[1]}/${p[0]}`;
  }

  // Tentar criar Date object
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1990) {
      return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    }
  } catch(e) {}

  return str;
}

// Verificar se uma coluna é de data
function isColunaData(nomeColuna) {
  const nome = nomeColuna.toLowerCase();
  return nome.includes('data') || nome === 'dt' || nome.includes('date');
}

// Exportar para Excel (usando SheetJS se disponível)
function exportarExcel(dados, nomeArquivo, colunas) {
  if (!dados || dados.length === 0) {
    alert('Não há dados para exportar.');
    return;
  }

  // Se não especificar colunas, usa todas as chaves do primeiro objeto
  if (!colunas) {
    colunas = Object.keys(dados[0]).filter(k => !k.startsWith('_') && k !== 'id');
  }

  // Limitar quantidade de registros para evitar Out of Memory
  let dadosParaExportar = dados;
  if (dados.length > LIMITE_EXPORT_EXCEL) {
    if (!confirm(`A exportação contém ${dados.length.toLocaleString()} registros. Para evitar problemas de memória, serão exportados os primeiros ${LIMITE_EXPORT_EXCEL.toLocaleString()} registros.\n\nDeseja continuar?`)) return;
    dadosParaExportar = dados.slice(0, LIMITE_EXPORT_EXCEL);
  }

  // Verificar se SheetJS está disponível
  if (typeof XLSX !== 'undefined') {
    try {
      // Preparar dados para o Excel com formatação de datas
      const dadosExcel = dadosParaExportar.map(item => {
        const obj = {};
        colunas.forEach(col => {
          let valor = item[col];
          if (valor === undefined || valor === null) {
            obj[col] = '';
          } else if (isColunaData(col)) {
            obj[col] = formatarDataExport(valor);
          } else {
            obj[col] = valor;
          }
        });
        return obj;
      });

      // Criar workbook
      const ws = XLSX.utils.json_to_sheet(dadosExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dados');

      // Ajustar largura das colunas - SEM usar spread operator (evita stack overflow)
      const maxWidth = colunas.map(col => {
        let max = col.length;
        // Amostrar apenas os primeiros 500 registros para calcular largura
        const amostra = Math.min(dadosParaExportar.length, 500);
        for (let i = 0; i < amostra; i++) {
          const len = String(dadosParaExportar[i][col] || '').length;
          if (len > max) max = len;
        }
        return { wch: Math.min(max + 2, 50) };
      });
      ws['!cols'] = maxWidth;

      // Download
      XLSX.writeFile(wb, nomeArquivo + '.xlsx');
    } catch (e) {
      console.error('Erro na exportação Excel:', e);
      alert('Erro ao exportar para Excel. Tente filtrar os dados para reduzir a quantidade de registros.');
    }
  } else {
    alert('Biblioteca Excel não carregada. Recarregue a página e tente novamente.');
  }
}

// Exportar para PDF (download direto usando jsPDF)
function exportarPDF(dados, nomeArquivo, titulo, colunas) {
  if (!dados || dados.length === 0) {
    alert('Não há dados para exportar.');
    return;
  }

  // Se não especificar colunas, usa todas as chaves do primeiro objeto
  if (!colunas) {
    colunas = Object.keys(dados[0]).filter(k => !k.startsWith('_') && k !== 'id');
  }

  // Limitar colunas para caber no PDF (máximo 9 colunas)
  const colunasLimitadas = colunas.slice(0, 9);

  // Limitar quantidade de registros para evitar Out of Memory
  let dadosParaExportar = dados;
  const totalOriginal = dados.length;
  if (dados.length > LIMITE_EXPORT_PDF) {
    if (!confirm(`A exportação contém ${dados.length.toLocaleString()} registros. Para evitar problemas de memória, serão exportados os primeiros ${LIMITE_EXPORT_PDF.toLocaleString()} registros.\n\nDeseja continuar?`)) return;
    dadosParaExportar = dados.slice(0, LIMITE_EXPORT_PDF);
  }

  // Verificar se jsPDF está disponível
  if (typeof window.jspdf !== 'undefined') {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('l', 'mm', 'a4'); // landscape

      // Calcular total de valores (do dataset COMPLETO)
      let totalValor = 0;
      const colunaValor = colunasLimitadas.find(c => c.toLowerCase().includes('valor') || c.includes('R$'));
      if (colunaValor) {
        for (let i = 0; i < dados.length; i++) {
          totalValor += parseFloat(dados[i][colunaValor]) || 0;
        }
      }

      // Título
      doc.setFontSize(16);
      doc.setTextColor(30, 58, 138);
      doc.text('SEFAZ - Prefeitura Municipal de Caruaru', 148, 15, { align: 'center' });

      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(titulo || 'Relatório', 148, 22, { align: 'center' });

      // Info
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Data: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
      const textoRegistros = totalOriginal > dadosParaExportar.length
        ? `Exibindo ${dadosParaExportar.length.toLocaleString()} de ${totalOriginal.toLocaleString()} registros`
        : `Total: ${dadosParaExportar.length.toLocaleString()} registros`;
      doc.text(textoRegistros, 160, 30);
      if (totalValor > 0) {
        doc.text(`Valor Total: ${totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 250, 30);
      }

      // Preparar dados para tabela - com limite
      const dadosTabela = dadosParaExportar.map(item =>
        colunasLimitadas.map(col => {
          let valor = item[col];
          if (valor === undefined || valor === null) return '-';

          // Formatar datas
          if (isColunaData(col)) {
            return formatarDataExport(valor);
          }

          // Formatar valores monetários
          const isValor = col.toLowerCase().includes('valor') || col.includes('R$');
          if (isValor && typeof valor === 'number') {
            return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          }

          return String(valor).substring(0, 40);
        })
      );

      // Gerar tabela com autoTable
      doc.autoTable({
        head: [colunasLimitadas],
        body: dadosTabela,
        startY: 35,
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 138], fontSize: 7, cellPadding: 2 },
        bodyStyles: { fontSize: 6, cellPadding: 1.5 },
        styles: { overflow: 'linebreak', cellWidth: 'wrap' },
        columnStyles: colunasLimitadas.reduce((acc, col, i) => {
          if (col.toLowerCase().includes('valor') || col.includes('R$')) {
            acc[i] = { halign: 'right' };
          }
          return acc;
        }, {}),
        margin: { left: 10, right: 10 }
      });

      // Rodapé em todas as páginas
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`SEFAZ - Prefeitura Municipal de Caruaru | Página ${i} de ${pageCount}`, 148, 200, { align: 'center' });
      }

      // Download direto
      doc.save(nomeArquivo + '.pdf');
    } catch (e) {
      console.error('Erro na exportação PDF:', e);
      alert('Erro ao exportar para PDF. Tente filtrar os dados para reduzir a quantidade de registros.');
    }
  } else {
    // Fallback se jsPDF não carregar
    alert('Biblioteca PDF não carregada. Recarregue a página e tente novamente.');
  }
}

// Exportar funções globalmente
window.exportarExcel = exportarExcel;
window.exportarPDF = exportarPDF;

