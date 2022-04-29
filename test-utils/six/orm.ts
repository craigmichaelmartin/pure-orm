import { create } from '../../src/index';
import { parcelConfiguration } from './business-objects/parcel';
import { parcelLineItemConfiguration } from './business-objects/parcel-line-item';
import { lineItemConfiguration } from './business-objects/line-item';
import { orderConfiguration } from './business-objects/order';
import { customerConfiguration } from './business-objects/customer';
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
