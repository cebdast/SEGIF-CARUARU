# -*- coding: utf-8 -*-
"""
MAXSPEED — Limpeza do Excel + Geração Retenção_Final_Separada.xlsx
------------------------------------------------------------------
Mantém o MESMO resultado e a MESMA ordem lógica do seu script, porém:
✅ Evita df.apply(axis=1) (muito lento) -> usa buscas vetorizadas por coluna
✅ Não usa openpyxl célula-a-célula para formatar (lento)
✅ Grava _Final.xlsx e Retenção_Final_Separada.xlsx com xlsxwriter (rápido)
✅ Formatação é aplicada DURANTE a gravação (sem reabrir o arquivo)
✅ Usa argumento no CMD se existir (senão abre janela)
✅ NO FINAL apaga o intermediário <base>_Final.xlsx (se o final existir)
"""

import os
import re
import sys
import pandas as pd
from tkinter import Tk, filedialog

INVALID_SHEET_CHARS_PATTERN = r'[:\\/\?\*\[\]]'

# ==========================================================
# Utilitários
# ==========================================================
def nome_aba_seguro(txt):
    if txt is None:
        txt = ""
    nome = str(txt).strip()
    nome = re.sub(INVALID_SHEET_CHARS_PATTERN, "_", nome)
    if nome == "" or nome.lower() == "nan":
        nome = "RETENCAO"
    return nome[:31]

def valor_para_float_sem_erro(v):
    if pd.isna(v):
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().replace("R$", "").replace(" ", "")
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
        try:
            return float(s)
        except:
            return 0.0
    try:
        return float(s)
    except:
        return 0.0

def _normalizar_df_para_busca(df: pd.DataFrame) -> pd.DataFrame:
    """
    Equivalente prático do limpar_texto em massa:
    - troca NBSP por espaço
    - remove \r \n \t
    - strip e lower
    (usado SOMENTE para criar máscaras; não altera o df final)
    """
    out = df.copy()
    for c in out.columns:
        s = out[c].astype(str)
        s = s.str.replace("\xa0", " ", regex=False)
        s = s.str.replace(r"[\r\n\t]+", " ", regex=True)
        s = s.str.strip().str.lower()
        out[c] = s
    return out

def _mask_any_contains(df_norm: pd.DataFrame, termo: str) -> pd.Series:
    """
    Retorna máscara por linha: True se QUALQUER célula da linha contém 'termo'
    (busca por coluna, vetorizada).
    """
    m = pd.Series(False, index=df_norm.index)
    for c in df_norm.columns:
        m = m | df_norm[c].str.contains(termo, regex=False, na=False)
    return m

def _mask_any_contains_any(df_norm: pd.DataFrame, termos: list[str]) -> pd.Series:
    m = pd.Series(False, index=df_norm.index)
    for t in termos:
        m = m | _mask_any_contains(df_norm, t)
    return m

def _linha_vazia_mask(df_norm: pd.DataFrame) -> pd.Series:
    # linha vazia = todas as células vazias depois de strip/lower
    return df_norm.eq("").all(axis=1)

def _converter_num_script_like(col: pd.Series) -> pd.Series:
    """
    Replica a lógica do openpyxl do seu script (sem mexer em datas):
    val_str = str(val).replace(".", ",")
    try: float(val_str.replace(",", "."))
    except: mantém valor original
    """
    def conv(v):
        if v is None:
            return v
        s = str(v).strip()
        if s == "":
            return v
        s2 = s.replace(".", ",")
        try:
            return float(s2.replace(",", "."))
        except:
            return v
    return col.map(conv)

# ==========================================================
# Escrita rápida com xlsxwriter
# ==========================================================
def _write_df_xlsxwriter(writer, sheet_name: str, df: pd.DataFrame,
                         header_fmt, header_filter=True, freeze_header=True,
                         col_width=18, num_cols_1based=None):
    """
    Escreve DataFrame com:
    - Cabeçalho cinza/negrito/centralizado
    - Freeze A2
    - AutoFilter na linha 1
    - Largura 18
    - Formato numérico "#,##0.00" nas colunas informadas (1-based)
    """
    df.to_excel(writer, sheet_name=sheet_name, index=False, header=False, startrow=1)
    ws = writer.sheets[sheet_name]

    # cabeçalho manual (linha 1)
    ws.write_row(0, 0, list(df.columns), header_fmt)

    # freeze e filtro
    if freeze_header:
        ws.freeze_panes(1, 0)
    if header_filter:
        ws.autofilter(0, 0, 0, len(df.columns) - 1)

    # largura
    ws.set_column(0, len(df.columns) - 1, col_width)

    # formato numérico nas colunas específicas (se houver)
    if num_cols_1based:
        for col1 in num_cols_1based:
            idx0 = col1 - 1
            if 0 <= idx0 < len(df.columns):
                ws.set_column(
                    idx0, idx0, col_width,
                    writer.book.add_format({"num_format": "#,##0.00"})
                )

def _write_df_plain(writer, sheet_name: str, df: pd.DataFrame):
    df.to_excel(writer, sheet_name=sheet_name, index=False)

# ==========================================================
# PARTE 2 — Retenção_Final_Separada.xlsx (rápido)
# ==========================================================
def gerar_arquivo_final_unico_xlsxwriter(df_bruta: pd.DataFrame, pasta_final: str):
    if "Retenção" not in df_bruta.columns:
        print("❌ ERRO: coluna 'Retenção' não encontrada.")
        print("Colunas:", list(df_bruta.columns))
        return None
    if "Valor retido" not in df_bruta.columns:
        print("❌ ERRO: coluna 'Valor retido' não encontrada.")
        print("Colunas:", list(df_bruta.columns))
        return None

    df_base = df_bruta.copy()
    df_base["Retenção"] = df_base["Retenção"].astype(str).str.strip()
    df_base.loc[df_base["Retenção"].str.lower().isin(["nan", "none", "null", ""]), "Retenção"] = ""

    df_validas = df_base[df_base["Retenção"] != ""].copy()
    df_vazias  = df_base[df_base["Retenção"] == ""].copy()

    tipos_retencao = sorted(df_validas["Retenção"].unique().tolist())

    resumo_geral = []
    resumo_individuais = []

    for ret_texto in tipos_retencao:
        bloco = df_validas[df_validas["Retenção"] == ret_texto]
        qtd_linhas = len(bloco)
        soma_geral = bloco["Valor retido"].apply(valor_para_float_sem_erro).sum()
        resumo_geral.append({"Retenção": ret_texto, "Qtd Linhas": qtd_linhas, "Soma Geral": soma_geral})

        soma_indiv = bloco["Valor retido"].apply(valor_para_float_sem_erro).sum()
        resumo_individuais.append({"Retenção": ret_texto, "Soma Individuais": soma_indiv})

    df_g = pd.DataFrame(resumo_geral)
    df_i = pd.DataFrame(resumo_individuais)
    df_lista = pd.merge(df_g, df_i, on="Retenção", how="outer").fillna(0.0)

    total_qtd = int(df_g["Qtd Linhas"].sum()) if not df_g.empty else 0
    total_geral_val = float(df_g["Soma Geral"].sum()) if not df_g.empty else 0.0
    total_indiv_val = float(df_i["Soma Individuais"].sum()) if not df_i.empty else 0.0

    df_lista.loc[len(df_lista)] = ["TOTAL GERAL", total_qtd, total_geral_val, total_indiv_val]

    saida_final = os.path.join(pasta_final, "Retenção_Final_Separada.xlsx")

    with pd.ExcelWriter(saida_final, engine="xlsxwriter") as writer:
        book = writer.book

        header_fmt = book.add_format({"bold": True, "bg_color": "#E6E6E6", "align": "center", "valign": "vcenter"})
        num_fmt = book.add_format({"num_format": "#,##0.00"})

        # GERAL
        _write_df_plain(writer, "GERAL", df_validas)

        # TOTAL
        if not df_vazias.empty:
            _write_df_plain(writer, "TOTAL", df_vazias)

        # abas por retenção
        for ret_texto in tipos_retencao:
            nome_aba = nome_aba_seguro(ret_texto)
            bloco = df_validas[df_validas["Retenção"] == ret_texto].copy()
            _write_df_plain(writer, nome_aba, bloco)

        # LISTA (C e D numéricas com formato)
        df_lista_out = df_lista.copy()
        df_lista_out.to_excel(writer, sheet_name="LISTA", index=False)
        ws_lista = writer.sheets["LISTA"]
        ws_lista.set_column(2, 3, 18, num_fmt)  # C e D (0-based: 2 e 3)

        # Planilha Bruta (cabeçalho cinza, freeze, filtro, largura auto)
        df_bruta.to_excel(writer, sheet_name="Planilha Bruta", index=False, header=False, startrow=1)
        ws_pb = writer.sheets["Planilha Bruta"]

        # cabeçalho
        ws_pb.write_row(0, 0, list(df_bruta.columns), header_fmt)
        ws_pb.freeze_panes(1, 0)
        ws_pb.autofilter(0, 0, 0, len(df_bruta.columns) - 1)

        # largura automática (rápida por coluna, sem openpyxl)
        for ci, col_name in enumerate(df_bruta.columns):
            try:
                max_len = int(df_bruta.iloc[:, ci].astype(str).str.len().max())
            except Exception:
                max_len = 0
            w = min(max(max_len, len(str(col_name))) + 4, 60)
            ws_pb.set_column(ci, ci, w)

    print(f"\n📄 Arquivo final salvo em: {saida_final}")
    return saida_final

# ==========================================================
# PARTE 1 — Limpeza e padronização
# ==========================================================
def main():
    # 1) Seleção do arquivo (CMD tem prioridade)
    if len(sys.argv) >= 2 and sys.argv[1].strip():
        src_path = sys.argv[1].strip().strip('"').strip("'")
        if not os.path.isabs(src_path):
            src_path = os.path.abspath(src_path)
    else:
        Tk().withdraw()
        src_path = filedialog.askopenfilename(
            title="Selecione o arquivo Excel (.xlsx)",
            filetypes=[("Arquivos Excel", "*.xlsx")]
        )

    if not src_path:
        raise SystemExit("❌ Nenhum arquivo selecionado.")

    base_dir = os.path.dirname(src_path)
    base_name = os.path.splitext(os.path.basename(src_path))[0]
    final_path = os.path.join(base_dir, f"{base_name}_Final.xlsx")

    if os.path.exists(final_path):
        os.remove(final_path)

    # Cabeçalho novo (12 colunas)
    NOVO_CABECALHO = [
        "Data", "Retenção", "Sequência", "Av.liquidação", "Fonte recursos",
        "Nr emp.", "Credor/Fornecedor", "CNPJ",
        "Valor retido", "Doc. fiscal", "Doc.extra", "Valor"
    ]

    # 2) Ler abas e gravar DIRETO o _Final.xlsx (sem cópia e sem openpyxl pós)
    xls = pd.ExcelFile(src_path, engine="openpyxl")
    abas = xls.sheet_names

    with pd.ExcelWriter(final_path, engine="xlsxwriter") as writer:
        book = writer.book
        header_fmt = book.add_format({"bold": True, "bg_color": "#E6E6E6", "align": "center", "valign": "vcenter"})

        df_bruta_primeira = None

        for idx_aba, aba in enumerate(abas):
            # leitura rápida (sem NA parsing pesado)
            df = pd.read_excel(
                xls,
                sheet_name=aba,
                header=None,
                dtype=str,
                keep_default_na=False,
                na_filter=False
            )
            df = df.fillna("")

            # Inserir duas colunas em branco
            df[df.shape[1]] = ""
            df[df.shape[1]] = ""

            # Copiar coluna O (índice 14) para última coluna
            if df.shape[1] > 14:
                df[df.shape[1]] = df.iloc[:, 14]

            # Normalizar só para máscaras (não altera df final)
            df_norm = _normalizar_df_para_busca(df)

            # Remover "Total geral" (qualquer célula da linha)
            mask_total = _mask_any_contains(df_norm, "total geral")
            df = df.loc[~mask_total].copy()

            # Excluir colunas F:G, I, K, N:U, X
            letras_excluir = (
                ["F", "G", "I", "K"]
                + [chr(c) for c in range(ord("N"), ord("U") + 1)]
                + ["X"]
            )
            idx_excluir = []
            for x in letras_excluir:
                j = ord(x) - 65
                if 0 <= j < df.shape[1]:
                    idx_excluir.append(j)
            if idx_excluir:
                df.drop(df.columns[idx_excluir], axis=1, inplace=True, errors="ignore")

            # Recalcular normalização depois de excluir colunas (para os próximos filtros)
            df_norm = _normalizar_df_para_busca(df)

            # Excluir linhas com termos específicos (a partir da linha 3)
            termos = ["conta contábil", "valor", "doc. extraorçamentário"]
            if df.shape[0] > 2:
                corpo = df.iloc[2:].copy()
                corpo_norm = df_norm.iloc[2:].copy()
                mask_txt = _mask_any_contains_any(corpo_norm, termos)
                corpo = corpo.loc[~mask_txt]
                df = pd.concat([df.iloc[:2], corpo], axis=0)

            # Excluir linhas efetivamente vazias
            df_norm = _normalizar_df_para_busca(df)
            mask_vazias = _linha_vazia_mask(df_norm)
            df = df.loc[~mask_vazias].copy()

            # Excluir linha 1 (a linha de índice 0 do dataframe atual)
            if df.shape[0] > 1:
                df = df.iloc[1:].copy()

            # Preencher lacunas A,C,E,F,G,J + última coluna
            cols_fill = [ord(c) - 65 for c in ["A", "C", "E", "F", "G", "J"] if (ord(c) - 65) < df.shape[1]]
            last_idx = df.shape[1] - 1
            if last_idx >= 0 and last_idx not in cols_fill:
                cols_fill.append(last_idx)

            for c in cols_fill:
                df.iloc[:, c] = df.iloc[:, c].replace("", pd.NA).ffill().fillna("")

            # Trocar posição da coluna D (índice 3) com a última coluna
            if df.shape[1] > 3:
                cols = list(df.columns)
                last = len(cols) - 1
                cols[3], cols[last] = cols[last], cols[3]
                df = df[cols]

            df = df.reset_index(drop=True)

            # Ajustar para 12 colunas e renomear
            if df.shape[1] > len(NOVO_CABECALHO):
                df = df.iloc[:, :len(NOVO_CABECALHO)].copy()
            while df.shape[1] < len(NOVO_CABECALHO):
                df[df.shape[1]] = ""

            df.columns = NOVO_CABECALHO

            # Converter colunas I e L (9 e 12) -> número (script-like)
            # (sem mexer em datas)
            if "Valor retido" in df.columns:
                df["Valor retido"] = _converter_num_script_like(df["Valor retido"])
            if "Valor" in df.columns:
                df["Valor"] = _converter_num_script_like(df["Valor"])

            # Guardar a primeira aba como df_bruta (para a PARTE 2)
            if idx_aba == 0:
                df_bruta_primeira = df.copy()

            # Gravar aba no _Final.xlsx com formatação pedida
            _write_df_xlsxwriter(
                writer,
                sheet_name=aba[:31],
                df=df,
                header_fmt=header_fmt,
                header_filter=True,
                freeze_header=True,
                col_width=18,
                num_cols_1based=[9, 12]  # I e L
            )

    print(f"✅ Arquivo intermediário gerado:\n{final_path}")

    # PARTE 2 — Montar Retenção_Final_Separada.xlsx
    if df_bruta_primeira is None:
        # fallback (não deveria acontecer)
        df_bruta_primeira = pd.read_excel(final_path)

    saida_final = gerar_arquivo_final_unico_xlsxwriter(df_bruta_primeira, base_dir)

    print("\n🏁 Processo concluído.")
    print(f"📄 Planilha intermediária : {final_path}")
    print(f"📄 Planilha final única   : {saida_final}")

    # ----------------------------------------------------------
    # APAGAR INTERMEDIÁRIO NO FINAL (pedido)
    # Só apaga se o arquivo final existir e foi gerado.
    # ----------------------------------------------------------
    try:
        if saida_final and os.path.exists(saida_final) and os.path.exists(final_path):
            os.remove(final_path)
            print(f"🗑️ Intermediário apagado: {final_path}")
        else:
            print("⚠️ Intermediário NÃO apagado (arquivo final não foi confirmado).")
    except Exception as e:
        print(f"⚠️ Falha ao apagar intermediário: {e}")

if __name__ == "__main__":
    main()
