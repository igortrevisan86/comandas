@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Sistema de Comandas para Restaurante - Backup do Banco

echo =====================================================================
echo           BACKUP DO BANCO DE DADOS (COMANDAS & VENDAS)
echo =====================================================================
echo.

if not exist "backups" mkdir backups

rem Obter timestamp no formato YYYYMMDD_HHMMSS
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set datetime=%%I
if "!datetime!"=="" set datetime=%date:~6,4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set TIMESTAMP=!TIMESTAMP: =0!

rem Verificar se o Docker Postgres esta rodando
set DOCKER_RUNNING=0
where docker >nul 2>&1
if %errorlevel% equ 0 (
    docker compose ps db 2>nul | findstr "Up" >nul 2>&1
    if %errorlevel% equ 0 set DOCKER_RUNNING=1
)

if "!DOCKER_RUNNING!"=="1" (
    set BACKUP_FILE=backups\backup_postgres_!TIMESTAMP!.sql
    echo [INFO] Gerando backup PostgreSQL via Docker: !BACKUP_FILE! ...
    docker compose exec -T db pg_dump -U comandas_admin -d comandas_db --clean --if-exists --format=plain > "!BACKUP_FILE!"
    if %errorlevel% equ 0 (
        echo [SUCESSO] Backup PostgreSQL gerado com sucesso!
        echo Arquivo: !BACKUP_FILE!
    ) else (
        echo [ERRO] Falha ao gerar o backup PostgreSQL.
    )
) else (
    if exist "comandas.db" (
        set BACKUP_FILE=backups\backup_sqlite_!TIMESTAMP!.db
        echo [INFO] Gerando copia de seguranca da base local: !BACKUP_FILE! ...
        copy /y "comandas.db" "!BACKUP_FILE!" >nul
        if %errorlevel% equ 0 (
            echo [SUCESSO] Backup do banco de dados local gerado com sucesso!
            echo Arquivo: !BACKUP_FILE!
        ) else (
            echo [ERRO] Falha ao copiar o arquivo comandas.db.
        )
    ) else (
        echo [AVISO] Nenhuma base de dados encontrada para backup.
    )
)

echo.
echo =====================================================================
echo RECOMENDACAO: Copie os arquivos da pasta 'backups' regularmente para
echo um pendrive ou armazenamento em nuvem para seguranca de seus registros.
echo =====================================================================
echo.
pause
