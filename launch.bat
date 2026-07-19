@echo off
REM 一键启动器：重新构建 dist 并用浏览器打开最新游戏。
REM 双击本文件即可（不依赖 npm，避免 PowerShell 执行策略拦截）。
cd /d "%~dp0"
node scripts/launch.mjs
pause
