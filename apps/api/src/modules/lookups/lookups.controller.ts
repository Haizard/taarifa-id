import { Controller, Get } from '@nestjs/common';
import { LookupsService } from './lookups.service';
import { Public } from '../../common/decorators';

@Controller('lookups')
export class LookupsController {
  constructor(private readonly lookups: LookupsService) {}

  @Get()
  @Public()
  all() {
    return this.lookups.all();
  }
}
