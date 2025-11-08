# Script para ejecutar el procesamiento en 20 terminales paralelos
# Cada terminal procesa 1000 palabras

$outputDir = "c:\Users\jesus\OneDrive\Documentos\LR\deutch"
$script = "word-fetcher-german.js"

# Crear 20 trabajos, cada uno procesando 1000 palabras
$totalRanges = @()
for ($i = 0; $i -lt 20; $i++) {
    $start = $i * 1000
    $end = ($i + 1) * 1000
    $totalRanges += @{start=$start; end=$end; index=$i}
}

Write-Host "Iniciando 20 procesos de Node.js en paralelo..."
Write-Host "Cada proceso procesa 1000 palabras"
Write-Host ""

$jobs = @()

foreach ($range in $totalRanges) {
    $start = $range.start
    $end = $range.end
    $index = $range.index
    
    Write-Host "Iniciando Terminal $($index+1)/20: palabras $start-$($end-1)"
    
    $jobName = "process-$start-$end"
    
    # Lanzar el script en PowerShell en background
    $job = Start-Job -ScriptBlock {
        param($dir, $script, $start, $end, $index)
        cd $dir
        & node $script $start $end
        Write-Host "✓ Terminal $($index+1) completada (palabras $start-$($end-1))"
    } -ArgumentList $outputDir, $script, $start, $end, $index -Name $jobName
    
    $jobs += $job
    
    # Pequeño delay entre lanzamientos
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "Esperando a que se completen todos los procesos..."
Write-Host ""

# Esperar a que todos los jobs se completen
$completed = 0
while ($completed -lt $jobs.Count) {
    $completed = ($jobs | Where-Object { $_.State -eq "Completed" } | Measure-Object).Count
    $running = ($jobs | Where-Object { $_.State -eq "Running" } | Measure-Object).Count
    
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Completadas: $completed/20 | En ejecución: $running"
    Start-Sleep -Seconds 5
}

Write-Host ""
Write-Host "Todos los procesos completados!"
Write-Host ""

# Mostrar resultados
foreach ($job in $jobs) {
    $result = Receive-Job -Job $job
    if ($result) {
        Write-Host $result
    }
}

# Limpiar jobs
Get-Job | Remove-Job

Write-Host ""
Write-Host "✓ Procesamiento completado. Verifica el archivo structured-german-words.json"
