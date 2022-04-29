import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'member';

export const columns: IColumns = [
  'id',
];

export class Member implements IModel {
  id: number;

  constructor(props: any) {
    this.id = props.id;
  }
}

export class Members implements ICollection<Member> {
  models: Array<Member>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const memberConfiguration = {
  tableName,
  columns,
  Model: Member,
  Collection: Members,
}
