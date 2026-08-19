@echo off
title Upload Update ke GitHub & Render
echo ===================================================
echo   DH TRANS TRAVEL - PUSH UPDATE KE GITHUB & RENDER
echo ===================================================
echo.
echo Sedang menyimpan semua perubahan terbaru...
git add .
git commit -m "update: fitur pembayaran, gps tracking, dan tabel jadwal"
echo.
echo Sedang mengunggah (push) ke GitHub...
git push origin main
echo.
echo ===================================================
echo SUKSES! Kode terbaru sudah terkirim ke GitHub.
echo.
echo Sekarang buka Render di browser Anda, lalu klik:
echo   [Manual Deploy] -> [Deploy latest commit]
echo ===================================================
pause
