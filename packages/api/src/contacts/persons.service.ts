import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';

@Injectable()
export class PersonsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.person.findMany({
        skip,
        take: limit,
        include: {
          company: true,
          label: true,
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.person.count(),
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
    const person = await this.prisma.person.findUnique({
      where: { id },
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

  async update(id: number, dto: UpdatePersonDto) {
    await this.findOne(id);

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

  async delete(id: number): Promise<void> {
    await this.findOne(id);

    await this.prisma.person.delete({
      where: { id },
    });
  }

  async search(query: string) {
    const data = await this.prisma.person.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { emails: { array_contains: query } },
          { phones: { array_contains: query } },
        ],
      },
      include: {
        company: true,
        label: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return data;
  }

  async assignCompany(personId: number, companyId: number) {
    await this.findOne(personId);

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
}
