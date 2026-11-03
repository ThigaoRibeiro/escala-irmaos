import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { USER_MAPPING } from '../../../src/utils/db.js';

describe('migrationMapping.test.js - Conformidade de e-mails da Migration vs USER_MAPPING', () => {
  it('todos os e-mails de USER_MAPPING estão presentes na migration de estoque', () => {
    const migrationPath = path.resolve('supabase', 'migrations', '20260707120000_estoque_e1.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);

    const migrationSql = fs.readFileSync(migrationPath, 'utf8').toLowerCase();
    const emailsEsperados = Object.keys(USER_MAPPING).map(e => e.toLowerCase().trim());

    expect(emailsEsperados.length).toBeGreaterThan(0);

    for (const email of emailsEsperados) {
      expect(
        migrationSql.includes(email),
        `O e-mail '${email}' de USER_MAPPING deve estar presente na função estoque_usuario_autorizado() da migration`
      ).toBe(true);
    }
  });
});
