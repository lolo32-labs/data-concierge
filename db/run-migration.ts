import { config } from 'dotenv';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const schemaPath = join(process.cwd(), 'db/schema.sql');
  const sql = readFileSync(schemaPath, 'utf8');

  // Split on semicolons but keep multi-line statements intact.
  // Strip leading comment lines from each chunk, then filter empties.
  const statements = sql
    .split(';')
    .map(s => {
      // Remove leading lines that are pure comments or blank, leaving the SQL statement.
      return s
        .split('\n')
        .filter(line => {
          const trimmed = line.trim();
          return trimmed.length > 0 && !trimmed.startsWith('--');
        })
        .join('\n')
        .trim();
    })
    .filter(s => s.length > 0);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const stmt of statements) {
    const preview = stmt.replace(/\s+/g, ' ').substring(0, 70);
    try {
      await pool.query(stmt);
      console.log('✓', preview);
      ok++;
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('⊘ (exists)', preview);
        skipped++;
      } else {
        console.error('✗', preview);
        console.error('  →', e.message);
        failed++;
      }
    }
  }

  await pool.end();

  console.log(`\nMigration complete — ${ok} executed, ${skipped} skipped (already exist), ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
