import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderCheckoutFields1762819200000 implements MigrationInterface {
  name = 'AddOrderCheckoutFields1762819200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN "paymentMethod" character varying(50)
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN "shippingAddress" character varying(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP COLUMN "shippingAddress"
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP COLUMN "paymentMethod"
    `);
  }
}
