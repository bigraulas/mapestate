import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
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

  async findOne(id: number, agencyId?: number) {
    const unit = await this.prisma.unit.findFirst({
      where: { id, ...(agencyId ? { building: { user: { agencyId } } } : {}) },
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
    const transactionType = this.computeTransactionType(dto);

    const unit = await this.prisma.unit.create({
      data: {
        ...dto,
        transactionType,
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

    await this.recomputeBuildingType(unit.buildingId);
    return unit;
  }

  async update(id: number, dto: UpdateUnitDto, agencyId?: number) {
    const existing = await this.findOne(id, agencyId);

    // Merge existing prices with dto to compute type correctly
    const merged = {
      warehousePrice: dto.warehousePrice !== undefined ? dto.warehousePrice : existing.warehousePrice,
      officePrice: dto.officePrice !== undefined ? dto.officePrice : existing.officePrice,
      salePrice: dto.salePrice !== undefined ? dto.salePrice : existing.salePrice,
    };
    const transactionType = this.computeTransactionType(merged);

    const unit = await this.prisma.unit.update({
      where: { id },
      data: {
        ...dto,
        transactionType,
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

    await this.recomputeBuildingType(unit.buildingId);
    return unit;
  }

  async remove(id: number, agencyId?: number) {
    const unit = await this.findOne(id, agencyId);
    const buildingId = unit.buildingId;

    await this.prisma.unit.delete({
      where: { id },
    });

    await this.recomputeBuildingType(buildingId);
  }

  private computeTransactionType(data: {
    warehousePrice?: number | null;
    officePrice?: number | null;
    salePrice?: number | null;
  }): TransactionType {
    const hasRent =
      (data.warehousePrice != null && data.warehousePrice > 0) ||
      (data.officePrice != null && data.officePrice > 0);
    const hasSale = data.salePrice != null && data.salePrice > 0;

    if (hasRent && hasSale) return TransactionType.RENT_AND_SALE;
    if (hasSale) return TransactionType.SALE;
    return TransactionType.RENT;
  }

  private async recomputeBuildingType(buildingId: number) {
    const units = await this.prisma.unit.findMany({
      where: { buildingId },
      select: { transactionType: true },
    });

    if (units.length === 0) {
      await this.prisma.building.update({
        where: { id: buildingId },
        data: { transactionType: TransactionType.RENT },
      });
      return;
    }

    const types = new Set(units.map((u) => u.transactionType));

    let buildingType: TransactionType;
    if (types.has(TransactionType.RENT_AND_SALE)) {
      buildingType = TransactionType.RENT_AND_SALE;
    } else if (types.has(TransactionType.RENT) && types.has(TransactionType.SALE)) {
      buildingType = TransactionType.RENT_AND_SALE;
    } else if (types.has(TransactionType.SALE)) {
      buildingType = TransactionType.SALE;
    } else {
      buildingType = TransactionType.RENT;
    }

    await this.prisma.building.update({
      where: { id: buildingId },
      data: { transactionType: buildingType },
    });
  }
}
