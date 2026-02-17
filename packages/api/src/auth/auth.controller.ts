import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout() {
    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async refresh(@Request() req: { user: { id: number } }) {
    return this.authService.refreshToken(req.user.id);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Request() req: { user: { id: number } }) {
    return this.authService.getMe(req.user.id);
  }

  @Get('invitation/:token')
  async verifyInvitation(@Param('token') token: string) {
    return this.authService.verifyInvitation(token);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body()
    dto: {
      token: string;
      firstName: string;
      lastName: string;
      password: string;
      phone?: string;
    },
  ) {
    return this.authService.registerWithInvitation(dto);
  }
}
