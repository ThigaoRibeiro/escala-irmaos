<#
.SYNOPSIS
    Gerencia o Supabase LOCAL (Docker) usado nos testes do Estoque.

.DESCRIPTION
    Roda o Supabase local num diretório FORA do repositório (padrão: pasta irmã "_estoque-local-db"),
    para que supabase/config.toml do projeto nunca seja modificado e nenhum comando remoto
    (supabase link / supabase db push) seja executado. Nenhum caminho é fixo: tudo parte da localização
    deste script.

.PARAMETER Action
    start     - Inicializa e sobe o Supabase local com as migrations do repo e aplica o bootstrap.
    stop      - Para os containers.
    status    - Mostra o estado.
    reset     - Recria o banco local (migrations + bootstrap).
    bootstrap - Reaplica só scripts/estoque/local-bootstrap.sql (idempotente).
#>

param(
    [ValidateSet('start', 'stop', 'status', 'reset', 'bootstrap')]
    [string]$Action = 'start',
    [string]$WorkDir = '',
    [string]$DbContainer = 'supabase_db_estoque-local-db'
)

$ErrorActionPreference = 'Stop'

$RepoDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if ([string]::IsNullOrWhiteSpace($WorkDir)) {
    $WorkDir = Join-Path (Split-Path $RepoDir -Parent) '_estoque-local-db'
}

Write-Host "=== Supabase local (Estoque) - acao: $Action ===" -ForegroundColor Cyan
Write-Host "Repo:    $RepoDir"
Write-Host "WorkDir: $WorkDir (fora do repo)"

function Invoke-Bootstrap {
    $bootstrap = Join-Path $RepoDir 'scripts\estoque\local-bootstrap.sql'
    if (-not (Test-Path $bootstrap)) { throw "Bootstrap nao encontrado: $bootstrap" }
    Write-Host "[BOOTSTRAP] $bootstrap" -ForegroundColor Yellow
    Get-Content $bootstrap -Raw | docker exec -i $DbContainer psql -v ON_ERROR_STOP=1 -U postgres -d postgres | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao aplicar o bootstrap.' }
    Write-Host '[OK] Bootstrap aplicado.' -ForegroundColor Green
}

if (-not (Test-Path $WorkDir)) { New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null }

# Inicializa o projeto Supabase local no diretorio externo (uma vez).
if (-not (Test-Path (Join-Path $WorkDir 'supabase\config.toml'))) {
    Push-Location $WorkDir
    try { & npx.cmd -y supabase init } finally { Pop-Location }
}

# Copia as migrations do repo para o diretorio externo.
$migDestino = Join-Path $WorkDir 'supabase\migrations'
if (-not (Test-Path $migDestino)) { New-Item -ItemType Directory -Force -Path $migDestino | Out-Null }
Copy-Item -Path (Join-Path $RepoDir 'supabase\migrations\*') -Destination $migDestino -Force -Recurse

Push-Location $WorkDir
try {
    switch ($Action) {
        'start'     { & npx.cmd -y supabase start; Invoke-Bootstrap }
        'stop'      { & npx.cmd -y supabase stop }
        'status'    { & npx.cmd -y supabase status }
        'reset'     { & npx.cmd -y supabase db reset; Invoke-Bootstrap }
        'bootstrap' { Invoke-Bootstrap }
    }
} finally {
    Pop-Location
}
