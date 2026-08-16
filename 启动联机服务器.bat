@echo off
REM 一键启动权威多人联机服务器并自动打开浏览器
REM 随时可双击运行
cd /d "%~dp0"
node scripts/start-server.mjs
pause
