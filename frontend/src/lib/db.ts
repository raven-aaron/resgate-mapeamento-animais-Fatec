import { createPool, type Pool } from "mysql2/promise";

const globalPool = globalThis as typeof globalThis & { __resgateMysql?: Pool };

export function banco(): Pool {
  if (!globalPool.__resgateMysql) {
    if (!process.env.DB_PASSWORD) throw new Error("DB_PASSWORD não configurada no servidor");
    globalPool.__resgateMysql = createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || "3306"),
      database: process.env.DB_NAME || "resgate_animais",
      user: process.env.DB_USER || "resgate_app",
      password: process.env.DB_PASSWORD,
      waitForConnections: true,
      connectionLimit: 8,
      queueLimit: 30,
      connectTimeout: 10000,
      dateStrings: true,
      decimalNumbers: true,
      multipleStatements: false,
    });
  }
  return globalPool.__resgateMysql;
}
