import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'utm_medium';

export const columns: IColumns = [ 'id', 'value', 'label' ];

export class UtmMedium implements IModel {
  id: number;
  value: string;
  label: string;

  constructor(props: any) {
    this.id = props.id;
    this.value = props.value;
    this.label = props.label;
  }
}

export class UtmMediums implements ICollection<UtmMedium> {
  models: Array<UtmMedium>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const utmMediumEntity = {
  tableName,
  columns,
  Model: UtmMedium,
  Collection: UtmMediums,
}
