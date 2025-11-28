import mysql from "mysql2/promise";
import pino from "pino";

const logger = pino(
  { name: "mysql-client" },
  pino.destination({ dest: 2, sync: false })
);

export class MySQLClient {
  private pool: mysql.Pool | null = null;

  constructor() {
    this.pool = null;
  }

  async connect(): Promise<void> {
    try {
      this.pool = mysql.createPool({
        host: process.env.MYSQL_HOST || "mysql",
        port: Number(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER || "fooduser",
        password: process.env.MYSQL_PASSWORD || "foodpassword",
        database: process.env.MYSQL_DATABASE || "food_industry",
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });

      // Test connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      logger.info(
        { database: process.env.MYSQL_DATABASE },
        "Connected to MySQL"
      );
    } catch (error) {
      logger.error({ error }, "Failed to connect to MySQL");
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      logger.info("Disconnected from MySQL");
    }
  }

  getPool(): mysql.Pool {
    if (!this.pool) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.pool;
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const pool = this.getPool();
    const [rows] = await pool.execute(sql, params);
    return rows as T[];
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.pool) return false;
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      return true;
    } catch (error) {
      logger.error({ error }, "MySQL health check failed");
      return false;
    }
  }
}

// Singleton instance
let mysqlClientInstance: MySQLClient | null = null;

export function getMySQLClient(): MySQLClient {
  if (!mysqlClientInstance) {
    mysqlClientInstance = new MySQLClient();
  }
  return mysqlClientInstance;
}
