import { create, PureORM } from '../../src/index';
import { personConfiguration } from './business-objects/person';
const orm = create({
  getPureORMDataArray: () => [ personConfiguration ],
  db: {},
});
export default orm;
