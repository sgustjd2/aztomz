# 디스코드 크론 보고 이모지 감시(discord-reactions.mjs)를 로그온 시 자동 실행하도록 등록한다. 관리자 권한 불필요.
$u = "$env:USERDOMAIN\$env:USERNAME"
$a = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "$PSScriptRoot\discord-reactions.vbs"
$t = New-ScheduledTaskTrigger -AtLogOn -User $u
$s = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$p = New-ScheduledTaskPrincipal -UserId $u -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName AZ2MZ_Discord_Reactions -Action $a -Trigger $t -Settings $s -Principal $p -Force
Start-ScheduledTask -TaskName AZ2MZ_Discord_Reactions
