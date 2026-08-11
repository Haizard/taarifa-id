import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { SmsService } from './sms.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('sms')
@UseGuards(JwtAuthGuard)
export class SmsController {
  constructor(private readonly sms: SmsService) {}

  @Get('logs')
  logs(@Req() req: any) {
    return this.sms.getLogs(req.user.sub);
  }
}
