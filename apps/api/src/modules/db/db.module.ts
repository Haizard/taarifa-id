import { Global, Module } from '@nestjs/common';
import { pool } from '@taarifa/db';
import { DbService } from './db.service';

@Global()
@Module({
  providers: [DbService, { provide: 'PG_POOL', useValue: pool }],
  exports: [DbService],
})
export class DbModule {}
