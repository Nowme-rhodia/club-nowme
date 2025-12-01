@echo off
start "Vite dev" cmd /k "npm run dev"
start "ngrok" cmd /k "ngrok.exe http http://localhost:5173"
