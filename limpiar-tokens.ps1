# Script para limpiar tokens bloqueados de WhatsApp Bot
# Ejecuta este script si tienes errores de permisos (EPERM)
# NOTA: Este script NO cierra tus ventanas de Chrome abiertas

Write-Host "Limpiando tokens bloqueados..." -ForegroundColor Yellow
Write-Host "(No se cerraran tus ventanas de Chrome)" -ForegroundColor Green

# Esperar un momento para que cualquier proceso del bot termine
Start-Sleep -Seconds 2

# Estrategia: Renombrar la carpeta Default en lugar de eliminar (más efectivo)
$tokensBotPath = Join-Path $PSScriptRoot "tokens\essenza-bot"
$tokensDefaultPath = Join-Path $tokensBotPath "Default"

if (Test-Path $tokensDefaultPath) {
    Write-Host ""
    Write-Host "Renombrando carpeta Default (el bot creara una nueva)..." -ForegroundColor Cyan
    
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    $backupPath = Join-Path $tokensBotPath "Default.backup.$timestamp"
    
    $intentos = 0
    $maxIntentos = 5
    $renombrado = $false
    
    while ($intentos -lt $maxIntentos -and -not $renombrado) {
        try {
            # Intentar renombrar la carpeta completa
            Rename-Item -Path $tokensDefaultPath -NewName "Default.backup.$timestamp" -Force -ErrorAction Stop
            Write-Host "Carpeta Default renombrada exitosamente" -ForegroundColor Green
            Write-Host "El bot creara una nueva carpeta Default al iniciar" -ForegroundColor Cyan
            $renombrado = $true
        } catch {
            $intentos++
            if ($intentos -lt $maxIntentos) {
                Write-Host "Intento $intentos fallido. Esperando 1 segundo..." -ForegroundColor Yellow
                Start-Sleep -Seconds 1
            } else {
                Write-Host ""
                Write-Host "No se pudo renombrar la carpeta Default." -ForegroundColor Red
                Write-Host "Posibles causas:" -ForegroundColor Yellow
                Write-Host "  - Hay una instancia del bot ejecutandose" -ForegroundColor Yellow
                Write-Host "  - Chrome esta usando los archivos" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "Solucion:" -ForegroundColor Cyan
                Write-Host "  1. Cierra todas las instancias del bot (Ctrl+C)" -ForegroundColor White
                Write-Host "  2. Espera 5 segundos" -ForegroundColor White
                Write-Host "  3. Ejecuta este script nuevamente" -ForegroundColor White
            }
        }
    }
} else {
    Write-Host ""
    Write-Host "No se encontro carpeta Default (el bot creara una nueva al iniciar)" -ForegroundColor Yellow
}

# Eliminar carpeta .wwebjs_auth si existe
$wwebjsPath = Join-Path $PSScriptRoot ".wwebjs_auth"
if (Test-Path $wwebjsPath) {
    Write-Host ""
    Write-Host "Eliminando carpeta .wwebjs_auth..." -ForegroundColor Cyan
    Remove-Item -Path $wwebjsPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Carpeta .wwebjs_auth eliminada" -ForegroundColor Green
}

Write-Host ""
Write-Host "Limpieza completada. Ahora puedes ejecutar el bot nuevamente." -ForegroundColor Green
Write-Host "Ejecuta: node main.js" -ForegroundColor Cyan

