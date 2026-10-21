@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Sistema de Comandas para Restaurante - Restauracao de Backup

echo =====================================================================
echo         RESTAURACAO DO BANCO DE DADOS (COMANDAS & VENDAS)
echo =====================================================================
echo.
echo [ATENCAO] A restauracao ira substituir os dados atuais pelos dados
echo contidos no arquivo de backup escolhido.
echo.

set BACKUP_INPUT=%1

if "%BACKUP_INPUT%"=="" (
    echo Backups disponiveis na pasta 'backups':
    echo ---------------------------------------------------------------------
    dir /b /o-d backups\*.* 2>nul
    echo ---------------------------------------------------------------------
    echo.
    set /p BACKUP_INPUT="Digite o nome do arquivo a restaurar: "
)

if exist "backups\%BACKUP_INPUT%" set BACKUP_INPUT=backups\%BACKUP_INPUT%

if not exist "%BACKUP_INPUT%" (
    echo.
    echo [ERRO] Arquivo nao encontrado: %BACKUP_INPUT%
    pause
    exit /b 1
)

echo.
echo Arquivo selecionado: %BACKUP_INPUT%
set /p CONFIRM="Deseja realmente prosseguir com a restauracao? (S/N): "
if /i not "%CONFIRM%"=="S" (
    echo [INFO] Operacao cancelada.
    pause
    exit /b 0
)

echo.
rem Restaurar com base na extensao (.sql ou .db)
if /i "%BACKUP_INPUT:~-3%"==".db" (
    echo [INFO] Restaurando base local SQLite (comandas.db)...
    copy /y "%BACKUP_INPUT%" "comandas.db" >nul
    if %errorlevel% equ 0 (
        echo [SUCESSO] Base local comandas.db restaurada com sucesso!
    ) else (
        echo [ERRO] Falha ao substituir o arquivo comandas.db.
    )
) else (
    echo [INFO] Restaurando base PostgreSQL no Docker...
    type "%BACKUP_INPUT%" | docker compose exec -T db psql -U comandas_admin -d comandas_db
    if %errorlevel% equ 0 (
        echo [SUCESSO] Banco de dados PostgreSQL restaurado com sucesso!
    ) else (
        echo [ERRO] Falha ao restaurar banco no Docker.
    )
)

echo.
pause
