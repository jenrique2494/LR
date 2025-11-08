# Script para ejecutar word-fetcher-german.js en 20 terminales paralelas
# Cada terminal procesa 1,000 palabras (de mil en mil)

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeScript = Join-Path $scriptPath "word-fetcher-german.js"

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "Iniciando procesamiento paralelo de palabras alemanas" -ForegroundColor Cyan
Write-Host "20 terminales x 1,000 palabras = 20,000 palabras totales" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# Array de rangos (20 rangos de 1,000 palabras cada uno)
$ranges = @(
    @(0, 1000),
    @(1000, 2000),
    @(2000, 3000),
    @(3000, 4000),
    @(4000, 5000),
    @(5000, 6000),
    @(6000, 7000),
    @(7000, 8000),
    @(8000, 9000),
    @(9000, 10000),
    @(10000, 11000),
    @(11000, 12000),
    @(12000, 13000),
    @(13000, 14000),
    @(14000, 15000),
    @(15000, 16000),
    @(16000, 17000),
    @(17000, 18000),
    @(18000, 19000),
    @(19000, 20000)
)

# Lanzar cada rango en una nueva terminal
for ($i = 0; $i -lt $ranges.Count; $i++) {
    $start = $ranges[$i][0]
    $end = $ranges[$i][1]
    $rangeNum = $i + 1
    
    Write-Host "Iniciando Terminal $rangeNum (palabras $start-$($end-1))..." -ForegroundColor Green
    
    # Crear comando a ejecutar
    $cmdText = "cd '$scriptPath'; node '$nodeScript' $start $end; Read-Host 'Presiona Enter para cerrar'"
    
    # Ejecutar en una nueva ventana de PowerShell
    Start-Process powershell.exe -ArgumentList "-NoExit -Command `"$cmdText`""
    
    # Pequeño delay entre lanzamientos
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "Todas las 20 terminales han sido iniciadas" -ForegroundColor Cyan
Write-Host "Cada terminal procesara su rango de 1,000 palabras" -ForegroundColor Cyan
Write-Host "Los archivos se guardaran como:" -ForegroundColor Cyan
Write-Host "  structured-german-words_1.json" -ForegroundColor Yellow
Write-Host "  structured-german-words_2.json" -ForegroundColor Yellow
Write-Host "  ... hasta ..." -ForegroundColor Yellow
Write-Host "  structured-german-words_20.json" -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Cyan

