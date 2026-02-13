import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.offer.findMany({
        skip,
        take: limit,
        include: {
          request: true,
          company: true,
          person: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.offer.count(),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    const offer = await this.prisma.offer.findUnique({
      where: { id },
      include: {
        request: true,
        company: true,
        person: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        offerGroups: {
          include: {
            building: true,
            groupItems: { include: { unit: true } },
          },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException(`Offer with ID ${id} not found`);
    }

    return offer;
  }

  async findByRequest(requestId: number) {
    return this.prisma.offer.findMany({
      where: { requestId },
      include: {
        offerGroups: {
          include: {
            building: true,
            groupItems: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateOfferDto, userId: number) {
    const request = await this.prisma.propertyRequest.findUnique({
      where: { id: dto.requestId },
      include: {
        company: true,
        person: true,
        locations: true,
      },
    });

    if (!request) {
      throw new NotFoundException(
        `Request with ID ${dto.requestId} not found`,
      );
    }

    const offerCode = await this.generateOfferCode(request);

    const offer = await this.prisma.offer.create({
      data: {
        offerCode,
        requestId: request.id,
        userId,
        companyId: request.companyId,
        personId: request.personId,
        requestedSqm: request.numberOfSqm,
        requestedType: request.requestType,
        requestedStartDate: request.startDate,
        requestedLocations: request.locations.map((l) => l.name),
      },
      include: {
        request: true,
        company: true,
        person: true,
      },
    });

    return offer;
  }

  async update(id: number, data: Record<string, unknown>) {
    await this.findOne(id);

    return this.prisma.offer.update({
      where: { id },
      data,
      include: {
        request: true,
        company: true,
        person: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    // Cascade: offerGroups and groupItems deleted by DB cascade
    await this.prisma.offer.delete({ where: { id } });

    return { message: 'Offer deleted successfully' };
  }

  async download(id: number) {
    await this.findOne(id);
    return { message: 'PDF generation not implemented yet' };
  }

  // ── Offer Groups ─────────────────────────────────────────────────────

  async createGroup(offerId: number, dto: CreateGroupDto) {
    await this.findOne(offerId);

    const building = await this.prisma.building.findUnique({
      where: { id: dto.buildingId },
    });
    if (!building) {
      throw new NotFoundException(
        `Building with ID ${dto.buildingId} not found`,
      );
    }

    const units = await this.prisma.unit.findMany({
      where: { id: { in: dto.unitIds }, buildingId: dto.buildingId },
    });

    if (units.length !== dto.unitIds.length) {
      throw new BadRequestException(
        'Some unit IDs are invalid or do not belong to the specified building',
      );
    }

    // Aggregate unit space types
    let warehouseSqm = 0;
    let warehouseWeightedPrice = 0;
    let officeSqm = 0;
    let officeWeightedPrice = 0;
    let sanitarySqm = 0;
    let sanitaryWeightedPrice = 0;
    let othersSqm = 0;
    let othersWeightedPrice = 0;
    let totalDocks = 0;
    let totalDriveins = 0;
    let hasCrossDock = false;

    for (const unit of units) {
      const ws = unit.warehouseSpace as
        | { sqm: number; rentPrice: number }
        | null;
      const os = unit.officeSpace as
        | { sqm: number; rentPrice: number }
        | null;
      const ss = unit.sanitarySpace as
        | { sqm: number; rentPrice: number }
        | null;
      const ot = unit.othersSpace as
        | { sqm: number; rentPrice: number }
        | null;

      if (ws?.sqm) {
        warehouseWeightedPrice += (ws.rentPrice || 0) * ws.sqm;
        warehouseSqm += ws.sqm;
      }
      if (os?.sqm) {
        officeWeightedPrice += (os.rentPrice || 0) * os.sqm;
        officeSqm += os.sqm;
      }
      if (ss?.sqm) {
        sanitaryWeightedPrice += (ss.rentPrice || 0) * ss.sqm;
        sanitarySqm += ss.sqm;
      }
      if (ot?.sqm) {
        othersWeightedPrice += (ot.rentPrice || 0) * ot.sqm;
        othersSqm += ot.sqm;
      }

      totalDocks += unit.docks || 0;
      totalDriveins += unit.driveins || 0;
      if (unit.crossDock) hasCrossDock = true;
    }

    const group = await this.prisma.offerGroup.create({
      data: {
        name: dto.name,
        offerId,
        buildingId: dto.buildingId,
        warehouseSqm,
        warehouseRentPrice:
          warehouseSqm > 0 ? warehouseWeightedPrice / warehouseSqm : 0,
        officeSqm,
        officeRentPrice:
          officeSqm > 0 ? officeWeightedPrice / officeSqm : 0,
        sanitarySqm,
        sanitaryRentPrice:
          sanitarySqm > 0 ? sanitaryWeightedPrice / sanitarySqm : 0,
        othersSqm,
        othersRentPrice:
          othersSqm > 0 ? othersWeightedPrice / othersSqm : 0,
        docks: totalDocks,
        driveins: totalDriveins,
        crossDock: hasCrossDock,
        address: building.address,
        latitude: building.latitude,
        longitude: building.longitude,
        groupItems: {
          create: units.map((u) => ({
            unitName: u.name,
            warehouseSqm:
              (u.warehouseSpace as { sqm: number } | null)?.sqm ?? null,
            unitId: u.id,
          })),
        },
      },
      include: {
        building: true,
        groupItems: { include: { unit: true } },
      },
    });

    return group;
  }

  async updateGroup(groupId: number, dto: UpdateGroupDto) {
    const group = await this.prisma.offerGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`OfferGroup with ID ${groupId} not found`);
    }

    return this.prisma.offerGroup.update({
      where: { id: groupId },
      data: dto,
      include: {
        building: true,
        groupItems: { include: { unit: true } },
      },
    });
  }

  async removeGroup(groupId: number) {
    const group = await this.prisma.offerGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`OfferGroup with ID ${groupId} not found`);
    }

    // Cascade: groupItems deleted by DB cascade
    await this.prisma.offerGroup.delete({ where: { id: groupId } });

    return { message: 'Offer group deleted successfully' };
  }

  async findGroup(groupId: number) {
    const group = await this.prisma.offerGroup.findUnique({
      where: { id: groupId },
      include: {
        building: true,
        groupItems: { include: { unit: true } },
      },
    });

    if (!group) {
      throw new NotFoundException(`OfferGroup with ID ${groupId} not found`);
    }

    return group;
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private async generateOfferCode(
    request: Record<string, any>,
  ): Promise<string> {
    const companyName = request.company?.name || 'NO-COMPANY';
    const locationName =
      request.locations?.[0]?.name || 'NO-LOCATION';
    const date = new Date();
    const dateStr = [
      String(date.getDate()).padStart(2, '0'),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getFullYear()),
    ].join('-');

    // Get sequence number for this request
    const existingCount = await this.prisma.offer.count({
      where: { requestId: request.id },
    });
    const sequence = String(existingCount + 1).padStart(6, '0');

    return `${companyName}-${locationName}-${dateStr}-${sequence}`;
  }
}
