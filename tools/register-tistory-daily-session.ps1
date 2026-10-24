$ErrorActionPreference = 'Stop'

$taskName = 'AZ2MZ_Tistory_Daily_Session'
$repo = 'E:\workspace\side_project\aztomz'
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$nextRun = (Get-Date).Date.AddHours(11)
if ($nextRun -le (Get-Date)) { $nextRun = $nextRun.AddDays(1) }
$start = $nextRun.ToString("yyyy-MM-dd'T'HH:mm:ssK")
$xml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.3" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>한끗: 매일 11:00 티스토리 세션 사전 확인. 저장 자동완성으로 1회 로그인 시도 후 추가 인증은 사용자에게 넘깁니다.</Description><URI>\AZ2MZ_Tistory_Daily_Session</URI></RegistrationInfo>
  <Principals><Principal id="Author"><UserId>$sid</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><RunOnlyIfIdle>false</RunOnlyIfIdle><ExecutionTimeLimit>PT2H</ExecutionTimeLimit><StartWhenAvailable>true</StartWhenAvailable><Enabled>true</Enabled></Settings>
  <Triggers><CalendarTrigger><StartBoundary>$start</StartBoundary><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay></CalendarTrigger></Triggers>
  <Actions Context="Author"><Exec><Command>wscript.exe</Command><Arguments>"$repo\tools\tistory-daily-session.vbs"</Arguments><WorkingDirectory>$repo</WorkingDirectory></Exec></Actions>
</Task>
"@

Register-ScheduledTask -TaskName $taskName -Xml $xml -Force | Out-Null

Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State
