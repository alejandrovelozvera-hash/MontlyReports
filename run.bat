@echo off
cd /d "%~dp0"
echo Compilando... espera 2-5 minutos
call npm run build:win
if errorlevel 1 (
  echo Error al compilar. Revisa el CMD.
  pause
  exit
)
start "" wscript.exe "Design Reports.launcher.vbs"
exit