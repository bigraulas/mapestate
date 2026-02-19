import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Fields to return (exclude password)
const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  avatar: true,
  agencyId: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 20, agencyId?: number | null) {
    const skip = (page - 1) * limit;
    const where = agencyId ? { agencyId } : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: userSelect,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
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
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async create(dto: CreateUserDto, agencyId?: number) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...dto,
        password: hashedPassword,
        ...(agencyId ? { agencyId } : {}),
      },
      select: userSelect,
    });

    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = { ...dto };

    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });

    return user;
  }

  async delete(id: number): Promise<void> {
    await this.findOne(id);

    await this.prisma.user.delete({
      where: { id },
    });
  }

  async portfolioCount(userId: number, agencyId: number) {
    const agencyFilter = { userId, user: { agencyId } };

    const [persons, companies, requests, offers] = await Promise.all([
      this.prisma.person.count({ where: agencyFilter }),
      this.prisma.company.count({ where: agencyFilter }),
      this.prisma.propertyRequest.count({ where: agencyFilter }),
      this.prisma.offer.count({ where: agencyFilter }),
    ]);

    return { persons, companies, requests, offers };
  }

  async bulkReassignPortfolio(
    fromUserId: number,
    toUserId: number,
    agencyId: number,
  ) {
    // Verify both users belong to the same agency
    const [fromUser, toUser] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: fromUserId, agencyId } }),
      this.prisma.user.findFirst({ where: { id: toUserId, agencyId } }),
    ]);

    if (!fromUser || !toUser) {
      throw new NotFoundException('Unul dintre utilizatori nu a fost gasit in aceasta agentie');
    }

    const where = { userId: fromUserId, user: { agencyId } };

    const [persons, companies, requests, offers] = await this.prisma.$transaction([
      this.prisma.person.updateMany({ where, data: { userId: toUserId } }),
      this.prisma.company.updateMany({ where, data: { userId: toUserId } }),
      this.prisma.propertyRequest.updateMany({ where, data: { userId: toUserId } }),
      this.prisma.offer.updateMany({ where, data: { userId: toUserId } }),
    ]);

    return {
      persons: persons.count,
      companies: companies.count,
      requests: requests.count,
      offers: offers.count,
    };
  }
}
