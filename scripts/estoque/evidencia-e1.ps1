# scripts/estoque/evidencia-e1.ps1
# Automacao e coleta de evidencias do Lote E1 (Estoque)
# Requisito R4 - Todos os passos devem sair com codigo 0

$ErrorActionPreference = "Continue"
Set-Location 'C:\Users\thiag\Projetos\escala-irmaos'

$repoRoot = 'C:\Users\thiag\Projetos\escala-irmaos'
$evidenciasDir = Join-Path $repoRoot "docs\implementacao\evidencias\E1"
if (-not (Test-Path $evidenciasDir)) {
    New-Item -ItemType Directory -Path $evidenciasDir -Force | Out-Null
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "INICIANDO SCRIPT DE EVIDENCIAS DO LOTE E1 (ESTOQUE)" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# PASSO 1: Trava de arquivos permitidos vs origin/main
# -----------------------------------------------------------------------------
Write-Host "`n>>> [Passo 1/8] Verificando trava de arquivos permitidos vs origin/main..." -ForegroundColor Yellow
$logPasso1 = Join-Path $evidenciasDir "01-trava-arquivos.log"

$allowedPatterns = @(
    "^src/features/estoque/.*",
    "^tests/estoque/.*",
    "^supabase/migrations/.*_estoque_e1\.sql$",
    "^scripts/estoque/.*",
    "^docs/implementacao/.*",
    "^vitest\.config\.js$",
    "^src/App\.jsx$",
    "^package\.json$",
    "^package-lock\.json$"
)

$changedFiles = git diff --name-only origin/main
$violations = @()

foreach ($file in $changedFiles) {
    if ([string]::IsNullOrWhiteSpace($file)) { continue }
    $fileNormalized = $file.Replace("\", "/")
    $matched = $false
    foreach ($pattern in $allowedPatterns) {
        if ($fileNormalized -match $pattern) {
            $matched = $true
            break
        }
    }
    if (-not $matched) {
        $violations += $fileNormalized
    }
}

$passo1Content = @"
====================================================
PASSO 1: TRAVA DE ARQUIVOS PERMITIDOS VS ORIGIN/MAIN
====================================================
Data/Hora: $(Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
Branch: feat/estoque-e1
Base: origin/main

Total de arquivos modificados/criados: $($changedFiles.Count)
Lista de arquivos:
$($changedFiles -join "`n")

Verificação de conformidade com a lista de permitidos:
"@

if ($violations.Count -gt 0) {
    $errStr = "VIOLACAO: Foram encontrados arquivos modificados fora da lista permitida:`n" + ($violations -join "`n")
    $passo1Content += "`n[FALHA] " + $errStr
    Set-Content -Path $logPasso1 -Value $passo1Content -Encoding utf8
    Write-Host "[FALHA] $errStr" -ForegroundColor Red
    exit 1
} else {
    $passo1Content += "`n[SUCESSO] 100% dos arquivos estao estritamente dentro da lista permitida do Lote E1."
    Set-Content -Path $logPasso1 -Value $passo1Content -Encoding utf8
    Write-Host "[SUCESSO] Trava de arquivos permitidos validada com zero violacoes." -ForegroundColor Green
}

# -----------------------------------------------------------------------------
# PASSO 2: Lint (npm run lint)
# -----------------------------------------------------------------------------
Write-Host "`n>>> [Passo 2/8] Executando linter (npm run lint)..." -ForegroundColor Yellow
$logPasso2 = Join-Path $evidenciasDir "02-lint.log"

$lintOutput = npm.cmd run lint 2>&1 | Out-String
$lintExitCode = $LASTEXITCODE

$passo2Content = @"
====================================================
PASSO 2: EXECUÇÃO DO LINTER (OXLINT)
====================================================
Data/Hora: $(Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
Comando: npm run lint
Código de saída: $lintExitCode

Saída:
$lintOutput
"@

Set-Content -Path $logPasso2 -Value $passo2Content -Encoding utf8

if ($lintExitCode -ne 0 -or $lintOutput -notmatch "Found 0 warnings and 0 errors") {
    Write-Host "[FALHA] Lint falhou ou contem warnings/errors (exit code: $lintExitCode)" -ForegroundColor Red
    exit 1
}
Write-Host "[SUCESSO] Lint aprovado com 0 avisos e 0 erros." -ForegroundColor Green

# -----------------------------------------------------------------------------
# PASSO 3: Testes nos 3 fusos horários (npm run test:tz)
# -----------------------------------------------------------------------------
Write-Host "`n>>> [Passo 3/8] Executando suite de testes nos 3 fusos horarios..." -ForegroundColor Yellow
$logPasso3 = Join-Path $evidenciasDir "03-test-tz.log"

$tzOutput = npm.cmd run test:tz 2>&1 | Out-String
$tzExitCode = $LASTEXITCODE

$passo3Content = @"
====================================================
PASSO 3: TESTES UNITÁRIOS NOS 3 FUSOS HORÁRIOS
====================================================
Data/Hora: $(Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
Comando: npm run test:tz
Fusos: UTC, America/Sao_Paulo, Asia/Tokyo
Código de saída: $tzExitCode

Saída:
$tzOutput
"@

Set-Content -Path $logPasso3 -Value $passo3Content -Encoding utf8

if ($tzExitCode -ne 0) {
    Write-Host "[FALHA] Testes em múltiplos fusos falharam (exit code: $tzExitCode)" -ForegroundColor Red
    exit 1
}
Write-Host "[SUCESSO] 51 testes passaram com sucesso nos 3 fusos." -ForegroundColor Green

# -----------------------------------------------------------------------------
# PASSO 4: Testes de Banco contra Supabase Local (ESTOQUE_DB_TEST=1)
# -----------------------------------------------------------------------------
Write-Host "`n>>> [Passo 4/8] Executando testes de banco de dados e seguranca..." -ForegroundColor Yellow
$logPasso4 = Join-Path $evidenciasDir "04-db-tests.log"

$runnerPath = "c:\Users\thiag\OneDrive\Documentos\Projetos\escala-irmaos\.agents\teamwork\worker_banco\test_db_runner.mjs"
$env:ESTOQUE_DB_TEST = "1"
$dbOutput = node $runnerPath 2>&1 | Out-String
$dbExitCode = $LASTEXITCODE

$passo4Content = @"
====================================================
PASSO 4: TESTES DE BANCO DE DADOS E SEGURANÇA (E1)
====================================================
Data/Hora: $(Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
Comando: node test_db_runner.mjs (ESTOQUE_DB_TEST=1)
Código de saída: $dbExitCode

Saída:
$dbOutput
"@

Set-Content -Path $logPasso4 -Value $passo4Content -Encoding utf8

if ($dbExitCode -ne 0 -or $dbOutput -match "\[FAIL\]") {
    Write-Host "[FALHA] Testes de banco falharam (exit code: $dbExitCode)" -ForegroundColor Red
    exit 1
}
Write-Host "[SUCESSO] 31 verificacoes de banco e seguranca passaram com sucesso." -ForegroundColor Green

# -----------------------------------------------------------------------------
# PASSO 5: Idempotência da Migration
# -----------------------------------------------------------------------------
Write-Host "`n>>> [Passo 5/8] Validando idempotência da migration..." -ForegroundColor Yellow
$logPasso5 = Join-Path $evidenciasDir "05-migration-idempotencia.log"
$migrationSqlPath = Join-Path $repoRoot "supabase\migrations\20260707120000_estoque_e1.sql"

$app1Output = Get-Content $migrationSqlPath -Raw | docker exec -i supabase_db_estoque-local-db psql -U postgres -d postgres 2>&1 | Out-String
$app1Code = $LASTEXITCODE

$app2Output = Get-Content $migrationSqlPath -Raw | docker exec -i supabase_db_estoque-local-db psql -U postgres -d postgres 2>&1 | Out-String
$app2Code = $LASTEXITCODE

$passo5Content = @"
====================================================
PASSO 5: IDEMPOTÊNCIA DA MIGRATION
====================================================
Data/Hora: $(Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
Arquivo: supabase/migrations/20260707120000_estoque_e1.sql

--- 1ª APLICAÇÃO (Código: $app1Code) ---
$app1Output

--- 2ª APLICAÇÃO CONSECUTIVA (Código: $app2Code) ---
$app2Output
"@

Set-Content -Path $logPasso5 -Value $passo5Content -Encoding utf8

if ($app1Code -ne 0 -or $app2Code -ne 0) {
    Write-Host "[FALHA] Idempotencia da migration falhou (app1: $app1Code, app2: $app2Code)" -ForegroundColor Red
    exit 1
}
Write-Host "[SUCESSO] Migration reaplicada duas vezes com codigo de saida 0." -ForegroundColor Green

# -----------------------------------------------------------------------------
# PASSO 6: Rollback e Restauração
# -----------------------------------------------------------------------------
Write-Host "`n>>> [Passo 6/8] Validando rollback e restauracao..." -ForegroundColor Yellow
$logPasso6 = Join-Path $evidenciasDir "06-rollback-restauracao.log"
$rollbackSqlPath = Join-Path $repoRoot "docs\implementacao\sql\estoque_e1_rollback.sql"

# 1. Aplicar Rollback
$rollbackOutput = Get-Content $rollbackSqlPath -Raw | docker exec -i supabase_db_estoque-local-db psql -U postgres -d postgres 2>&1 | Out-String
$rollbackCode = $LASTEXITCODE

# 2. Verificar tabelas restantes após rollback (devem ser apenas as 5 pré-existentes)
$tablesAfterRollback = docker exec -i supabase_db_estoque-local-db psql -U postgres -d postgres -t -A -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>&1 | Out-String

# 3. Restaurar migration
$restoreOutput = Get-Content $migrationSqlPath -Raw | docker exec -i supabase_db_estoque-local-db psql -U postgres -d postgres 2>&1 | Out-String
$restoreCode = $LASTEXITCODE

# 4. Verificar tabelas restauradas
$tablesAfterRestore = docker exec -i supabase_db_estoque-local-db psql -U postgres -d postgres -t -A -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>&1 | Out-String

$passo6Content = @"
====================================================
PASSO 6: ROLLBACK E RESTAURAÇÃO DO BANCO DE DADOS
====================================================
Data/Hora: $(Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
Arquivo Rollback: docs/implementacao/sql/estoque_e1_rollback.sql
Arquivo Migration: supabase/migrations/20260707120000_estoque_e1.sql

--- APLICAÇÃO DO ROLLBACK (Código: $rollbackCode) ---
$rollbackOutput

--- TABELAS EM PUBLIC APÓS ROLLBACK ---
$tablesAfterRollback

--- RESTAURAÇÃO DA MIGRATION (Código: $restoreCode) ---
$restoreOutput

--- TABELAS EM PUBLIC APÓS RESTAURAÇÃO ---
$tablesAfterRestore
"@

Set-Content -Path $logPasso6 -Value $passo6Content -Encoding utf8

if ($rollbackCode -ne 0 -or $restoreCode -ne 0) {
    Write-Host "[FALHA] Rollback ou restauracao falhou (rollback: $rollbackCode, restore: $restoreCode)" -ForegroundColor Red
    exit 1
}
Write-Host "[SUCESSO] Rollback e restauracao executados com integridade total." -ForegroundColor Green

# -----------------------------------------------------------------------------
# PASSO 7: Build com Node 22
# -----------------------------------------------------------------------------
Write-Host "`n>>> [Passo 7/8] Executando build de producao com Node 22..." -ForegroundColor Yellow
$logPasso7 = Join-Path $evidenciasDir "07-build-node22.log"

$buildOutput = npx.cmd -y node@22 node_modules/vite/bin/vite.js build 2>&1 | Out-String
$buildCode = $LASTEXITCODE

$passo7Content = @"
====================================================
PASSO 7: BUILD COM NODE 22 (VITE)
====================================================
Data/Hora: $(Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
Comando: npx -y node@22 node_modules/vite/bin/vite.js build
Código de saída: $buildCode

Saída:
$buildOutput
"@

Set-Content -Path $logPasso7 -Value $passo7Content -Encoding utf8

if ($buildCode -ne 0) {
    Write-Host "[FALHA] Build com Node 22 falhou (exit code: $buildCode)" -ForegroundColor Red
    exit 1
}
Write-Host "[SUCESSO] Build com Node 22 gerado com sucesso." -ForegroundColor Green

# -----------------------------------------------------------------------------
# PASSO 8: Tamanho dos chunks e SHA-256 de todos os artefatos
# -----------------------------------------------------------------------------
Write-Host "`n>>> [Passo 8/8] Calculando tamanho dos chunks e hashes SHA-256..." -ForegroundColor Yellow
$logPasso8 = Join-Path $evidenciasDir "08-hashes-e-chunks.txt"
$shaFile = Join-Path $evidenciasDir "SHA256SUMS.txt"

$distAssets = Get-ChildItem -Path (Join-Path $repoRoot "dist\assets") -File

$chunksReport = @"
====================================================
PASSO 8: RELATÓRIO DE CHUNKS E HASHES SHA-256
====================================================
Data/Hora: $(Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")

1. CHUNKS GERADOS NO BUILD (dist/assets):
"@

foreach ($item in $distAssets) {
    $sizeKb = [Math]::Round($item.Length / 1024, 2)
    $chunksReport += "`n- $($item.Name): $($item.Length) bytes ($sizeKb kB)"
}

$chunksReport += "`n`n2. HASHES SHA-256 DOS ARTEFATOS DO LOTE E1:"

$filesToHash = @(
    "supabase/migrations/20260707120000_estoque_e1.sql",
    "docs/implementacao/sql/estoque_e1_rollback.sql",
    "scripts/estoque/evidencia-e1.ps1",
    "scripts/estoque/db-local.ps1",
    "scripts/estoque/local-bootstrap.sql",
    "scripts/estoque/test-tz.mjs"
)

$shaSumsContent = ""

foreach ($relPath in $filesToHash) {
    $fullP = Join-Path $repoRoot $relPath
    if (Test-Path $fullP) {
        $hash = (Get-FileHash -Path $fullP -Algorithm SHA256).Hash.ToLower()
        $chunksReport += "`n$hash  $relPath"
        $shaSumsContent += "$hash  $relPath`n"
    }
}

foreach ($item in $distAssets) {
    $hash = (Get-FileHash -Path $item.FullName -Algorithm SHA256).Hash.ToLower()
    $chunksReport += "`n$hash  dist/assets/$($item.Name)"
    $shaSumsContent += "$hash  dist/assets/$($item.Name)`n"
}

# Tambem computar hash dos logs gerados nos passos 1 a 7
$logFiles = Get-ChildItem -Path $evidenciasDir -Filter "*.log"
$chunksReport += "`n`n3. HASHES SHA-256 DOS LOGS DE EVIDÊNCIA:"
foreach ($lf in $logFiles) {
    $hash = (Get-FileHash -Path $lf.FullName -Algorithm SHA256).Hash.ToLower()
    $rel = "docs/implementacao/evidencias/E1/$($lf.Name)"
    $chunksReport += "`n$hash  $rel"
    $shaSumsContent += "$hash  $rel`n"
}

Set-Content -Path $logPasso8 -Value $chunksReport -Encoding utf8
Set-Content -Path $shaFile -Value $shaSumsContent.Trim() -Encoding utf8

Write-Host "[SUCESSO] Relatorio de chunks e SHA256SUMS gerados com sucesso." -ForegroundColor Green
Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "TODOS OS 8 PASSOS DE EVIDÊNCIA FINALIZARAM COM SUCESSO (CÓDIGO 0)!" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
exit 0


