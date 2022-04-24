import { IModel, ICollection, IColumns } from '../../src/index';

export const tableName: string = 'employer';

export const columns: IColumns = ['id', 'name'];

interface IEmployerProps {
  id: number;
  name: string;
}

export class Employer implements IModel {
  id: number;
  name: string;
  constructor(props: IEmployerProps) {
    this.id = props.id;
    this.name = props.name;
  }
  // any business methods...
}

export class Employers implements ICollection<Employer> {
  models: Array<Employer>;
  constructor({ models }: any) {
    this.models = models;
    return this;
  }
  // any business methods...
}

export const employerEntity = {
  tableName,
  columns,
  Model: Employer,
  Collection: Employers,
}
