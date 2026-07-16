@echo off
setlocal
set "OLIO_ROOT=%~dp0"
set "OLIO_SCRIPT=%~dp0OlioLauncher.ahk"
set "OLIO_COMPILED=%~dp0OlioLauncher.exe"
set "OLIO_AHK=C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe"

if not exist "%OLIO_SCRIPT%" (
  echo OlioLauncher.ahk was not found beside this file.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$script=[IO.Path]::GetFullPath($env:OLIO_SCRIPT); $compiled=[IO.Path]::GetFullPath($env:OLIO_COMPILED); $comparison=[StringComparison]::OrdinalIgnoreCase; $targets=Get-CimInstance Win32_Process | Where-Object { $sourceProcess=$_.Name -match '^AutoHotkey(32|64)?\.exe$' -and $_.CommandLine -and $_.CommandLine.IndexOf($script,$comparison) -ge 0; $compiledProcess=$_.Name -ieq 'OlioLauncher.exe' -and $_.ExecutablePath -and [IO.Path]::GetFullPath($_.ExecutablePath).Equals($compiled,$comparison); $sourceProcess -or $compiledProcess }; $ids=@($targets | ForEach-Object { $_.ProcessId }); $targets | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop }; if ($ids.Count) { $deadline=[DateTime]::UtcNow.AddSeconds(5); do { Start-Sleep -Milliseconds 100; $alive=@($ids | Where-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue }) } while ($alive.Count -and [DateTime]::UtcNow -lt $deadline); if ($alive.Count) { throw 'An existing Olio Launcher process did not close.' } }; if (Test-Path -LiteralPath $env:OLIO_AHK) { Start-Process -FilePath $env:OLIO_AHK -ArgumentList @($script) -WorkingDirectory $env:OLIO_ROOT } elseif (Test-Path -LiteralPath $compiled) { Start-Process -FilePath $compiled -WorkingDirectory $env:OLIO_ROOT } else { throw 'AutoHotkey v2 and OlioLauncher.exe were not found.' }"

if errorlevel 1 (
  echo.
  echo Olio Launcher could not be restarted.
  pause
  exit /b 1
)

echo Olio Launcher restarted.
endlocal
