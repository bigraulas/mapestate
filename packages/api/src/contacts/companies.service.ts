import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 20, userId: number | null = null, agencyId?: number | null) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = userId != null ? { userId } : {};
    if (agencyId) {
      where.user = { agencyId };
    }

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        persons: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return company;
  }

  async create(dto: CreateCompanyDto, userId: number) {
    return this.prisma.company.create({
      data: {
        ...dto,
        userId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async update(id: number, dto: UpdateCompanyDto) {
    await this.findOne(id);

    return this.prisma.company.update({
      where: { id },
      data: dto,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async delete(id: number): Promise<void> {
    await this.findOne(id);

    await this.prisma.company.delete({
      where: { id },
    });
  }

  async filter(name: string, page: number = 1, limit: number = 20, userId: number | null = null, agencyId?: number | null) {
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      name: { contains: name, mode: 'insensitive' as const },
    };

    if (userId != null) {
      where.userId = userId;
    }
    if (agencyId) {
      where.user = { agencyId };
    }

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async lookupCui(cui: string) {
    const numericCui = cui.replace(/\D/g, '');
    if (!numericCui) return null;

    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(
      'https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ cui: parseInt(numericCui, 10), data: today }]),
      },
    );

    if (!res.ok) return null;

    const body: any = await res.json();
    const found = body?.found?.[0];
    if (!found) return null;

    const gen = found.date_generale ?? {};
    return {
      name: gen.denumire ?? '',
      address: gen.adresa ?? '',
      jNumber: gen.nrRegCom ?? '',
      vatNumber: `RO${numericCui}`,
    };
  }

  async updateLogo(id: number, logo: string) {
    await this.findOne(id);

    return this.prisma.company.update({
      where: { id },
      data: { logo },
    });
  }

  async reassign(id: number, newUserId: number) {
    await this.findOne(id);
    return this.prisma.company.update({
      where: { id },
      data: { userId: newUserId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async bulkReassign(fromUserId: number, toUserId: number, agencyId: number) {
    const result = await this.prisma.company.updateMany({
      where: { userId: fromUserId, user: { agencyId } },
      data: { userId: toUserId },
    });
    return { count: result.count };
  }
}
