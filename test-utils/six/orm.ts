import { create } from '../../src/index';
import { parcelConfiguration } from './entities/parcel';
import { parcelLineItemConfiguration } from './entities/parcel-line-item';
import { lineItemConfiguration } from './entities/line-item';
import { orderConfiguration } from './entities/order';
import { customerConfiguration } from './entities/customer';
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
