import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'person';

export const columns: IColumns = ['id'];

export class Person implements IModel {
  id: number;

  constructor(props: any) {
    this.id = props.id;
  }
}

export class Persons implements ICollection<Person> {
  models: Array<Person>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const personEntity = {
  tableName,
  columns,
  Model: Person,
  Collection: Persons
};
