param([int]$Port=1313)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$portable=Join-Path (Split-Path -Parent $projectRoot) '.tools\hugo-0.169.0\hugo.exe'
$hugoCommand=if(Test-Path -LiteralPath $portable){$portable}else{(Get-Command hugo -ErrorAction Stop).Source}
& $hugoCommand server --source $projectRoot --bind 127.0.0.1 --port $Port --baseURL "http://127.0.0.1:$Port/" --disableFastRender
exit $LASTEXITCODE
