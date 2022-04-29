import { create } from '../../src/index';
import { parcelConfiguration } from './models/parcel';
import { parcelLineItemConfiguration } from './models/parcel-line-item';
import { lineItemConfiguration } from './models/line-item';
import { orderConfiguration } from './models/order';
import { customerConfiguration } from './models/customer';
const orm = create({
  getPureORMDataArray: () => [
    parcelConfiguration,
    parcelLineItemConfiguration,
    lineItemConfiguration,
    orderConfiguration,
    customerConfiguration
  ],
  db: void 0
});
export default orm;
