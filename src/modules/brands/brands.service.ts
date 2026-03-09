import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
  ) {}

  async list() {
    return this.brandRepo.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateBrandDto) {
    const existing = await this.brandRepo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Brand already exists');
    return this.brandRepo.save(this.brandRepo.create({ name: dto.name }));
  }

  async update(id: string, dto: UpdateBrandDto) {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    if (dto.name) brand.name = dto.name;
    return this.brandRepo.save(brand);
  }
}
