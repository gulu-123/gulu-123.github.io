param([string]$BaseURL='http://localhost:1313/')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$portable=Join-Path (Split-Path -Parent $projectRoot) '.tools\hugo-0.169.0\hugo.exe'
$hugoCommand=if(Test-Path -LiteralPath $portable){$portable}else{(Get-Command hugo -ErrorAction Stop).Source}
& $hugoCommand --source $projectRoot --destination public --baseURL $BaseURL --minify
exit $LASTEXITCODE
