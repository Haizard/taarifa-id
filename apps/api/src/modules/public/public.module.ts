import { Module } from '@nestjs/common';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';
import { QrcodeModule } from '../qrcode/qrcode.module';

@Module({
  imports: [QrcodeModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
