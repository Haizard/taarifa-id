import { Controller, Get, Param, Req } from '@nestjs/common';
import { PublicService } from './public.service';
import { Public } from '../../common/decorators';

@Controller('public')
export class PublicController {
  constructor(private readonly pub: PublicService) {}

  @Get('profiles/:profileId')
  @Public()
  profile(@Param('profileId') profileId: string, @Req() req: any) {
    return this.pub.resolveByProfileId(profileId, req);
  }

  @Get('stats')
  @Public()
  stats() {
    return this.pub.stats();
  }
}
