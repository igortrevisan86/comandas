@echo off
chcp 65001 >nul
title ComandaPRO - Interface Web (Porta 3000)
cd /d "%~dp0frontend"
set PATH=C:\Program Files\nodejs;%PATH%

echo =======================================================
echo          ComandaPRO - Interface Web (PDV)
echo =======================================================
echo Servidor frontend rodando em: http://localhost:3000
echo.

npm.cmd run dev

if errorlevel 1 (
    echo.
    echo [ERRO] O servidor frontend encerrou com falha.
    pause
)
