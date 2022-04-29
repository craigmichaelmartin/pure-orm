import { create } from '../../src/index';
import { promptConfiguration } from './models/prompt';
import { memberConfiguration } from './models/member';
const orm = create({
  getPureORMDataArray: () => [ promptConfiguration, memberConfiguration ],
  db: void 0
});
export default orm;
