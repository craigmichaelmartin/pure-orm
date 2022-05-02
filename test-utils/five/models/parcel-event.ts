import { Parcel } from './parcel';
import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'parcel_event';

export const columns: IColumns = [
  'id',
  { column: 'parcel_id', references: Parcel },
  'eta',
  'status'
];

export class ParcelEvent implements IModel {
  id: number;
  parcelId: number;
  parcel: Parcel;
  eta: Date;
  status: string;

  constructor(props: any) {
    this.id = props.id;
    this.parcelId = props.parcelId;
    this.parcel = props.parcel;
    this.eta = props.eta;
    this.status = props.status;
  }
}

export class ParcelEvents implements ICollection<ParcelEvent> {
  models: Array<ParcelEvent>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const parcelEventEntity = {
  tableName,
  columns,
  Model: ParcelEvent,
  Collection: ParcelEvents
};
