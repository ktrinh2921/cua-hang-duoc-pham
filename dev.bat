@echo off
REM Wrapper gọi dev.ps1 — chạy từ CMD hoặc double-click
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1"
