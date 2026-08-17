/* The registry a kujo-shaped application hands to createCore: the transitive
 * closure of every entity the captured queries touch (a referenced model
 * class must itself be registered).
 */
import {
  vendorEntity,
  fitEntity,
  productEntity,
  actualProductVariantEntity,
  sizeEntity,
  colorEntity,
  genderEntity,
  productVariantEntity,
  productVariantImageEntity,
  physicalAddressEntity,
  inventoryLocationEntity,
  inventoryLevelEntity,
  shipmentEntity,
  shipmentActualProductVariantEntity,
  catalogEntity,
  catalogProductVariantEntity
} from './catalog';
import {
  customerSourceEntity,
  customerTypeEntity,
  paymentTermsEntity,
  shippingTermsEntity,
  wholesalerEntity,
  personEntity,
  customerEntity,
  financialStatusEntity,
  fulfillmentStatusEntity,
  utmSourceEntity,
  utmMediumEntity,
  orderEntity,
  lineItemEntity
} from './orders';
import {
  parcelEntity,
  parcelLineItemEntity,
  returnEntity,
  returnLineItemEntity,
  exchangeEntity,
  exchangeLineItemEntity
} from './parcels';
import {
  instagramEntity,
  productNoteEntity,
  productFeatureEntity,
  productSpecificationEntity
} from './content';

export const entities = [
  vendorEntity,
  fitEntity,
  productEntity,
  actualProductVariantEntity,
  sizeEntity,
  colorEntity,
  genderEntity,
  productVariantEntity,
  productVariantImageEntity,
  physicalAddressEntity,
  inventoryLocationEntity,
  inventoryLevelEntity,
  shipmentEntity,
  shipmentActualProductVariantEntity,
  catalogEntity,
  catalogProductVariantEntity,
  customerSourceEntity,
  customerTypeEntity,
  paymentTermsEntity,
  shippingTermsEntity,
  wholesalerEntity,
  personEntity,
  customerEntity,
  financialStatusEntity,
  fulfillmentStatusEntity,
  utmSourceEntity,
  utmMediumEntity,
  orderEntity,
  lineItemEntity,
  parcelEntity,
  parcelLineItemEntity,
  returnEntity,
  returnLineItemEntity,
  exchangeEntity,
  exchangeLineItemEntity,
  instagramEntity,
  productNoteEntity,
  productFeatureEntity,
  productSpecificationEntity
];
