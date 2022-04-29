import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'person';

export const columns: IColumns = ['id', 'first_name', 'last_name', 'email'];

interface IPersonProps {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export class Person implements IModel {
  id: number;
  firstName: string;
  lastName: string;
  email: string;

  constructor(props: IPersonProps) {
    this.id = props.id;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.email = props.email;
  }
}

export class Persons implements ICollection<Person> {
  models: Array<Person>;
  constructor({ models }: any) {
    this.models = models;
    return this;
  }
}

export const personEntity = {
  tableName,
  columns,
  Model: Person,
  Collection: Persons,
}
