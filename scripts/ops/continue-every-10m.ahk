#Requires AutoHotkey v2.0
#SingleInstance Force

; 4 minutes
intervalMs := 4 * 60 * 1000
logPath := "C:\\dev\\englishapp\\macro-loop.log"

targetHwnd := 0

running := true

WriteLog(msg) {
    global logPath
    ts := FormatTime(A_Now, "yyyy-MM-dd HH:mm:ss")
    FileAppend("[" ts "] " msg "`n", logPath, "UTF-8")
}

IsTerminalProcess(procName) {
    return (
        procName = "WindowsTerminal.exe" ||
        procName = "cmd.exe" ||
        procName = "powershell.exe" ||
        procName = "pwsh.exe" ||
        procName = "Code.exe" ||
        procName = "Cursor.exe"
    )
}

BindTargetWindow() {
    global targetHwnd

    hwnd := WinExist("A")
    if !hwnd
        return false

    proc := ""
    title := ""
    try proc := WinGetProcessName("ahk_id " hwnd)
    try title := WinGetTitle("ahk_id " hwnd)

    if !IsTerminalProcess(proc) {
        WriteLog("bind skipped: active window is not terminal | " title " | " proc)
        return false
    }

    targetHwnd := hwnd
    WriteLog("target bound: " title " | " proc)
    return true
}

SendContinue() {
    global running, targetHwnd

    if !running {
        WriteLog("skip: paused")
        return
    }

    ; Fixed-target mode: never auto-rebind from active window.
    ; Rebind is only allowed manually via F7.
    if !targetHwnd {
        WriteLog("skip: target not set (focus target terminal and press F7 once)")
        return
    }

    if !WinExist("ahk_id " targetHwnd) {
        WriteLog("skip: target window no longer exists (press F7 to rebind)")
        return
    }

    WinActivate("ahk_id " targetHwnd)
    if !WinWaitActive("ahk_id " targetHwnd, , 2) {
        WriteLog("skip: could not activate target window")
        return
    }
    Sleep 200

    ; "계속해" via Unicode code points to avoid encoding issues.
    SendText(Chr(0xACC4) Chr(0xC18D) Chr(0xD574))
    ; Requested behavior: type "계속해" and press Tab only.
    Send("{Tab}")

    try {
        title := WinGetTitle("ahk_id " targetHwnd)
        WriteLog("sent: 계속해 + Tab | target=" title)
    } catch {
        WriteLog("sent: 계속해 + Tab | target=<unknown>")
    }
}

WriteLog("macro started")
WriteLog("interval(ms): " intervalMs)
WriteLog("startup: fixed-target mode (focus target terminal and press F7)")
SetTimer(SendContinue, intervalMs)
SendContinue() ; run once immediately

; F6: send now
F6::{
    SendContinue()
    ToolTip("Sent now")
    SetTimer(() => ToolTip(), -800)
}

; F7: rebind target window to currently active window
F7::{
    if !BindTargetWindow() {
        WriteLog("target rebound failed")
        ToolTip("터미널 창을 활성화한 뒤 F7")
        SetTimer(() => ToolTip(), -1200)
        return
    }
    ToolTip("Target window rebound")
    SetTimer(() => ToolTip(), -800)
}

; F8: pause/resume
F8::{
    global running
    running := !running
    WriteLog(running ? "resumed" : "paused")
    ToolTip(running ? "Macro resumed" : "Macro paused")
    SetTimer(() => ToolTip(), -800)
}

; F9: exit
F9::{
    WriteLog("macro stopped")
    ExitApp
}


