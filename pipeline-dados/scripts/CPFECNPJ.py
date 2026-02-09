# -*- coding: utf-8 -*-
"""
CPF_CNPJ_PROCESSO_v3.2.py
-------------------------------------
Pipeline em etapas:
1) Selecionar arquivo
2) Ler planilha como texto
3) Extrair CPF/CNPJ da coluna F (gera coluna J)
4) Criar coluna Tipo (CPF ou CNPJ)
5) Remover linhas sem CPF/CNPJ
6) Excluir colunas B, D, E, H e I (todas de uma vez)
7) Salvar resultado na mesma pasta
-------------------------------------
Requisitos: pip install pandas openpyxl
"""

import re
import os
import time
import pandas as pd
from tkinter import Tk, filedialog
from datetime import datetime

# ======================
# Funções utilitárias
# ======================
def ts():
    return datetime.now().strftime("[%H:%M:%S]")

def log(n, desc):
    print(f"{ts()} ▶ Etapa {n} - {desc}")

def ok(n, t0, extra=""):
    dur = time.time() - t0
    print(f"{ts()} ✓ Etapa {n} concluída (tempo: {dur:.2f}s){' | ' + extra if extra else ''}\n")

def extrair_digitos(texto):
    """Extrai apenas dígitos (CPF 11 / CNPJ 14)."""
    if pd.isna(texto):
        return None
    s = re.sub(r"\D", "", str(texto))
    if len(s) in (11, 14):
        return s
    return None

def tipo_doc(valor):
    """Identifica se é CPF ou CNPJ."""
    if pd.isna(valor) or not str(valor).strip():
        return None
    s = re.sub(r"\D", "", str(valor))
    if len(s) == 11:
        return "CPF"
    elif len(s) == 14:
        return "CNPJ"
    return None

# ======================
# Pipeline principal
# ======================
def main():
    # 1) Selecionar arquivo
    log(1, "Selecionar o arquivo Excel (.xlsx)")
    Tk().withdraw()
    file_path = filedialog.askopenfilename(
        title="Selecione o arquivo Excel",
        filetypes=[("Arquivos Excel", "*.xlsx *.xlsm *.xltx *.xltm")]
    )
    if not file_path:
        print("Nenhum arquivo selecionado.")
        return
    print(f"📂 Arquivo selecionado: {file_path}\n")

    # 2) Ler planilha como texto
    t0 = time.time()
    log(2, "Ler planilha (mantendo zeros à esquerda)")
    df = pd.read_excel(file_path, dtype=str)
    df = df.fillna("")
    ok(2, t0, f"linhas={len(df):,} colunas={len(df.columns)}")

    # 3) Extrair CPF/CNPJ da coluna F (coluna índice 5 → 6ª)
    t0 = time.time()
    log(3, "Extrair CPF/CNPJ da coluna F (gerar coluna J)")
    if df.shape[1] < 6:
        print("⚠️ O arquivo não possui coluna F (mínimo 6 colunas).")
        return
    col_F = df.columns[5]
    df["CPF_CNPJ"] = df[col_F].apply(extrair_digitos)
    ok(3, t0)

    # 4) Criar coluna Tipo (CPF ou CNPJ)
    t0 = time.time()
    log(4, "Criar coluna Tipo (CPF ou CNPJ)")
    df["Tipo"] = df["CPF_CNPJ"].apply(tipo_doc)
    ok(4, t0)

    # 5) Remover linhas sem CPF/CNPJ
    t0 = time.time()
    log(5, "Remover linhas sem CPF/CNPJ (a partir de J2)")
    antes = len(df)
    df = df[df["CPF_CNPJ"].notna() & (df["CPF_CNPJ"] != "")]
    ok(5, t0, f"linhas removidas={antes - len(df)} restantes={len(df)}")

    # 6) Excluir colunas B, D, E, H e I (todas de uma vez)
    t0 = time.time()
    log(6, "Excluir colunas B, D, E, H e I (execução simultânea)")
    letras_excluir = ["B", "D", "E", "H", "I"]
    # converte letras para índices numéricos (A=0, B=1, ...)
    indices = [ord(l) - 65 for l in letras_excluir if ord(l) - 65 < len(df.columns)]
    # pega nomes das colunas correspondentes aos índices
    cols_excluir = [df.columns[i] for i in indices if i < len(df.columns)]
    # exclui todas de uma vez
    df.drop(columns=cols_excluir, inplace=True, errors="ignore")
    ok(6, t0, f"colunas removidas={len(cols_excluir)} colunas finais={len(df.columns)}")

    # 7) Salvar resultado
    t0 = time.time()
    log(7, "Salvar resultado final na mesma pasta (_FILTRADO_TIPO.xlsx)")
    pasta = os.path.dirname(file_path)
    base = os.path.splitext(os.path.basename(file_path))[0]
    novo_arquivo = os.path.join(pasta, f"{base}_FILTRADO_TIPO.xlsx")
    df.to_excel(novo_arquivo, index=False, sheet_name="Resultado", engine="openpyxl")
    ok(7, t0, f"arquivo={os.path.basename(novo_arquivo)}")

    print(f"{ts()} ✅ Processo concluído com sucesso!")
    print(f"{ts()} 📁 Arquivo salvo em: {novo_arquivo}")
    print(f"{ts()} 🧾 Linhas finais: {len(df):,}\n")

# ======================
# Execução direta
# ======================
if __name__ == "__main__":
    main()
