import { create } from '../../src/index';
import { orderEntity } from './models/order';
import { lineItemEntity } from './models/line-item';
import { parcelLineItemEntity } from './models/parcel-line-item';
import { parcelEntity } from './models/parcel';
import { parcelEventEntity } from './models/parcel-event';
const orm = create({
  getEntities: () => [
    orderEntity,
    lineItemEntity,
    parcelLineItemEntity,
    parcelEntity,
    parcelEventEntity
  ],
  db: void 0
});
export default orm;
