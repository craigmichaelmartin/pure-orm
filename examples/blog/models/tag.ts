import { IModel, ICollection, IColumns } from '../../../src/index';
import { Person } from './person';

export const tableName = 'tag';

export const columns: IColumns = [
  'id',
  'name',
  'slug'
];

export class Tag implements IModel {
  id: number;
  name: string;
  slug: string;

  constructor(props: any) {
    this.id = props.id;
    this.name = props.name;
    this.slug = props.slug;
  }
}

export class Tags implements ICollection<Tag> {
  models: Array<Tag>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const tagEntity = {
  tableName,
  columns,
  Model: Tag,
  Collection: Tags,
};
