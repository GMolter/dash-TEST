param(
    [ValidateRange(3, 60)]
    [int]$IdleSeconds = 10
)

$ErrorActionPreference = 'Stop'
$ahk = Join-Path $env:ProgramFiles 'AutoHotkey\v2\AutoHotkey64.exe'
$launcher = Join-Path (Split-Path $PSScriptRoot -Parent) 'OlioLauncher.ahk'

if (-not (Test-Path -LiteralPath $ahk)) {
    throw 'AutoHotkey v2 was not found.'
}

$existing = Get-CimInstance Win32_Process -Filter "Name = 'AutoHotkey64.exe'" |
    Where-Object { $_.CommandLine -like '*OlioLauncher.ahk*' }
if ($existing) {
    throw 'Stop the existing Olio Launcher process before measuring.'
}

if (-not ('NativeGuiResources' -as [type])) {
    Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class NativeGuiResources {
    [DllImport("user32.dll")]
    public static extern uint GetGuiResources(IntPtr process, uint flags);
}
'@
}

$process = $null
try {
    $process = Start-Process -FilePath $ahk -ArgumentList @(
        '/ErrorStdOut', $launcher, '--background'
    ) -PassThru
    Start-Sleep -Seconds 2
    $process.Refresh()
    if ($process.HasExited) {
        throw "Olio Launcher exited during startup with code $($process.ExitCode)."
    }

    $cpuStart = $process.TotalProcessorTime.TotalSeconds
    Start-Sleep -Seconds $IdleSeconds
    $process.Refresh()
    $cpuEnd = $process.TotalProcessorTime.TotalSeconds
    $cpuPercent = (($cpuEnd - $cpuStart) / $IdleSeconds /
        [Environment]::ProcessorCount) * 100
    $handle = $process.Handle

    [pscustomobject]@{
        idle_seconds = $IdleSeconds
        idle_cpu_percent = [math]::Round($cpuPercent, 4)
        working_set_bytes = $process.WorkingSet64
        private_bytes = $process.PrivateMemorySize64
        handle_count = $process.HandleCount
        gdi_objects = [NativeGuiResources]::GetGuiResources($handle, 0)
        user_objects = [NativeGuiResources]::GetGuiResources($handle, 1)
        helper_processes = 0
    } | ConvertTo-Json -Compress
}
finally {
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force
        $process.WaitForExit()
    }
}
