import { create } from '../../src/index';
import { promptEntity } from './models/prompt';
import { memberEntity } from './models/member';
const orm = create({
  getEntities: () => [ promptEntity, memberEntity ],
  db: void 0
});
export default orm;
