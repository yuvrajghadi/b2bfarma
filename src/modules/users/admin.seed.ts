import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { RolesService } from '../roles/roles.service';
import { RoleName } from '../../common/enums/role.enum';
import * as bcrypt from 'bcrypt';

const logger = new Logger('AdminSeed');

/**
 * Seeds the admin user into the database if it doesn't already exist.
 * This function is called automatically during application startup.
 * 
 * @param userRepository - TypeORM repository for User entity
 * @param rolesService - Service to fetch roles
 */
export async function seedAdminUser(
  userRepository: Repository<User>,
  rolesService: RolesService,
): Promise<void> {
  const adminEmail = 'admin@farma.com';
  
  try {
    // Check if admin user already exists
    const existingAdmin = await userRepository.findOne({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      logger.log(`✅ Admin user already exists: ${adminEmail}`);
      return;
    }

    // Get the ADMIN role from the database
    const adminRole = await rolesService.findByName(RoleName.ADMIN);
    if (!adminRole) {
      logger.error(`❌ ADMIN role not found in database. Please run migrations first.`);
      return;
    }

    // Hash the default password
    const passwordHash = await bcrypt.hash('admin123', 10);

    // Create the admin user
    const adminUser = userRepository.create({
      email: adminEmail,
      passwordHash: passwordHash,
      fullName: 'Admin',
      role: adminRole,
      isActive: true,
    });

    await userRepository.save(adminUser);
    
    logger.log(`🎉 Admin user created successfully!`);
    logger.log(`   Email: ${adminEmail}`);
    logger.log(`   Password: admin123`);
    logger.warn(`⚠️  Please change the default password after first login!`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`❌ Failed to seed admin user: ${errorMessage}`);
    // Don't throw error to prevent application startup failure
  }
}
