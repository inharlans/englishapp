@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
node "%SCRIPT_DIR%start-monet-mcp.mjs"

if errorlevel 1 (
  exit /b 1
)

exit /b 0
