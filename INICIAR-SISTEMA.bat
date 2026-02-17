@echo off
title SIGEF Caruaru - Sistema Local
color 0A

echo.
echo ========================================================
echo      SIGEF CARUARU - Sistema de Gestao Financeira
echo           Prefeitura Municipal de Caruaru
echo ========================================================
echo.
echo Iniciando servidor HTTP local...
echo.
echo O sistema sera aberto em: http://localhost:8080
echo Para FECHAR o sistema, pressione Ctrl+C nesta janela
echo.

REM Verifica Python
echo Verificando Python...
python --version 2>nul
if %errorlevel%==0 (
    echo Python detectado! Iniciando servidor...
    echo.
    echo Aguarde 3 segundos...
    timeout /t 3 /nobreak >nul

    echo Abrindo navegador...
    start http://localhost:8080/index.html

    echo Iniciando servidor na porta 8080...
    echo.
    echo ========================================================
    echo    SERVIDOR ATIVO - NAO FECHE ESTA JANELA!
    echo ========================================================
    echo.

    cd /d "%~dp0"
    python -m http.server 8080
    goto :end
) else (
    echo Python NAO detectado!
    echo.
)

REM Verifica Node.js
echo Verificando Node.js...
node --version 2>nul
if %errorlevel%==0 (
    echo Node.js detectado! Iniciando servidor...
    echo.
    echo Aguarde 3 segundos...
    timeout /t 3 /nobreak >nul

    echo Abrindo navegador...
    start http://localhost:8080/index.html

    echo Iniciando servidor na porta 8080...
    echo.
    echo ========================================================
    echo    SERVIDOR ATIVO - NAO FECHE ESTA JANELA!
    echo ========================================================
    echo.

    cd /d "%~dp0"
    call npx http-server -p 8080
    goto :end
) else (
    echo Node.js NAO detectado!
    echo.
)

REM Nenhum encontrado
echo.
echo ========================================================
echo     ERRO: Python ou Node.js nao encontrado!
echo ========================================================
echo.
echo Voce precisa instalar uma das opcoes:
echo.
echo    1. Python (Recomendado)
echo       https://www.python.org/downloads/
echo       IMPORTANTE: Marque "Add Python to PATH" na instalacao!
echo.
echo    2. Node.js
echo       https://nodejs.org/
echo.
echo Apos instalar, REINICIE o computador e tente novamente.
echo.
pause

:end
