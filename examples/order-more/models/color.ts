import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'color';

export const columns: IColumns = ['id', 'value', 'label', 'position', 'image_url'];

export class Color implements IModel {
  id: number;
  value: string;
  label: string;
  position: number;
  imageUrl: string;

  constructor(props: any) {
    this.id = props.id;
    this.value = props.value;
    this.label = props.label;
    this.position = props.position;
    this.imageUrl = props.imageUrl;
  }
}

export class Colors implements ICollection<Color> {
  models: Array<Color>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const colorConfiguration = {
  tableName,
  columns,
  Model: Color,
  Collection: Colors,
}
