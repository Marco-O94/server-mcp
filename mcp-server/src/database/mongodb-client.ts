import { MongoClient, Db } from "mongodb";
import pino from "pino";

const logger = pino(
  { name: "mongodb-client" },
  pino.destination({ dest: 2, sync: false })
);

export class MongoDBClient {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private readonly uri: string;
  private readonly dbName: string;

  constructor(uri: string, dbName: string = "paints_db") {
    this.uri = uri;
    this.dbName = dbName;
  }

  async connect(): Promise<void> {
    try {
      this.client = new MongoClient(this.uri);
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      logger.info({ dbName: this.dbName }, "Connected to MongoDB");
    } catch (error) {
      logger.error({ error }, "Failed to connect to MongoDB");
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      logger.info("Disconnected from MongoDB");
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.db;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) return false;
      await this.db.admin().ping();
      return true;
    } catch (error) {
      logger.error({ error }, "MongoDB health check failed");
      return false;
    }
  }
}

// Singleton instance
let mongoClientInstance: MongoDBClient | null = null;

export function getMongoDBClient(): MongoDBClient {
  if (!mongoClientInstance) {
    const uri =
      process.env.MONGODB_URI ||
      "mongodb://admin:mongopassword@mongodb:27017/paints_db?authSource=admin";
    mongoClientInstance = new MongoDBClient(uri);
  }
  return mongoClientInstance;
}
