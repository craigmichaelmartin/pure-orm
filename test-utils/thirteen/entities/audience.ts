import { IEntity, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'audience';

export const columns: IColumns = [
  'id',
];

export class Audience implements IEntity {
  id: number;

  constructor(props: any) {
    this.id = props.id;
  }
}

export class Audiences implements ICollection<Audience> {
  models: Array<Audience>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const audienceConfiguration = {
  tableName,
  columns,
  entityClass: Audience,
  collectionClass: Audiences,
}
