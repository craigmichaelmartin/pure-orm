import { create } from '../../src/index';
import { promptConfiguration } from './entities/prompt';
import { memberConfiguration } from './entities/member';
const orm = create({
  getPureORMDataArray: () => [ promptConfiguration, memberConfiguration ],
  db: void 0
});
export default orm;
