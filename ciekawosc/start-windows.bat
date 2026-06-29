@echo off
title CIEKAWOSC Dashboard
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js nie jest zainstalowany.
  echo  Pobierz go z: https://nodejs.org  ^(wersja LTS^), zainstaluj i uruchom ten plik ponownie.
  echo.
  pause
  exit /b 1
)
echo Uruchamiam serwer CIEKAWOSC... przegladarka otworzy sie sama.
node server.js
pause
