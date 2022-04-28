import { IEntity, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'utm_source';

export const columns: IColumns = [
  'id',
  'value',
  'label',
];

export class UtmSource implements IEntity {
  id: number;
  value: string;
  label: string;

  constructor(props: any) {
    this.id = props.id;
    this.value = props.value;
    this.label = props.label;
  }
}

export class UtmSources implements ICollection<UtmSource> {
  models: Array<UtmSource>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const utmSourceConfiguration = {
  tableName,
  columns,
  entityClass: UtmSource,
  collectionClass: UtmSources,
}
