@echo off
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo [提示] 正在请求管理员权限以放行 8080 端口...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%CD%"
    CD /D "%~dp0"

echo ========================================================
echo   正在为游戏联机服务器放行 Windows 防火墙 (端口 8080)...
echo ========================================================

netsh advfirewall firewall delete rule name="2D_Shooter_Port_8080" >nul 2>&1
netsh advfirewall firewall add rule name="2D_Shooter_Port_8080" dir=in action=allow protocol=TCP localport=8080 >nul 2>&1

if %errorlevel% EQU 0 (
    echo.
    echo  [成功] 防火墙已成功放行 8080 端口！
    echo  同一 WiFi 下的朋友现在可以正常访问 http://192.168.1.116:8080 了。
    echo.
) else (
    echo.
    echo  [失败] 添加防火墙规则失败，请手动以管理员身份运行。
    echo.
)

pause
