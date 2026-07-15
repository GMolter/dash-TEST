param(
    [ValidateRange(3, 60)]
    [int]$IdleSeconds = 10
)

$ErrorActionPreference = 'Stop'
$ahk = Join-Path $env:ProgramFiles 'AutoHotkey\v2\AutoHotkey64.exe'
$launcherRoot = Split-Path $PSScriptRoot -Parent
$launcher = Join-Path $launcherRoot 'OlioLauncher.ahk'
$instrument = Join-Path $PSScriptRoot 'Milestone3Measure.ahk'
$suffix = "{0}-{1}" -f [Environment]::ProcessId, [Environment]::TickCount
$stdout = Join-Path $env:TEMP "olio-m3-measure-$suffix.out"
$stderr = Join-Path $env:TEMP "olio-m3-measure-$suffix.err"

if (-not (Test-Path -LiteralPath $ahk)) {
    throw 'AutoHotkey v2 was not found.'
}

$existing = Get-CimInstance Win32_Process -Filter "Name = 'AutoHotkey64.exe'" |
    Where-Object { $_.CommandLine -like '*OlioLauncher.ahk*' -and
        $_.CommandLine -notlike '*--measure-m3*' }
if ($existing) {
    throw 'A normal resident Olio Launcher is running. Measurement stopped without restarting it or clearing its memory-only history.'
}

if (-not ('OlioNativeGuiResources' -as [type])) {
    Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class OlioNativeGuiResources {
    [DllImport("user32.dll")]
    public static extern uint GetGuiResources(IntPtr process, uint flags);
}
'@
}

$resident = $null
try {
    $instrumentStart = @{
        FilePath = $ahk
        ArgumentList = @('/ErrorStdOut', ('"{0}"' -f $instrument))
        WorkingDirectory = $launcherRoot
        RedirectStandardOutput = $stdout
        RedirectStandardError = $stderr
        PassThru = $true
        Wait = $true
    }
    $instrumentProcess = Start-Process @instrumentStart
    $instrumentOutput = ((Get-Content -LiteralPath $stdout) -join "`n").Trim()
    $instrumentError = ((Get-Content -LiteralPath $stderr) -join "`n").Trim()
    if ($instrumentProcess.ExitCode -ne 0) {
        throw "Screenshot instrumentation failed: $instrumentOutput $instrumentError"
    }
    if ($instrumentOutput -notlike 'MILESTONE3_MEASURE*PASS*') {
        throw 'Screenshot instrumentation returned no PASS record.'
    }

    $resident = Start-Process -FilePath $ahk -ArgumentList @(
        '/ErrorStdOut', ('"{0}"' -f $launcher), '--measure-m3'
    ) -WorkingDirectory $launcherRoot -PassThru
    Start-Sleep -Seconds 2
    $resident.Refresh()
    if ($resident.HasExited) {
        throw "The isolated resident launcher exited with code $($resident.ExitCode)."
    }

    $cpuStart = $resident.TotalProcessorTime.TotalSeconds
    Start-Sleep -Seconds $IdleSeconds
    $resident.Refresh()
    $cpuEnd = $resident.TotalProcessorTime.TotalSeconds
    $cpuPercent = (($cpuEnd - $cpuStart) / $IdleSeconds /
        [Environment]::ProcessorCount) * 100
    $children = @(Get-CimInstance Win32_Process |
        Where-Object ParentProcessId -eq $resident.Id)

    [pscustomobject]@{
        idle_seconds = $IdleSeconds
        idle_cpu_percent = [math]::Round($cpuPercent, 4)
        working_set_bytes = $resident.WorkingSet64
        private_bytes = $resident.PrivateMemorySize64
        handle_count = $resident.HandleCount
        gdi_objects = [OlioNativeGuiResources]::GetGuiResources($resident.Handle, 0)
        user_objects = [OlioNativeGuiResources]::GetGuiResources($resident.Handle, 1)
        normal_operation_helper_processes = $children.Count
        screenshot_instrumentation = $instrumentOutput
    } | ConvertTo-Json -Compress
}
finally {
    if ($resident -and -not $resident.HasExited) {
        Stop-Process -Id $resident.Id -Force
        $resident.WaitForExit()
    }
    Remove-Item -LiteralPath $stdout, $stderr -Force -ErrorAction SilentlyContinue
}
