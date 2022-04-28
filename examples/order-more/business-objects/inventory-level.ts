import { ActualProductVariant } from './actual-product-variant';
import { Shipment } from './shipment';

import { IEntity, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'inventory_level';

export const columns: IColumns = [
  'id',
  'inventory_location_id',
  { column: 'actual_product_variant_id', references: ActualProductVariant },
  'available',
  { column: 'next_shipment_id', references: Shipment },
  'sellable_when_sold_out',
  'updated_date'
];

export class InventoryLevel implements IEntity {
  id: number;
  inventoryLocationId: number;
  actualProductVariantId: number;
  actualProductVariant?: ActualProductVariant;
  available: number;
  nextShipmentId: number;
  nextShipment: Shipment;
  sellableWhenSoldOut: boolean;
  updateDate: Date;

  constructor(props: any) {
    this.id = props.id;
    this.inventoryLocationId = props.inventoryLocationId;
    this.actualProductVariantId = props.actualProductVariantId;
    this.actualProductVariant = props.actualProductVariant;
    this.available = props.available;
    this.nextShipmentId = props.nextShipmentId;
    this.nextShipment = props.nextShipment;
    this.sellableWhenSoldOut = props.sellableWhenSoldOut;
    this.updateDate = props.updateDate;
  }
}

export class InventoryLevels implements ICollection<InventoryLevel> {
  models: Array<InventoryLevel>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const orderConfiguration = {
  tableName,
  columns,
  entityClass: InventoryLevel,
  collectionClass: InventoryLevels,
}
