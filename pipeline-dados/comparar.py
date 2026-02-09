# -*- coding: utf-8 -*-
"""
Comparador de planilhas Excel — célula a célula.
Compara o resultado gerado pelo JS com o resultado esperado (Python).

Uso:
  python comparar.py <arquivo_js.xlsx> <arquivo_python.xlsx> [aba_js] [aba_python]

Se as abas não forem informadas, compara a primeira aba de cada arquivo.
"""

import sys
import os
import math
import pandas as pd


def normalizar_valor(v):
    """Normaliza valor para comparação tolerante."""
    if pd.isna(v) or v is None:
        return ""
    s = str(v).strip()
    if s.lower() in ("nan", "none", "null", ""):
        return ""
    return s


def valores_iguais(a, b):
    """Compara dois valores com tolerância (números, datas, espaços)."""
    sa = normalizar_valor(a)
    sb = normalizar_valor(b)

    if sa == sb:
        return True

    # Ambos vazios
    if sa == "" and sb == "":
        return True

    # Comparar como números
    try:
        na = float(sa.replace(",", "."))
        nb = float(sb.replace(",", "."))
        if abs(na - nb) < 0.01:
            return True
    except (ValueError, TypeError):
        pass

    # Comparar lowercase sem espaços extras
    if sa.lower().replace(" ", "") == sb.lower().replace(" ", ""):
        return True

    return False


def comparar_planilhas(path_js, path_python, aba_js=0, aba_python=0):
    """Compara duas planilhas célula a célula."""
    print(f"\n{'='*60}")
    print(f"COMPARANDO PLANILHAS")
    print(f"{'='*60}")
    print(f"JS     : {path_js}")
    print(f"Python : {path_python}")
    print()

    df_js = pd.read_excel(path_js, sheet_name=aba_js, dtype=str, keep_default_na=False)
    df_py = pd.read_excel(path_python, sheet_name=aba_python, dtype=str, keep_default_na=False)

    rows_js, cols_js = df_js.shape
    rows_py, cols_py = df_py.shape

    print(f"JS     : {rows_js:,} linhas x {cols_js} colunas")
    print(f"Python : {rows_py:,} linhas x {cols_py} colunas")
    print()

    # Comparar headers
    diffs_header = []
    max_cols = max(cols_js, cols_py)
    for c in range(max_cols):
        h_js = df_js.columns[c] if c < cols_js else "(ausente)"
        h_py = df_py.columns[c] if c < cols_py else "(ausente)"
        if not valores_iguais(h_js, h_py):
            diffs_header.append((c, h_js, h_py))

    if diffs_header:
        print(f"HEADERS diferentes: {len(diffs_header)}")
        for c, hj, hp in diffs_header[:10]:
            print(f"  Col {c}: JS='{hj}' vs Python='{hp}'")
        print()

    # Comparar dados
    max_rows = max(rows_js, rows_py)
    diffs = []

    for r in range(max_rows):
        for c in range(max_cols):
            v_js = normalizar_valor(df_js.iloc[r, c]) if r < rows_js and c < cols_js else ""
            v_py = normalizar_valor(df_py.iloc[r, c]) if r < rows_py and c < cols_py else ""

            if not valores_iguais(v_js, v_py):
                col_name = df_py.columns[c] if c < cols_py else f"Col{c}"
                diffs.append({
                    "linha": r + 2,  # +2 porque Excel começa em 1 e tem header
                    "coluna": col_name,
                    "col_idx": c,
                    "js": v_js[:60],
                    "python": v_py[:60]
                })

            if len(diffs) >= 200:
                break
        if len(diffs) >= 200:
            break

    # Resultado
    print(f"{'='*60}")
    if len(diffs) == 0 and rows_js == rows_py and cols_js == cols_py:
        print("RESULTADO: IDENTICOS!")
        print(f"Todas as {rows_js:,} linhas x {cols_js} colunas são iguais.")
        print(f"{'='*60}")
        return True
    else:
        print(f"RESULTADO: {len(diffs)} DIFERENCA(S) ENCONTRADA(S)")
        if rows_js != rows_py:
            print(f"  Linhas: JS={rows_js:,} vs Python={rows_py:,} (diff={abs(rows_js-rows_py)})")
        if cols_js != cols_py:
            print(f"  Colunas: JS={cols_js} vs Python={cols_py} (diff={abs(cols_js-cols_py)})")
        print()

        for d in diffs[:30]:
            print(f"  Linha {d['linha']}, Col '{d['coluna']}' [{d['col_idx']}]:")
            print(f"    JS     = '{d['js']}'")
            print(f"    Python = '{d['python']}'")

        if len(diffs) > 30:
            print(f"\n  ... e mais {len(diffs) - 30} diferenças")

        print(f"{'='*60}")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python comparar.py <arquivo_js.xlsx> <arquivo_python.xlsx> [aba_js] [aba_python]")
        print()
        print("Exemplo:")
        print('  python comparar.py "resultado_js.xlsx" "processados/Relacao_de_Credores_Fornecedores (1)_FILTRADO_TIPO.xlsx"')
        sys.exit(1)

    path_js = sys.argv[1]
    path_py = sys.argv[2]
    aba_js = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    aba_py = int(sys.argv[4]) if len(sys.argv) > 4 else 0

    if not os.path.exists(path_js):
        print(f"Arquivo não encontrado: {path_js}")
        sys.exit(1)
    if not os.path.exists(path_py):
        print(f"Arquivo não encontrado: {path_py}")
        sys.exit(1)

    ok = comparar_planilhas(path_js, path_py, aba_js, aba_py)
    sys.exit(0 if ok else 1)
