@echo off
title DH Trans Travel - Server & Online Link
echo ====================================================
echo         🚐 APLIKASI DH TRANS TRAVEL ONLINE 🚐
echo ====================================================
echo.
echo [1/2] Menjalankan Server Lokal (http://localhost:3000)...
start "" cmd /k "npm run dev"
echo.
echo [2/2] Mengaktifkan Link HP (Localtunnel)...
echo.
echo ----------------------------------------------------
echo LINK HP KAMU: https://dhtrans-travel.loca.lt
echo PASSWORD MASUK PERTAMA: 158.140.171.30
echo ----------------------------------------------------
echo.
echo PENTING: Jangan tutup jendela hitam ini selama website digunakan!
echo.
npx localtunnel --port 3000 --subdomain dhtrans-travel
pause
