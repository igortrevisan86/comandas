@echo off
chcp 65001 >nul
title Sistema de Comandas para Restaurante - Parada Segura

echo =====================================================================
echo           SISTEMA DE COMANDAS PARA RESTAURANTE - PARADA SEGURA
echo =====================================================================
echo.
echo [INFO] Parando os servicos do sistema...
echo [IMPORTANTE] Seus dados, comandas, produtos e historicos permanecem salvos!
echo.

rem 1. Parar containers Docker se existirem
where docker >nul 2>&1
if %errorlevel% equ 0 (
    docker compose stop >nul 2>&1
)

rem 2. Parar processos locais nas portas 8000 e 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo.
echo =====================================================================
echo [SUCESSO] Servicos finalizados com seguranca!
echo Todos os dados permanecem salvos intactos.
echo Para iniciar novamente, execute: iniciar.bat ou iniciar_local.bat
echo =====================================================================
echo.
pause
