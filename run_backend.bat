@echo off
chcp 65001 >nul
title ComandaPRO - Servidor Backend (Porta 8000)
cd /d "%~dp0backend"
set DATABASE_URL=sqlite:///../comandas.db
set PYTHONPATH=.

echo =======================================================
echo          ComandaPRO - Servidor Backend (API)
echo =======================================================
echo Servidor rodando em: http://localhost:8000
echo.

.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000

if errorlevel 1 (
    echo.
    echo [ERRO] O servidor backend encerrou com falha.
    pause
)
