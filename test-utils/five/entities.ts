import { orderEntity } from './models/order';
import { lineItemEntity } from './models/line-item';
import { parcelLineItemEntity } from './models/parcel-line-item';
import { parcelEntity } from './models/parcel';
import { parcelEventEntity } from './models/parcel-event';
export const entities = [
  orderEntity,
  lineItemEntity,
  parcelLineItemEntity,
  parcelEntity,
  parcelEventEntity
];
