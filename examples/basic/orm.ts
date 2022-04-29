import { create, PureORM } from '../../src/index';
import { personEntity } from './models/person';
const orm = create({
  getEntities: () => [ personEntity ],
  db: {},
});
export default orm;
