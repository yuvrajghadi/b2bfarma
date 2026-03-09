import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductDescription1762819200001 implements MigrationInterface {
  name = 'AddProductDescription1762819200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN "description" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      DROP COLUMN "description"
    `);
  }
}
