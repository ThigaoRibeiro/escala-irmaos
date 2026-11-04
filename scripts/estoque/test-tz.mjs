import { spawnSync } from 'child_process'
import path from 'path'

const timezones = ['UTC', 'America/Sao_Paulo', 'Asia/Tokyo']

console.log('====================================================')
console.log('Executando suite de testes nos 3 fusos horarios')
console.log('====================================================\n')

for (const tz of timezones) {
  console.log(`>>> Executando testes com TZ=${tz}...`)
  const vitestBin = path.resolve('node_modules', 'vitest', 'vitest.mjs')
  
  const result = spawnSync(process.execPath, [vitestBin, 'run'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      TZ: tz
    }
  })

  if (result.status !== 0) {
    console.error(`\n[FALHA] Testes falharam no fuso TZ=${tz} (exit code ${result.status})\n`)
    process.exit(result.status || 1)
  } else {
    console.log(`\n[SUCESSO] Passou com TZ=${tz}\n`)
  }
}

console.log('====================================================')
console.log('Todos os testes passaram com sucesso nos 3 fusos!')
console.log('====================================================')
