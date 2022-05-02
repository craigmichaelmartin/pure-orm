import { IModel, ICollection, IColumns } from '../../src/index';

export const tableName: string = 'person';

export const columns: IColumns = ['id', 'name'];

interface IPersonProps {
  id: number;
  name: string;
}

export class Person implements IModel {
  id: number;
  name: string;
  constructor(props: IPersonProps) {
    this.id = props.id;
    this.name = props.name;
  }
  sayHello() {
    console.log(`${this.name} says hi!`);
  }
  // any other business methods...
}

export class Persons implements ICollection<Person> {
  models: Array<Person>;
  constructor({ models }: any) {
    this.models = models;
    return this;
  }
  introductions() {
    this.models.forEach((person) => person.sayHello());
  }
  // any other business methods...
}

export const personEntity = {
  tableName,
  columns,
  Model: Person,
  Collection: Persons
};
