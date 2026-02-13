import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        skip,
        take: limit,
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.company.count(),
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

  async filter(name: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const where = {
      name: { contains: name, mode: 'insensitive' as const },
    };

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

  async updateLogo(id: number, logo: string) {
    await this.findOne(id);

    return this.prisma.company.update({
      where: { id },
      data: { logo },
    });
  }
}
