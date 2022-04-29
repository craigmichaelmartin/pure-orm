import { LineItem } from './line-item';
import { Parcel } from './parcel';
import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'parcel_line_item';

export const columns: IColumns = [
  'id',
  { column: 'line_item_id', references: LineItem },
  { column: 'parcel_id', references: Parcel }
];

export class ParcelLineItem implements IModel {
  id: number;
  lineItemId: number;
  lineItem: LineItem;
  parcelId: number;
  parcel: Parcel;

  constructor(props: any) {
    this.id = props.id;
    this.lineItemId = props.lineItemId;
    this.lineItem = props.lineItem;
    this.parcelId = props.parcelId;
    this.parcel = props.parcel;
  }
}

export class ParcelLineItems implements ICollection<ParcelLineItem> {
  models: Array<ParcelLineItem>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const parcelLineItemConfiguration = {
  tableName,
  columns,
  Model: ParcelLineItem,
  Collection: ParcelLineItems,
}
