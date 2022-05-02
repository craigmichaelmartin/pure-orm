import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'parcel';

export const columns: IColumns = ['id'];

export class Parcel implements IModel {
  id: number;

  constructor(props: any) {
    this.id = props.id;
  }
}

export class Parcels implements ICollection<Parcel> {
  models: Array<Parcel>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const parcelEntity = {
  tableName,
  columns,
  Model: Parcel,
  Collection: Parcels
};
