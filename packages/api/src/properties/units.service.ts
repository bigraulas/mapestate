import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByBuilding(buildingId: number) {
    return this.prisma.unit.findMany({
      where: { buildingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        building: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException(`Unit with ID ${id} not found`);
    }

    return unit;
  }

  async create(dto: CreateUnitDto, userId: number) {
    return this.prisma.unit.create({
      data: {
        ...dto,
        userId,
        warehouseSpace: dto.warehouseSpace ?? undefined,
        officeSpace: dto.officeSpace ?? undefined,
        sanitarySpace: dto.sanitarySpace ?? undefined,
        othersSpace: dto.othersSpace ?? undefined,
        photos: dto.photos ?? undefined,
        images: dto.images ?? undefined,
      },
      include: {
        building: true,
      },
    });
  }

  async update(id: number, dto: UpdateUnitDto) {
    await this.findOne(id);

    return this.prisma.unit.update({
      where: { id },
      data: {
        ...dto,
        warehouseSpace: dto.warehouseSpace ?? undefined,
        officeSpace: dto.officeSpace ?? undefined,
        sanitarySpace: dto.sanitarySpace ?? undefined,
        othersSpace: dto.othersSpace ?? undefined,
        photos: dto.photos ?? undefined,
        images: dto.images ?? undefined,
      },
      include: {
        building: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.unit.delete({
      where: { id },
    });
  }
}
