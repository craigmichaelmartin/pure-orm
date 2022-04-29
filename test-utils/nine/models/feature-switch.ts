import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'feature_switch';

export const columns: IColumns = ['id', 'label', 'on'];

interface IFeatureSwitchProps {
  id: number;
  label: string;
  on: boolean;
}

export class FeatureSwitch implements IModel {
  id: number;
  label: string;
  on: boolean;

  constructor(props: IFeatureSwitchProps) {
    this.id = props.id;
    this.label = props.label;
    this.on = props.on;
  }
}

export class FeatureSwitches implements ICollection<FeatureSwitch> {
  models: Array<FeatureSwitch>;
  constructor({ models }: any) {
    this.models = models;
    return this;
  }
}

export const featureSwitchConfiguration = {
  tableName,
  columns,
  Model: FeatureSwitch,
  Collection: FeatureSwitches,
}
