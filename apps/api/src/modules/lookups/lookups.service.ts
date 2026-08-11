import { Injectable } from '@nestjs/common';
import * as schema from '@taarifa/db';
import { DbService } from '../db/db.service';

@Injectable()
export class LookupsService {
  constructor(private readonly dbService: DbService) {}

  private get db() {
    return this.dbService.db;
  }

  async all() {
    const [acute, employment, positions, streams, ownership] = await Promise.all([
      this.db.query.lovAcuteConditions.findMany(),
      this.db.query.lovEmploymentTypes.findMany(),
      this.db.query.lovPositions.findMany(),
      this.db.query.lovSchoolStreams.findMany(),
      this.db.query.lovOwnershipTypes.findMany(),
    ]);
    return {
      acute_conditions: acute,
      relation_types: schema.relationTypeEnum.enumValues.map((v) => ({ code: v, label: v.replace(/_/g, ' ') })),
      employment_types: employment,
      positions: positions,
      school_streams: streams,
      ownership_types: ownership,
    };
  }
}
