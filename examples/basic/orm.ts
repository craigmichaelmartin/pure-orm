import { create, PureORM } from '../../src/index';
import { personConfiguration } from './models/person';
const orm = create({
  getPureORMDataArray: () => [ personConfiguration ],
  db: {},
});
export default orm;
