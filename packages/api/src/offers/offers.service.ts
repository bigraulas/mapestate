import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { SendOffersDto } from './dto/send-offers.dto';

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

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

  async sendOffers(dto: SendOffersDto, userId: number) {
    const deal = await this.prisma.propertyRequest.findUnique({
      where: { id: dto.dealId },
      include: { company: true, person: true, locations: true },
    });

    if (!deal) {
      throw new NotFoundException('Deal with ID ' + dto.dealId + ' not found');
    }

    const buildings = await this.prisma.building.findMany({
      where: { id: { in: dto.buildingIds } },
      include: { location: true },
    });

    if (buildings.length === 0) {
      throw new BadRequestException('No valid buildings selected');
    }

    // Get recipient emails from person
    const recipientEmails: string[] = [];
    if (deal.person) {
      const personData = await this.prisma.person.findUnique({
        where: { id: deal.person.id },
      });
      if (personData) {
        const emails = personData.emails as unknown;
        if (Array.isArray(emails)) {
          recipientEmails.push(...emails.filter((e: string) => e));
        }
      }
    }

    if (recipientEmails.length === 0) {
      throw new BadRequestException(
        'No email addresses found on contact person',
      );
    }

    // Create offers for each building
    const createdOffers = [];
    for (const building of buildings) {
      const offerCode = await this.generateOfferCode(deal);
      const offer = await this.prisma.offer.create({
        data: {
          offerCode,
          requestId: deal.id,
          userId,
          companyId: deal.companyId,
          personId: deal.personId,
          requestedSqm: deal.numberOfSqm,
          requestedType: deal.requestType,
          requestedStartDate: deal.startDate,
          requestedLocations: deal.locations.map((l) => l.name),
          sentAt: new Date(),
          emailStatus: 'PENDING',
        },
      });
      createdOffers.push({ offer, building });
    }

    // Send email
    const emailResult = await this.emailService.sendOfferEmail({
      to: recipientEmails,
      subject: 'Oferta: ' + deal.name,
      dealName: deal.name,
      companyName: deal.company?.name,
      buildings: buildings.map((b) => ({
        name: b.name,
        address: b.address || undefined,
        availableSqm: b.availableSqm || undefined,
        serviceCharge: b.serviceCharge || undefined,
        location: b.location?.name,
      })),
      message: dto.message,
    });

    // Update offers with email status
    const offerIds = createdOffers.map((co) => co.offer.id);
    await this.prisma.offer.updateMany({
      where: { id: { in: offerIds } },
      data: {
        emailStatus: emailResult.status,
        emailId: emailResult.emailId,
        sentAt: new Date(),
      },
    });

    // Auto-update deal status to OFFERING if currently NEW
    if (deal.status === 'NEW') {
      await this.prisma.propertyRequest.update({
        where: { id: deal.id },
        data: { status: 'OFFERING', lastStatusChange: new Date() },
      });
    }

    return {
      sent: createdOffers.length,
      emailStatus: emailResult.status,
      emailId: emailResult.emailId,
    };
  }

  async generatePdf(dealId: number): Promise<Buffer> {
    const deal = await this.prisma.propertyRequest.findUnique({
      where: { id: dealId },
      include: {
        company: true,
        person: true,
        locations: true,
        offers: {
          include: {
            offerGroups: {
              include: {
                building: true,
                groupItems: { include: { unit: true } },
              },
            },
          },
        },
      },
    });

    if (!deal) {
      throw new NotFoundException('Deal with ID ' + dealId + ' not found');
    }

    // pdfkit is already installed in package.json
    const PDFDocument = require('pdfkit');

    return new Promise((resolve) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(20).text('Dunwell CRM', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).text('Oferta: ' + deal.name, { align: 'center' });
      doc.moveDown();

      // Deal info
      doc.fontSize(10).fillColor('#666');
      if (deal.company) doc.text('Companie: ' + deal.company.name);
      if (deal.person) doc.text('Contact: ' + deal.person.name);
      if (deal.numberOfSqm)
        doc.text('Suprafata ceruta: ' + deal.numberOfSqm + ' mp');
      if (deal.requestType)
        doc.text(
          'Tip: ' + (deal.requestType === 'RENT' ? 'Inchiriere' : 'Vanzare'),
        );
      doc.moveDown();

      // Properties
      doc
        .fontSize(12)
        .fillColor('#000')
        .text('Proprietati oferite:', { underline: true });
      doc.moveDown(0.5);

      for (const offer of deal.offers) {
        for (const group of offer.offerGroups || []) {
          doc.fontSize(10).fillColor('#333');
          doc.text(group.building?.name || group.name);
          if (group.address)
            doc.fontSize(8).fillColor('#666').text('  ' + group.address);
          if (group.warehouseSqm)
            doc.text('  Depozit: ' + group.warehouseSqm + ' mp');
          doc.moveDown(0.3);
        }
      }

      // Footer
      doc.moveDown(2);
      doc
        .fontSize(8)
        .fillColor('#999')
        .text('Generat prin Dunwell CRM', { align: 'center' });

      doc.end();
    });
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
