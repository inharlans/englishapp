@echo off
setlocal

node scripts\ops\start-sentry-mcp.mjs

if errorlevel 1 (
  exit /b 1
)

exit /b 0
