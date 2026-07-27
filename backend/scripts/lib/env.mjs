/* ============================================================
   비밀키 로더

   키를 이 레포로 복사하지 않는다 — 두 군데가 되면 회전(rotate)할 때 하나를 빠뜨린다.
   hermes 가 이미 쓰고 있는 .env 를 그대로 읽는다.

   탐색 순서: aztomz/.env  →  $HERMES_HOME/.env  →  process.env
   ============================================================ */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const hermesHome = process.env.HERMES_HOME || 'E:/workspace/side_project/hermes';

function parseEnv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const loaded = { ...parseEnv(join(hermesHome, '.env')), ...parseEnv(join(repoRoot, '.env')) };

/** 키를 읽는다. 없으면 어디에 넣어야 하는지 알려주고 종료. */
export function env(name, { required = true } = {}) {
  const v = process.env[name] || loaded[name];
  if (!v && required) {
    console.error(`✗ ${name} 이(가) 없습니다.\n  ${join(hermesHome, '.env')} 또는 ${join(repoRoot, '.env')} 에 넣으세요.`);
    process.exit(1);
  }
  return v || '';
}
