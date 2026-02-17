import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAgencySettings(agencyId: number) {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
    });

    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    return agency;
  }

  async updateAgencySettings(
    agencyId: number,
    data: {
      name?: string;
      logo?: string | null;
      coverImage?: string | null;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      website?: string | null;
      primaryColor?: string;
    },
  ) {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
    });

    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    return this.prisma.agency.update({
      where: { id: agencyId },
      data,
    });
  }
}
