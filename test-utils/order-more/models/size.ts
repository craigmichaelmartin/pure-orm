import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'size';

export const columns: IColumns = ['id', 'value', 'label'];

export class Size implements IModel {
  id: number;
  value: string;
  label: string;

  constructor(props: any) {
    this.id = props.id;
    this.value = props.value;
    this.label = props.label;
  }
}

export class Sizes implements ICollection<Size> {
  models: Array<Size>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const sizeEntity = {
  tableName,
  columns,
  Model: Size,
  Collection: Sizes
};
