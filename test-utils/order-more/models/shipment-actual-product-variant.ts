import { ActualProductVariant } from './actual-product-variant';
import { Shipment } from './shipment';
import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'shipment_actual_product_variant';

export const columns: IColumns = [
  'id',
  { column: 'shipment_id', references: Shipment },
  { column: 'actual_product_variant_id', references: ActualProductVariant },
  'quantity',
  'updated_date'
];

export class ShipmentActualProductVariant implements IModel {
  id: number;
  shipmentId: number;
  shipment?: Shipment;
  actualProductVariantId: number;
  actualProductVariant?: ActualProductVariant;
  quantity: number;
  updatedDate: Date;

  constructor(props: any) {
    this.id = props.id;
    this.shipmentId = props.shipmentId;
    this.shipment = props.shipment;
    this.actualProductVariantId = props.actualProductVariantId;
    this.actualProductVariant = props.actualProductVariant;
    this.quantity = props.quantity;
    this.updatedDate = props.updatedDate;
  }
}

export class ShipmentActualProductVariants
  implements ICollection<ShipmentActualProductVariant>
{
  models: Array<ShipmentActualProductVariant>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const shipmentActualProductVariantEntity = {
  tableName,
  columns,
  Model: ShipmentActualProductVariant,
  Collection: ShipmentActualProductVariants
};
