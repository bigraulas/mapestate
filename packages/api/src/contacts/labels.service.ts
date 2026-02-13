import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.label.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const label = await this.prisma.label.findUnique({
      where: { id },
    });

    if (!label) {
      throw new NotFoundException(`Label with ID ${id} not found`);
    }

    return label;
  }

  async create(dto: CreateLabelDto) {
    return this.prisma.label.create({
      data: dto,
    });
  }

  async update(id: number, dto: UpdateLabelDto) {
    await this.findOne(id);

    return this.prisma.label.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: number): Promise<void> {
    await this.findOne(id);

    await this.prisma.label.delete({
      where: { id },
    });
  }
}
