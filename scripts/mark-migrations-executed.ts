import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME || 'farmaapk',
  entities: [],
  migrations: [],
});

async function markMigrationsAsExecuted() {
  try {
    await dataSource.initialize();
    console.log('Connected to database');

    // Check if migrations table exists
    const migrationsTableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      )
    `);

    if (!migrationsTableExists[0].exists) {
      console.log('Creating migrations table...');
      await dataSource.query(`
        CREATE TABLE "migrations" (
          "id" SERIAL PRIMARY KEY,
          "timestamp" bigint NOT NULL,
          "name" varchar NOT NULL
        )
      `);
    }

    // Mark already-applied migrations as executed
    const migrationsToMark = [
      { timestamp: 1234567890123, name: 'RefactorProductsAndAddBatches1234567890123' },
      { timestamp: 1740518400000, name: 'FixBatchNumberNotNull1740518400000' },
      { timestamp: 1761440400000, name: 'RoleCleanupRazorpayAndTracking1761440400000' },
      { timestamp: 1761440800000, name: 'UppercaseRolesEnum1761440800000' },
    ];

    for (const migration of migrationsToMark) {
      const exists = await dataSource.query(
        `SELECT * FROM migrations WHERE timestamp = $1`,
        [migration.timestamp]
      );

      if (exists.length === 0) {
        await dataSource.query(
          `INSERT INTO migrations (timestamp, name) VALUES ($1, $2)`,
          [migration.timestamp, migration.name]
        );
        console.log(`✅ Marked ${migration.name} as executed`);
      } else {
        console.log(`⏭️  ${migration.name} already marked as executed`);
      }
    }

    console.log('\n✅ All migrations marked as executed!');
    console.log('You can now run: npm run migration:run');
    console.log('This will only run the new FixRolesEnumSafe migration.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await dataSource.destroy();
  }
}

markMigrationsAsExecuted();
