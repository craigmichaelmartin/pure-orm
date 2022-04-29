import { IEntity, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'gender';

export const columns: IColumns = [ 'id', 'value', 'label' ];

export class Gender implements IEntity {
  id: number;
  value: string;
  label: string;

  constructor(props: any) {
    this.id = props.id;
    this.value = props.value;
    this.label = props.label;
  }
}

export class Genders implements ICollection<Gender> {
  models: Array<Gender>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const genderConfiguration = {
  tableName,
  columns,
  entityClass: Gender,
  collectionClass: Genders,
}
