import { IEntity, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'parcel';

export const columns: IColumns = [ 'id' ];

export class Parcel implements IEntity {
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

export const orderConfiguration = {
  tableName,
  columns,
  entityClass: Parcel,
  collectionClass: Parcels,
}
