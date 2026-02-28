@echo off
setlocal

node scripts\ops\start-context7-mcp.mjs

if errorlevel 1 (
  exit /b 1
)

exit /b 0
