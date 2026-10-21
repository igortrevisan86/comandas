@echo off
chcp 65001 >nul
title ComandaPRO - Enviar para o GitHub

echo =====================================================================
echo           ENVIANDO PROJETO PARA O GITHUB
echo =====================================================================
echo.
echo Repositorio Remoto:
echo   https://github.com/igortrevisan86/comandas.git
echo.
echo [INFO] O Git realizara o envio da branch 'main'.
echo Caso seja solicitado, uma janela do navegador abrira para voce
echo confirmar o login na sua conta do GitHub (igortrevisan86).
echo.

set PATH=C:\Users\Cmopr\.gemini\git\cmd;%PATH%

git push -u origin main

if errorlevel 1 (
    echo.
    echo =====================================================================
    echo [AVISO] Ocorreu uma pendencia na autenticacao do GitHub.
    echo Se preferir usar um Token de Acesso Pessoal (PAT), execute:
    echo   git push https://SEU_TOKEN@github.com/igortrevisan86/comandas.git main
    echo =====================================================================
) else (
    echo.
    echo =====================================================================
    echo [SUCESSO] Todo o projeto foi enviado com sucesso para o GitHub!
    echo Acesse: https://github.com/igortrevisan86/comandas
    echo =====================================================================
)

echo.
pause
