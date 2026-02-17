// =====================================================
// Plugin Chart.js: Variação Percentual entre Barras
// =====================================================
// Exibe badges coloridos com a variação % entre datasets
// de barras em gráficos de comparação de anos.
//
// Uso: adicionar `plugins: [pluginVariacaoPercentual]` na
// config do Chart, e `layout.padding.bottom: 30` nas options.

const pluginVariacaoPercentual = {
  id: 'variacaoPercentual',

  afterDraw(chart) {
    const { ctx, data, chartArea, scales } = chart;
    if (!data.datasets || data.datasets.length < 2) return;

    const chartType = chart.config.type;
    if (chartType !== 'bar') return;

    // Coletar apenas datasets do tipo bar
    const barMetas = [];
    data.datasets.forEach((ds, idx) => {
      const tipo = ds.type || chartType;
      if (tipo === 'bar') {
        barMetas.push({ ds, idx, meta: chart.getDatasetMeta(idx) });
      }
    });

    if (barMetas.length < 2) return;

    // Para cada par consecutivo de datasets (ano mais recente vs anterior)
    for (let p = 0; p < barMetas.length - 1; p++) {
      const newer = barMetas[p];
      const older = barMetas[p + 1];

      // Verificar se o dataset "anterior" tem dados (Caso Ano vs Ano)
      const temDadosAnoAnterior = older.ds.data.some(v => (parseFloat(v) || 0) > 0);

      for (let i = 0; i < data.labels.length; i++) {
        let val1, val2;

        if (temDadosAnoAnterior) {
          // COMPARAÇÃO ANO VS ANO (Comportamento original)
          val1 = newer.ds.data[i] || 0;
          val2 = older.ds.data[i] || 0;
        } else {
          // COMPARAÇÃO MÊS VS MÊS ANTERIOR (Novo comportamento para ano único)
          if (i === 0) continue; // Pula Janeiro (não tem mês anterior)
          val1 = newer.ds.data[i] || 0;
          val2 = newer.ds.data[i - 1] || 0;
        }

        if (val2 === 0 && val1 === 0) continue;

        const variacao = val2 > 0
          ? ((val1 - val2) / val2 * 100)
          : (val1 > 0 ? 100 : 0);

        const bar1 = newer.meta.data[i];
        // Se for comparação Ano vs Ano, usa as duas barras. Se for MoM, usa apenas a atual.
        const centerX = temDadosAnoAnterior 
          ? (bar1.x + older.meta.data[i].x) / 2 
          : bar1.x;
        
        if (!bar1 || (temDadosAnoAnterior && !older.meta.data[i])) continue;
        const bottomY = chartArea.bottom;

        const text = (variacao >= 0 ? '+' : '') + Math.round(variacao) + '%';

        ctx.save();
        ctx.font = 'bold 8px Inter, sans-serif';
        const textWidth = ctx.measureText(text).width;
        const boxW = textWidth + 6;
        const boxH = 13;
        const boxX = centerX - boxW / 2;
        const boxY = bottomY + 28 + (p * 16);

        // Fundo colorido com bordas arredondadas
        const r = 3;
        const isPositive = variacao >= 0;
        ctx.fillStyle = isPositive ? '#16a34a' : '#dc2626';
        ctx.beginPath();
        ctx.moveTo(boxX + r, boxY);
        ctx.lineTo(boxX + boxW - r, boxY);
        ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
        ctx.lineTo(boxX + boxW, boxY + boxH - r);
        ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
        ctx.lineTo(boxX + r, boxY + boxH);
        ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
        ctx.lineTo(boxX, boxY + r);
        ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
        ctx.closePath();
        ctx.fill();

        // Texto branco
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, centerX, boxY + boxH / 2);
        ctx.restore();
      }
    }
  }
};
