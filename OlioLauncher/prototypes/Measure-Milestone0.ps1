[CmdletBinding()]
param(
    [int]$ColdStartRuns = 10,
    [int]$IdleSeconds = 15,
    [string]$AutoHotkeyPath = "$env:ProgramFiles\AutoHotkey\v2\AutoHotkey64.exe"
)

$ErrorActionPreference = 'Stop'
$probe = Join-Path $PSScriptRoot 'Milestone0Probe.ahk'
$quotedProbe = '"{0}"' -f $probe
$resultDir = Join-Path $PSScriptRoot 'results'
$resultFile = Join-Path $resultDir 'process-baseline.tsv'

if (-not (Test-Path -LiteralPath $AutoHotkeyPath)) {
    throw "AutoHotkey v2 was not found at: $AutoHotkeyPath"
}

$existingProbe = Get-CimInstance Win32_Process -Filter "Name = 'AutoHotkey64.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine.Contains('Milestone0Probe.ahk') }
if ($existingProbe) {
    throw "Another Milestone 0 probe is already open. Press Ctrl+Alt+Q to close it, then run this measurement again."
}

New-Item -ItemType Directory -Path $resultDir -Force | Out-Null
Write-Host "Starting the silent Milestone 0 measurement. No panel should appear."
Write-Host "Testing $ColdStartRuns cold starts..."

# Start-to-exit includes AutoHotkey startup, script parse, native GUI construction,
# active-monitor geometry, and clean shutdown. The cold-start mode never shows a window;
# visible panel latency is measured separately by the interactive benchmark mode.
$coldSamples = foreach ($run in 1..$ColdStartRuns) {
    Write-Progress -Activity 'Measuring cold starts' -Status "Run $run of $ColdStartRuns" -PercentComplete (($run / $ColdStartRuns) * 100)
    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    $process = Start-Process -FilePath $AutoHotkeyPath -ArgumentList @('/ErrorStdOut', $quotedProbe, 'cold-start') -PassThru
    $process.WaitForExit()
    $timer.Stop()
    if ($process.ExitCode -ne 0) {
        throw "Benchmark process failed with exit code $($process.ExitCode)."
    }
    $timer.Elapsed.TotalMilliseconds
}
Write-Progress -Activity 'Measuring cold starts' -Completed

# A real resident launcher is hidden while idle. Construct its native GUI and install
# hooks, but do not show a window during CPU and memory sampling.
Write-Host "Sampling the hidden resident process for $IdleSeconds seconds..."
$resident = Start-Process -FilePath $AutoHotkeyPath -ArgumentList @('/ErrorStdOut', $quotedProbe, 'resident') -PassThru
try {
    Start-Sleep -Milliseconds 1000
    $resident.Refresh()
    $cpuStart = $resident.TotalProcessorTime.TotalMilliseconds
    $sampleStart = [System.Diagnostics.Stopwatch]::StartNew()
    Start-Sleep -Seconds $IdleSeconds
    $sampleStart.Stop()
    $resident.Refresh()
    $cpuEnd = $resident.TotalProcessorTime.TotalMilliseconds
    $idleCpuPercent = (($cpuEnd - $cpuStart) / $sampleStart.Elapsed.TotalMilliseconds) * 100
    $workingSet = $resident.WorkingSet64
    $privateBytes = $resident.PrivateMemorySize64
}
finally {
    if (-not $resident.HasExited) {
        $resident.CloseMainWindow() | Out-Null
        if (-not $resident.WaitForExit(1000)) {
            $resident.Kill()
        }
    }
}

$sorted = @($coldSamples | Sort-Object)
$coldMean = ($coldSamples | Measure-Object -Average).Average
$coldP95 = $sorted[[Math]::Min($sorted.Count - 1, [Math]::Ceiling($sorted.Count * 0.95) - 1)]
$timestamp = Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK'
$header = "timestamp`tcomputer`tcold_runs`tcold_proxy_mean_ms`tcold_proxy_p95_ms`tidle_sample_seconds`tidle_cpu_percent`tworking_set_bytes`tprivate_bytes"
$line = "$timestamp`t$env:COMPUTERNAME`t$ColdStartRuns`t$([Math]::Round($coldMean, 3))`t$([Math]::Round($coldP95, 3))`t$IdleSeconds`t$([Math]::Round($idleCpuPercent, 4))`t$workingSet`t$privateBytes"

if (-not (Test-Path -LiteralPath $resultFile)) {
    Set-Content -LiteralPath $resultFile -Value $header -Encoding utf8
}
Add-Content -LiteralPath $resultFile -Value $line -Encoding utf8
Write-Host ""
Write-Host "Measurement complete. No panel should be left open." -ForegroundColor Green
Write-Host "Cold-start mean: $([Math]::Round($coldMean, 3)) ms"
Write-Host "Cold-start p95:  $([Math]::Round($coldP95, 3)) ms"
Write-Host "Idle CPU:        $([Math]::Round($idleCpuPercent, 4))%"
Write-Host "Working set:     $([Math]::Round($workingSet / 1MB, 2)) MB"
Write-Host "Results file:    $resultFile"
