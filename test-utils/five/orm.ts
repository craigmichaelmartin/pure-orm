import { create } from'../../src/index';
import { orderConfiguration } from './business-objects/order';
import { lineItemConfiguration } from './business-objects/line-item';
import { parcelLineItemConfiguration } from './business-objects/parcel-line-item';
import { parcelConfiguration } from './business-objects/parcel';
import { parcelEventConfiguration } from './business-objects/parcel-event';
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
