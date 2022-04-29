import { create } from '../../src/index';
import { featureSwitchConfiguration } from './models/feature-switch';
const orm = create({
  getPureORMDataArray: () => [ featureSwitchConfiguration ],
  db: void 0
});
export default orm;
