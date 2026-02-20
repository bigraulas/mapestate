import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';

@Injectable()
export class PersonsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 20, userId: number | null = null, agencyId?: number | null) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = userId != null ? { userId } : {};
    if (agencyId) {
      where.user = { agencyId };
    }

    const [data, total] = await Promise.all([
      this.prisma.person.findMany({
        where,
        skip,
        take: limit,
        include: {
          company: true,
          label: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.person.count({ where }),
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

  async findOne(id: number, agencyId?: number) {
    const person = await this.prisma.person.findFirst({
      where: { id, ...(agencyId ? { user: { agencyId } } : {}) },
      include: {
        company: true,
        label: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!person) {
      throw new NotFoundException(`Person with ID ${id} not found`);
    }

    return person;
  }

  async create(dto: CreatePersonDto, userId: number) {
    return this.prisma.person.create({
      data: {
        ...dto,
        userId,
      },
      include: {
        company: true,
        label: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async update(id: number, dto: UpdatePersonDto, agencyId?: number) {
    await this.findOne(id, agencyId);

    return this.prisma.person.update({
      where: { id },
      data: dto,
      include: {
        company: true,
        label: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async delete(id: number, agencyId?: number): Promise<void> {
    await this.findOne(id, agencyId);

    await this.prisma.person.delete({
      where: { id },
    });
  }

  async search(query: string, userId: number | null = null, agencyId?: number | null) {
    const orConditions = [
      { name: { contains: query, mode: 'insensitive' as const } },
      { emails: { array_contains: query } },
      { phones: { array_contains: query } },
    ];

    const conditions: Record<string, unknown>[] = [];
    if (userId != null) conditions.push({ userId });
    if (agencyId) conditions.push({ user: { agencyId } });
    conditions.push({ OR: orConditions });

    const where: Record<string, unknown> = conditions.length > 1
      ? { AND: conditions }
      : conditions[0] || {};

    const data = await this.prisma.person.findMany({
      where,
      include: {
        company: true,
        label: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return data;
  }

  async assignCompany(personId: number, companyId: number, agencyId?: number) {
    await this.findOne(personId, agencyId);

    return this.prisma.person.update({
      where: { id: personId },
      data: { companyId },
      include: {
        company: true,
        label: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async reassign(id: number, newUserId: number, agencyId?: number) {
    await this.findOne(id, agencyId);
    return this.prisma.person.update({
      where: { id },
      data: { userId: newUserId },
      include: {
        company: true,
        label: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async bulkReassign(fromUserId: number, toUserId: number, agencyId: number) {
    const result = await this.prisma.person.updateMany({
      where: { userId: fromUserId, user: { agencyId } },
      data: { userId: toUserId },
    });
    return { count: result.count };
  }
}
