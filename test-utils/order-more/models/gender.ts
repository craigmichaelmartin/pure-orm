import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'gender';

export const columns: IColumns = [ 'id', 'value', 'label' ];

export class Gender implements IModel {
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

export const genderEntity = {
  tableName,
  columns,
  Model: Gender,
  Collection: Genders,
}
