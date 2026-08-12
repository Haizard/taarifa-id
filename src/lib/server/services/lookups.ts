import * as schema from '@taarifa/db/schema';
import { db } from '../db';

export async function all() {
  const [acute, employment, positions, streams, ownership] = await Promise.all([
    db.query.lovAcuteConditions.findMany(),
    db.query.lovEmploymentTypes.findMany(),
    db.query.lovPositions.findMany(),
    db.query.lovSchoolStreams.findMany(),
    db.query.lovOwnershipTypes.findMany(),
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
