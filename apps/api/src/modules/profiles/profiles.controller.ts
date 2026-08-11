import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CreatePersonProfileDto, UpdatePersonProfileDto, UpsertSubFormsDto } from './profiles.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get()
  all(@Req() req: any) {
    return this.profiles.getMyProfiles(req.user.sub);
  }

  @Get('members')
  members(@Req() req: any) {
    return this.profiles.getMembers(req.user.sub);
  }

  @Get('entity')
  entity(@Req() req: any) {
    return this.profiles.getEntityDetails(req.user.sub);
  }

  @Put('entity')
  upsertEntity(@Req() req: any, @Body() dto: any) {
    return this.profiles.upsertEntityDetails(req.user.sub, dto);
  }

  @Post('members')
  createMember(@Req() req: any, @Body() dto: CreatePersonProfileDto) {
    return this.profiles.createMember(req.user.sub, dto);
  }

  @Get(':id')
  one(@Req() req: any, @Param('id') id: string) {
    return this.profiles.getProfile(req.user.sub, id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdatePersonProfileDto) {
    return this.profiles.updateProfile(req.user.sub, id, dto);
  }

  @Put(':id/sub-forms')
  upsertSubForms(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertSubFormsDto) {
    return this.profiles.upsertSubForms(req.user.sub, id, dto);
  }
}
