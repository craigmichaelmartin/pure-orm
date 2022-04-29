import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'shipment';

export const columns: IColumns = ['id', 'inventory_location_id', 'sellable_date'];

export class Shipment implements IModel {
  id: number;
  inventoryLocationId: number;
  sellableDate: Date;

  constructor(props: any) {
    this.id = props.id;
    this.inventoryLocationId = props.inventoryLocationId;
    this.sellableDate = props.sellableDate;
  }
}

export class Shipments implements ICollection<Shipment> {
  models: Array<Shipment>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const shipmentEntity = {
  tableName,
  columns,
  Model: Shipment,
  Collection: Shipments,
}
