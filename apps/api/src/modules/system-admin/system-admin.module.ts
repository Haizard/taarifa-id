import { Module } from '@nestjs/common';
import { SystemAdminService } from './system-admin.service';
import { SystemAdminController } from './system-admin.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [SystemAdminController],
  providers: [SystemAdminService],
})
export class SystemAdminModule {}
