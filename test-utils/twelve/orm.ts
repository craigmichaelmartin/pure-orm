import { create } from '../../src/index';
import { promptConfiguration } from './business-objects/prompt');
import { memberConfiguration } from './business-objects/member');
const orm = create({
  getPureORMDataArray: () => [ promptConfiguration, memberConfiguration ],
  db: void 0
});
export default orm;
