import { create } from '../../src/index';
import { parcelEntity } from './models/parcel';
import { parcelLineItemEntity } from './models/parcel-line-item';
import { lineItemEntity } from './models/line-item';
import { orderEntity } from './models/order';
import { customerEntity } from './models/customer';
const orm = create({
  entities: [
    parcelEntity,
    parcelLineItemEntity,
    lineItemEntity,
    orderEntity,
    customerEntity
  ],
  db: void 0
});
export default orm;
