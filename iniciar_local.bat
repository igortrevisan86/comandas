@echo off
chcp 65001 >nul
title Sistema de Comandas para Restaurante - Modo Local


echo =====================================================================
echo       SISTEMA DE COMANDAS PARA RESTAURANTE - MODO LOCAL NATIVO
echo =====================================================================
echo.

rem Liberar portas 8000 e 3000 se ja estiverem em uso
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

rem Verificar ambiente virtual do backend
if not exist "backend\.venv\Scripts\python.exe" (
    echo [INFO] Configurando ambiente virtual Python...
    python -m venv backend\.venv
    backend\.venv\Scripts\pip.exe install -r backend\requirements.txt
)

rem Inicializar base de dados SQLite
echo [INFO] Verificando e inicializando banco de dados local (comandas.db)...
set DATABASE_URL=sqlite:///../comandas.db
set PYTHONPATH=.
backend\.venv\Scripts\python.exe -c "from app.db.session import SessionLocal; from app.db.init_db import init_db; db=SessionLocal(); init_db(db)" 2>nul

rem Iniciar Backend FastAPI na porta 8000
echo [INFO] Iniciando Backend FastAPI (Porta 8000)...
start "" "%~dp0run_backend.bat"

rem Iniciar Frontend React Vite na porta 3000
echo [INFO] Iniciando Frontend React (Porta 3000)...
start "" "%~dp0run_frontend.bat"

rem Aguardar 3 segundos para inicializacao dos servidores
ping 127.0.0.1 -n 4 >nul

rem Identificar IP da Rede Local
set LOCAL_IP=127.0.0.1
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set LOCAL_IP=%%a
)
set LOCAL_IP=%LOCAL_IP: =%


echo.
echo =====================================================================
echo                 SISTEMA PRONTO PARA UTILIZACAO!
echo =====================================================================
echo  Acesso neste computador:
echo    http://localhost:3000
echo.
echo  Acesso por outros computadores/celulares na Rede Local:
echo    http://%LOCAL_IP%:3000

echo.
echo  Credenciais de Demonstracao Prontas:
echo    Administrador:  admin    /  Admin@Comandas2026!
echo    Operador Caixa: operador /  Operador@2026!
echo.
echo  Para encerrar o sistema com seguranca, execute: parar.bat
echo =====================================================================
echo.

rem Abrir navegador automaticamente
start http://localhost:3000

pause
