@echo off
REM 实时开发服务器：带热更新（HMR）。改完源码后浏览器自动刷新，无需重新构建。
REM 双击本文件即可（不依赖 npm）。结束时在此窗口按 Ctrl+C 关闭。
cd /d "%~dp0"
node scripts/launch.mjs dev
pause
