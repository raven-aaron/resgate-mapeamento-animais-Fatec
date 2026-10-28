import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const raiz = fileURLToPath(new URL('../../', import.meta.url));

// As credenciais são lidas DENTRO do contêiner. Não aparecem nos argumentos do host.
// execFileSync evita a interpretação de aspas pelo PowerShell.
export function consultar(sql) {
  const comando = 'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql --protocol=tcp -h 127.0.0.1 -u "$MYSQL_USER" --database="$MYSQL_DATABASE" --default-character-set=utf8mb4 --batch --raw --skip-column-names';
  try {
    return execFileSync('docker', ['compose', 'exec', '-T', 'mysql', 'sh', '-c', comando], {
      cwd: raiz,
      input: "SET time_zone = '+00:00';\nSET SESSION sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION,ONLY_FULL_GROUP_BY,NO_ZERO_IN_DATE,NO_ZERO_DATE';\n" + sql,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  } catch (erro) {
    const detalhe = erro.stderr?.toString().trim() || erro.message;
    throw new Error(detalhe, { cause: erro });
  }
}
