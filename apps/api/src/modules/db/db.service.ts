import { Injectable, Inject } from '@nestjs/common';
import type { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@taarifa/db';

@Injectable()
export class DbService {
  public readonly db: ReturnType<typeof drizzle<typeof schema>>;

  constructor(@Inject('PG_POOL') pool: Pool) {
    this.db = drizzle(pool, { schema });
  }
}
