import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateSubAccountDto, LockDto, ResetSubPasswordDto, MoveAccountDto } from './accounts.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get('me')
  me(@Req() req: any) {
    return this.accounts.getMe(req.user.sub);
  }

  @Get('sub-accounts')
  @Roles('admin', 'system_admin')
  subAccounts(@Req() req: any) {
    return this.accounts.getSubAccounts(req.user.sub);
  }

  @Post('sub-accounts')
  @Roles('admin')
  createSubAccount(@Req() req: any, @Body() dto: CreateSubAccountDto) {
    return this.accounts.createSubAccount(req.user.sub, dto);
  }

  @Patch(':id/lock')
  @Roles('admin', 'system_admin')
  lock(@Param('id') id: string) {
    return this.accounts.setLock(id, true);
  }

  @Patch(':id/unlock')
  @Roles('admin', 'system_admin')
  unlock(@Param('id') id: string) {
    return this.accounts.setLock(id, false);
  }

  @Post('reset-password')
  @Roles('admin', 'system_admin')
  resetPassword(@Body() dto: ResetSubPasswordDto) {
    return this.accounts.resetSubPassword(dto);
  }

  @Post('move')
  move(@Req() req: any, @Body() dto: MoveAccountDto) {
    return this.accounts.moveAccount(req.user.sub, dto);
  }
}
