import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SystemAdminService } from './system-admin.service';
import { ActivateAccountDto, CreateLookupDto } from './system-admin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators';

@Controller('admin')
@UseGuards(JwtAuthGuard)
@Roles('system_admin')
export class SystemAdminController {
  constructor(private readonly admin: SystemAdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('accounts')
  accounts(@Query('filter') filter?: string) {
    return this.admin.listAccounts(filter);
  }

  @Get('users')
  users() {
    return this.admin.listUsers();
  }

  @Get('payments')
  payments() {
    return this.admin.listPayments();
  }

  @Get('reports/url-access')
  urlAccess() {
    return this.admin.urlAccessReport();
  }

  @Post('activate')
  activate(@Req() req: any, @Body() dto: ActivateAccountDto) {
    return this.admin.activateByProfileId({ ...dto, actor_account_id: req.user.sub });
  }

  @Post('lookups')
  createLookup(@Body() dto: CreateLookupDto) {
    return this.admin.createLookup(dto.table, dto.code, dto.label);
  }

  @Get('logs')
  logs() {
    return this.admin.listLogs();
  }
}
