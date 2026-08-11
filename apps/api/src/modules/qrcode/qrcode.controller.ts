import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { QrcodeService } from './qrcode.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators';

@Controller('qrcode')
export class QrcodeController {
  constructor(private readonly qrcode: QrcodeService) {}

  @Get(':profileId')
  @Public()
  async generate(@Param('profileId') profileId: string, @Query('url') url?: string) {
    const target = url ?? `${process.env.WEB_URL ?? 'http://localhost:3000'}/profile/${profileId}`;
    const dataUrl = await this.qrcode.generate(target);
    return { profile_id: profileId, url: target, qr_data_url: dataUrl };
  }
}
