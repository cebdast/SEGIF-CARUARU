# -*- coding: utf-8 -*-
"""
FILTRAR LINHAS E COLUNAS VAZIAS + CORTAR "Av. liquid." + PREENCHER DATAS + FORMATAR DATA
---------------------------------------------------------------------------------------
✅ Remove linhas onde a coluna "Av. liquid." está vazia
✅ Remove colunas completamente vazias (ignora cabeçalho)
✅ Corta coluna "Av. liquid." para apenas 7 primeiros caracteres
✅ Preenche datas vazias com a última data válida (forward fill)
✅ Formata coluna A como data (dd/mm/aaaa)
✅ Rápido e simples usando pandas
✅ Salva como: <arquivo>_FILTRADO.xlsx
"""

import pandas as pd
import tkinter as tk
from tkinter import filedialog
from pathlib import Path
import sys


def filtrar_av_liquid(arquivo_excel):
    """Filtra e remove linhas vazias da coluna 'Av. liquid.' e remove colunas vazias"""
    try:
        # Lê o arquivo Excel
        print(f"📖 Lendo arquivo: {arquivo_excel}")
        df = pd.read_excel(arquivo_excel)
        
        print(f"📊 Total de linhas antes: {len(df)}")
        print(f"📊 Total de colunas antes: {len(df.columns)}")
        
        # Procura a coluna "Av. liquid." (case insensitive)
        coluna_av_liquid = None
        for col in df.columns:
            if 'av. liquid' in str(col).lower():
                coluna_av_liquid = col
                break
        
        if coluna_av_liquid is None:
            print("❌ Coluna 'Av. liquid.' não encontrada!")
            print("Colunas disponíveis:", list(df.columns))
            return None
        
        print(f"✅ Coluna encontrada: '{coluna_av_liquid}'")
        
        # Remove linhas onde a coluna está vazia (NaN, None, ou string vazia)
        df_filtrado = df.dropna(subset=[coluna_av_liquid])
        df_filtrado = df_filtrado[df_filtrado[coluna_av_liquid].astype(str).str.strip() != '']
        
        linhas_removidas = len(df) - len(df_filtrado)
        print(f"🗑️  Linhas removidas: {linhas_removidas}")
        print(f"📊 Total de linhas depois: {len(df_filtrado)}")
        
        # Remove colunas completamente vazias (ignora cabeçalho - linha 0)
        colunas_antes = len(df_filtrado.columns)
        
        # Identifica colunas vazias (todas as células são NaN ou string vazia, exceto o cabeçalho)
        colunas_para_manter = []
        colunas_removidas = []
        
        for col in df_filtrado.columns:
            # Verifica se a coluna tem pelo menos um valor não vazio (excluindo o cabeçalho)
            valores_coluna = df_filtrado[col].dropna()  # Remove NaN
            valores_coluna = valores_coluna.astype(str).str.strip()  # Remove espaços
            valores_nao_vazios = valores_coluna[valores_coluna != '']  # Remove strings vazias
            
            if len(valores_nao_vazios) > 0:
                colunas_para_manter.append(col)
            else:
                colunas_removidas.append(col)
        
        # Mantém apenas as colunas que têm dados
        df_filtrado = df_filtrado[colunas_para_manter]
        
        colunas_depois = len(df_filtrado.columns)
        print(f"🗑️  Colunas removidas: {len(colunas_removidas)}")
        if colunas_removidas:
            print(f"   Colunas removidas: {colunas_removidas}")
        print(f"📊 Total de colunas depois: {colunas_depois}")
        
        # Pega apenas os 7 primeiros caracteres da coluna "Av. liquid."
        print(f"✂️  Cortando coluna '{coluna_av_liquid}' para 7 primeiros caracteres...")
        df_filtrado[coluna_av_liquid] = df_filtrado[coluna_av_liquid].astype(str).str[:7]
        
        # Preenche datas vazias com a última data válida (forward fill)
        print(f"📅 Preenchendo datas vazias...")
        colunas_data = []
        
        # Identifica colunas que podem ser datas
        for col in df_filtrado.columns:
            col_name = str(col).lower()
            if any(palavra in col_name for palavra in ['data', 'date', 'dt', 'emissao', 'vencimento']):
                colunas_data.append(col)
        
        if colunas_data:
            print(f"   Colunas de data encontradas: {colunas_data}")
            for col_data in colunas_data:
                # Preenche células vazias com a última data válida (forward fill)
                df_filtrado[col_data] = df_filtrado[col_data].ffill()
                print(f"   ✅ Preenchido: {col_data}")
        else:
            print("   ⚠️  Nenhuma coluna de data identificada automaticamente")
            # Se não encontrou colunas de data automaticamente, tenta preencher a primeira coluna
            if len(df_filtrado.columns) > 0:
                primeira_col = df_filtrado.columns[0]
                print(f"   📅 Tentando preencher primeira coluna: {primeira_col}")
                df_filtrado[primeira_col] = df_filtrado[primeira_col].ffill()
        
        # Salva o arquivo filtrado
        arquivo_saida = Path(arquivo_excel).with_name(f"{Path(arquivo_excel).stem}_FILTRADO.xlsx")
        
        # Salva com formatação de data na coluna A
        print(f"📅 Formatando coluna A como data (dd/mm/aaaa)...")
        with pd.ExcelWriter(arquivo_saida, engine='openpyxl') as writer:
            df_filtrado.to_excel(writer, index=False, sheet_name='Sheet1')
            
            # Acessa a planilha para aplicar formatação
            worksheet = writer.sheets['Sheet1']
            
            # Aplica formato de data abreviada na coluna A (dd/mm/aa)
            from openpyxl.styles import NamedStyle
            
            # Cria estilo de data abreviada
            date_style = NamedStyle(name='date_short', number_format='DD/MM/YYYY')
            
            # Aplica o formato na coluna A (exceto cabeçalho)
            for row in range(2, len(df_filtrado) + 2):  # Começa da linha 2 (pula cabeçalho)
                cell = worksheet[f'A{row}']
                cell.style = date_style
        
        print(f"✅ Arquivo salvo: {arquivo_saida}")
        return arquivo_saida
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return None


def main():
    # Se passou arquivo por parâmetro
    if len(sys.argv) >= 2 and sys.argv[1].strip():
        arquivo = sys.argv[1]
        filtrar_av_liquid(arquivo)
        return
    
    # Senão, abre dialog para selecionar arquivo
    root = tk.Tk()
    root.withdraw()
    
    arquivo = filedialog.askopenfilename(
        title="Selecione o arquivo Excel",
        filetypes=[("Excel files", "*.xlsx *.xls *.xlsm")]
    )
    
    if not arquivo:
        print("❌ Nenhum arquivo selecionado")
        return
    
    filtrar_av_liquid(arquivo)


if __name__ == "__main__":
    main()