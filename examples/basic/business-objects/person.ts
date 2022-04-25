import { Entity, EntityCollection } from '../../../src/index';

export class Persons implements EntityCollection {
  models: Array<Person>;
  static get Bo() {
    return Person;
  }
  constructor({ models }: any) {
    this.models = models;
    return this;
  }
}

export default class Person implements Entity {
  constructor(props: object) {
    Object.assign(this, props);
    return this;
  }
  static get tableName() {
    return 'person';
  }
  get BoCollection() {
    return Persons as any;
  }
  static get sqlColumnsData() {
    return ['id', 'first_name', 'last_name', 'email'];
  }
}

