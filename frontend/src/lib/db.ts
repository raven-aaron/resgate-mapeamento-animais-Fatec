import { createPool, type Pool } from "mysql2/promise";

const globalPool = globalThis as typeof globalThis & { __resgateMysql?: Pool };

export function banco(): Pool {
  if (!globalPool.__resgateMysql) {
    if (!process.env.DATABASE_URL && !process.env.DB_PASSWORD) throw new Error("Configure DATABASE_URL ou DB_PASSWORD no servidor");
    globalPool.__resgateMysql = createPool({
      ...(process.env.DATABASE_URL ? { uri: process.env.DATABASE_URL } : {\n        host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || "3306"),
      database: process.env.DB_NAME || "resgate_animais",
      user: process.env.DB_USER || "resgate_app",
        password: process.env.DB_PASSWORD,\n      }),
      waitForConnections: true,
      connectionLimit: 3,
      queueLimit: 30,
      connectTimeout: 45000,
      dateStrings: true,
      decimalNumbers: true,
      multipleStatements: false,
      // Enzonic exige TLS; DATABASE_URL ativa TLS e valida o certificado.
      ssl: (Boolean(process.env.DATABASE_URL) || ["required", "true", "1"].includes((process.env.DB_SSL || "").toLowerCase()))
        ? { rejectUnauthorized: true }
        : undefined,
    });
  }
  return globalPool.__resgateMysql;
}
