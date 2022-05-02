import { create } from '../../src/index';
import { db } from './db';
import { personEntity } from '../models/person';
import { jobEntity } from '../models/job';
import { employerEntity } from '../models/employer';
const orm = create({
  getEntities: () => [personEntity, jobEntity, employerEntity],
  db
});
export default orm;
