@echo off
cd /d "%~dp0"
if not exist "dist-electron\main.js" goto build
:run
start /min "" cmd /c "npx vite" 
exit

:build
echo Construyendo por primera vez...
start /min "" cmd /c "npx vite" 
exit
