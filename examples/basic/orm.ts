import { create, PureORM } from '../../src/index';
import Person from './business-objects/person';
const orm = create({
  getBusinessObjects: () => [ Person as any ],
  db: {},
});
export default orm;
