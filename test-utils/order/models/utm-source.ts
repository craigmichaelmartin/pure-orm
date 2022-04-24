import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'utm_source';

export const columns: IColumns = [
  'id',
  'value',
  'label',
  'internal'
];

export class UtmSource implements IModel {
  id: number;
  value: string;
  label: string;
  internal: string;

  constructor(props: any) {
    this.id = props.id;
    this.value = props.value;
    this.label = props.label;
    this.internal = props.internal;
  }
}

export class UtmSources implements ICollection<UtmSource> {
  models: Array<UtmSource>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const utmSourceEntity = {
  tableName,
  columns,
  Model: UtmSource,
  Collection: UtmSources,
}
