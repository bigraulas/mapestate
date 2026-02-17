import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    const { password: _password, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: user.id, email: user.email, role: user.role, agencyId: user.agencyId };

    const refreshExpiration =
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        expiresIn: refreshExpiration,
      }),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        agencyId: user.agencyId,
      },
    };
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password: _password, ...result } = user;
    return result;
  }

  async refreshToken(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload = { sub: user.id, email: user.email, role: user.role, agencyId: user.agencyId };

    const refreshExpiration =
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        expiresIn: refreshExpiration,
      }),
    };
  }

  async verifyInvitation(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: { agency: { select: { id: true, name: true } } },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException('Invitation already used');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    return {
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      role: invitation.role,
      agencyName: invitation.agency.name,
    };
  }

  async registerWithInvitation(dto: {
    token: string;
    firstName: string;
    lastName: string;
    password: string;
    phone?: string;
  }) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
      include: { agency: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException('Invitation already used');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: invitation.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: invitation.role,
        agencyId: invitation.agencyId,
      },
    });

    // Mark invitation as accepted
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    const payload = { sub: user.id, email: user.email, role: user.role, agencyId: user.agencyId };
    const refreshExpiration =
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';

    const { password: _, ...userWithoutPassword } = user;

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        expiresIn: refreshExpiration,
      }),
      user: userWithoutPassword,
    };
  }
}
