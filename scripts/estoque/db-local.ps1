<#
.SYNOPSIS
    Gerencia o ambiente local do Supabase para desenvolvimento e testes do Estoque (Lote E1).

.DESCRIPTION
    Este script roda o Supabase Local estritamente FORA do repositório principal
    (em C:\Users\thiag\Projetos\_estoque-local-db) para garantir que supabase/config.toml
    nunca seja modificado e nenhum comando remoto (link/db push) seja executado.

.PARAMETER Action
    start    - Inicializa e inicia o Supabase local com migrations e bootstrap.
    stop     - Para os containers locais do Supabase.
    status   - Exibe o status dos containers e portas locais.
    reset    - Reinicia o banco local, reaplicando migrations e o bootstrap.
    bootstrap- Aplica o arquivo local-bootstrap.sql no banco local.
#>

param(
    [ValidateSet('start', 'stop', 'status', 'reset', 'bootstrap')]
    [string]$Action = 'start',
    [string]$WorkDir = "C:\Users\thiag\Projetos\_estoque-local-db",
    [string]$RepoDir = "C:\Users\thiag\Projetos\escala-irmaos"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Supabase Local (Estoque E1) - Ação: $Action ===" -ForegroundColor Cyan
Write-Host "WorkDir externo: $WorkDir" -ForegroundColor Gray
Write-Host "Repo: $RepoDir" -ForegroundColor Gray

# 1. Garantir que o diretório externo existe
if (-not (Test-Path $WorkDir)) {
    New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null
    Write-Host "[OK] Diretório externo criado: $WorkDir" -ForegroundColor Green
}

# 2. Inicializar o Supabase no workdir externo se necessário
$localConfig = Join-Path $WorkDir "supabase\config.toml"
if (-not (Test-Path $localConfig)) {
    Write-Host "[INIT] Inicializando Supabase CLI no diretório externo..." -ForegroundColor Yellow
    Push-Location $WorkDir
    try {
        & npx.cmd -y supabase init
    } finally {
        Pop-Location
    }
}

# 3. Sincronizar migrations do repositório para o workdir externo
$repoMigrationsDir = Join-Path $RepoDir "supabase\migrations"
$workMigrationsDir = Join-Path $WorkDir "supabase\migrations"
if (-not (Test-Path $workMigrationsDir)) {
    New-Item -ItemType Directory -Force -Path $workMigrationsDir | Out-Null
}

if (Test-Path $repoMigrationsDir) {
    Copy-Item -Path "$repoMigrationsDir\*" -Destination $workMigrationsDir -Force -Recurse
    Write-Host "[SYNC] Migrations copiadas para o ambiente externo." -ForegroundColor Green
}

# 4. Executar a ação solicitada
Push-Location $WorkDir
try {
    switch ($Action) {
        'start' {
            Write-Host "[START] Iniciando Supabase local..." -ForegroundColor Yellow
            & npx.cmd -y supabase start
            Write-Host "[OK] Supabase local rodando!" -ForegroundColor Green
            
            # Aplicar bootstrap
            $bootstrapPath = Join-Path $RepoDir "scripts\estoque\local-bootstrap.sql"
            if (-not (Test-Path $bootstrapPath)) {
                $bootstrapPath = Join-Path "c:\Users\thiag\OneDrive\Documentos\Projetos\escala-irmaos\.agents\teamwork\worker_banco" "local-bootstrap.sql"
            }
            if (Test-Path $bootstrapPath) {
                Write-Host "[BOOTSTRAP] Aplicando $bootstrapPath..." -ForegroundColor Yellow
                Get-Content $bootstrapPath -Raw | & npx.cmd -y supabase db execute
                Write-Host "[OK] Bootstrap aplicado com sucesso!" -ForegroundColor Green
            }
        }
        'stop' {
            Write-Host "[STOP] Parando Supabase local..." -ForegroundColor Yellow
            & npx.cmd -y supabase stop
            Write-Host "[OK] Supabase local parado." -ForegroundColor Green
        }
        'status' {
            Write-Host "[STATUS] Verificando status do Supabase local..." -ForegroundColor Yellow
            & npx.cmd -y supabase status
        }
        'reset' {
            Write-Host "[RESET] Resetando banco local..." -ForegroundColor Yellow
            & npx.cmd -y supabase db reset
            
            $bootstrapPath = Join-Path $RepoDir "scripts\estoque\local-bootstrap.sql"
            if (-not (Test-Path $bootstrapPath)) {
                $bootstrapPath = Join-Path "c:\Users\thiag\OneDrive\Documentos\Projetos\escala-irmaos\.agents\teamwork\worker_banco" "local-bootstrap.sql"
            }
            if (Test-Path $bootstrapPath) {
                Write-Host "[BOOTSTRAP] Reaplica bootstrap..." -ForegroundColor Yellow
                Get-Content $bootstrapPath -Raw | & npx.cmd -y supabase db execute
                Write-Host "[OK] Bootstrap reaplicado!" -ForegroundColor Green
            }
        }
        'bootstrap' {
            $bootstrapPath = Join-Path $RepoDir "scripts\estoque\local-bootstrap.sql"
            if (-not (Test-Path $bootstrapPath)) {
                $bootstrapPath = Join-Path "c:\Users\thiag\OneDrive\Documentos\Projetos\escala-irmaos\.agents\teamwork\worker_banco" "local-bootstrap.sql"
            }
            if (Test-Path $bootstrapPath) {
                Write-Host "[BOOTSTRAP] Aplicando $bootstrapPath..." -ForegroundColor Yellow
                Get-Content $bootstrapPath -Raw | & npx.cmd -y supabase db execute
                Write-Host "[OK] Bootstrap aplicado!" -ForegroundColor Green
            } else {
                Write-Error "Arquivo de bootstrap não encontrado: $bootstrapPath"
            }
        }
    }
} finally {
    Pop-Location
}
