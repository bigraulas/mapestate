import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AgencyStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateAgencyDto } from './dto/create-agency.dto';

@Injectable()
export class AgenciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateAgencyDto) {
    // Check if owner email is already registered
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.ownerEmail },
    });
    if (existingUser) {
      throw new BadRequestException('Email is already registered');
    }

    // Create agency
    const agency = await this.prisma.agency.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        address: dto.address,
      },
    });

    // Create invitation
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.invitation.create({
      data: {
        email: dto.ownerEmail,
        token,
        role: 'ADMIN',
        firstName: dto.ownerFirstName,
        lastName: dto.ownerLastName,
        agencyId: agency.id,
        expiresAt,
      },
    });

    // Send invitation email
    await this.sendInvitation({
      to: dto.ownerEmail,
      agencyName: dto.name,
      firstName: dto.ownerFirstName,
      token,
    });

    return agency;
  }

  async findAll() {
    const agencies = await this.prisma.agency.findMany({
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return agencies.map((a) => ({
      ...a,
      usersCount: a._count.users,
      _count: undefined,
    }));
  }

  async findOne(id: number) {
    const agency = await this.prisma.agency.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
          },
        },
        _count: { select: { users: true } },
      },
    });

    if (!agency) {
      throw new NotFoundException(`Agency with ID ${id} not found`);
    }

    return {
      ...agency,
      usersCount: agency._count.users,
      _count: undefined,
    };
  }

  async updateStatus(id: number, status: AgencyStatus) {
    const agency = await this.prisma.agency.findUnique({ where: { id } });
    if (!agency) {
      throw new NotFoundException(`Agency with ID ${id} not found`);
    }

    return this.prisma.agency.update({
      where: { id },
      data: { status },
    });
  }

  async invite(agencyId: number, dto: { email: string; firstName: string; lastName: string; role?: string }) {
    const agency = await this.prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) {
      throw new NotFoundException(`Agency with ID ${agencyId} not found`);
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('Email is already registered');
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        token,
        role: (dto.role as any) || 'BROKER',
        firstName: dto.firstName,
        lastName: dto.lastName,
        agencyId,
        expiresAt,
      },
    });

    await this.sendInvitation({
      to: dto.email,
      agencyName: agency.name,
      firstName: dto.firstName,
      token,
    });

    return invitation;
  }

  private async sendInvitation(params: {
    to: string;
    agencyName: string;
    firstName: string;
    token: string;
  }) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${frontendUrl}/inregistrare?token=${params.token}`;

    try {
      await this.emailService.sendInvitationEmail({
        to: params.to,
        agencyName: params.agencyName,
        firstName: params.firstName,
        inviteUrl,
      });
    } catch {
      // Log but don't fail the operation
    }
  }
}
