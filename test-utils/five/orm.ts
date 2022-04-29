import { create } from'../../src/index';
import { orderConfiguration } from './entities/order';
import { lineItemConfiguration } from './entities/line-item';
import { parcelLineItemConfiguration } from './entities/parcel-line-item';
import { parcelConfiguration } from './entities/parcel';
import { parcelEventConfiguration } from './entities/parcel-event';
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
