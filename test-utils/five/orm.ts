import { create } from'../../src/index';
import { orderConfiguration } from './models/order';
import { lineItemConfiguration } from './models/line-item';
import { parcelLineItemConfiguration } from './models/parcel-line-item';
import { parcelConfiguration } from './models/parcel';
import { parcelEventConfiguration } from './models/parcel-event';
const orm = create({
  getPureORMDataArray: () => [
    orderConfiguration,
    lineItemConfiguration,
    parcelLineItemConfiguration,
    parcelConfiguration,
    parcelEventConfiguration
  ],
  db: void 0
});
export default orm;
