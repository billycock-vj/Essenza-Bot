# Liberar sesión del browser para poder reiniciar Essenza Bot
# Ejecutar como Administrador si hay problemas de permisos.
# Uso: .\scripts\liberar-sesion-browser.ps1

$TokensDir = "C:\apps\essenza-bot\tokens\essenza-bot"
$LockFiles = @("SingletonLock", "SingletonCookie", "SingletonSocket")

Write-Host ""
Write-Host "=== Essenza Bot - Liberar sesión del browser ===" -ForegroundColor Cyan
Write-Host ""

# 1. Listar procesos Node
$nodeProcs = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcs) {
    Write-Host "Procesos Node en ejecución:" -ForegroundColor Yellow
    $nodeProcs | ForEach-Object { Write-Host "  PID $($_.Id) - $($_.Path)" }
    Write-Host ""
} else {
    Write-Host "No hay procesos Node en ejecución." -ForegroundColor Green
}

# 2. Listar procesos Chrome/Chromium
$chromeProcs = Get-Process -Name chrome, chromium, msedge -ErrorAction SilentlyContinue
if ($chromeProcs) {
    Write-Host "Procesos Chrome/Chromium en ejecución:" -ForegroundColor Yellow
    $chromeProcs | ForEach-Object { Write-Host "  PID $($_.Id) - $($_.ProcessName)" }
    Write-Host ""
} else {
    Write-Host "No hay procesos Chrome/Chromium visibles." -ForegroundColor Green
}

# 3. Preguntar si cerrar Chrome/Chromium
if ($chromeProcs) {
    $r = Read-Host "¿Cerrar todos los procesos Chrome/Chromium? (s/n)"
    if ($r -eq 's' -or $r -eq 'S') {
        $chromeProcs | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-Host "Procesos Chrome/Chromium cerrados." -ForegroundColor Green
    }
}

# 4. Preguntar si cerrar Node (advierte que puede cerrar otros Node)
if ($nodeProcs) {
    Write-Host ""
    Write-Host "Advertencia: cerrar Node cerrará TODOS los procesos node (incl. otros proyectos)." -ForegroundColor Yellow
    $r = Read-Host "¿Cerrar todos los procesos Node? (s/n)"
    if ($r -eq 's' -or $r -eq 'S') {
        $nodeProcs | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-Host "Procesos Node cerrados." -ForegroundColor Green
    }
}

# 5. Eliminar archivos de bloqueo en la carpeta de tokens
Write-Host ""
if (Test-Path $TokensDir) {
    $removed = 0
    foreach ($name in $LockFiles) {
        $p = Join-Path $TokensDir $name
        if (Test-Path $p) {
            try {
                Remove-Item $p -Force -ErrorAction Stop
                Write-Host "Eliminado: $name" -ForegroundColor Green
                $removed++
            } catch {
                Write-Host "No se pudo eliminar $name : $_" -ForegroundColor Red
            }
        }
    }
    if ($removed -eq 0) {
        Write-Host "No había archivos de bloqueo en $TokensDir" -ForegroundColor Gray
    }
} else {
    Write-Host "Carpeta de tokens no encontrada: $TokensDir" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Listo. Puedes iniciar el bot con: node main.js" -ForegroundColor Cyan
Write-Host ""
