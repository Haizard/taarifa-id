import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './payments.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreatePaymentDto) {
    return this.payments.create(req.user.sub, dto);
  }

  @Get('history')
  history(@Req() req: any) {
    return this.payments.getHistory(req.user.sub);
  }

  @Get('status')
  status(@Req() req: any) {
    return this.payments.getStatus(req.user.sub);
  }
}
