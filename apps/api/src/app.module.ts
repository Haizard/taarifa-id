import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { DbModule } from './modules/db/db.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SmsModule } from './modules/sms/sms.module';
import { QrcodeModule } from './modules/qrcode/qrcode.module';
import { LookupsModule } from './modules/lookups/lookups.module';
import { SystemAdminModule } from './modules/system-admin/system-admin.module';
import { PublicModule } from './modules/public/public.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true, secret: process.env.JWT_SECRET ?? 'dev_secret' }),
    DbModule,
    AuthModule,
    AccountsModule,
    ProfilesModule,
    PaymentsModule,
    SmsModule,
    QrcodeModule,
    LookupsModule,
    SystemAdminModule,
    PublicModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
