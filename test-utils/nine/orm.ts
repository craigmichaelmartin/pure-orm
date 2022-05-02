import { create } from '../../src/index';
import { featureSwitchEntity } from './models/feature-switch';
const orm = create({
  getEntities: () => [featureSwitchEntity],
  db: void 0
});
export default orm;
