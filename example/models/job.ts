import { IModel, ICollection, IColumns } from '../../src/index';
import { Person } from './person';
import { Employer } from './employer';

export const tableName: string = 'job';

export const columns: IColumns = [
  'id',
  { column: 'person_id', references: Person },
  { column: 'employer_id', references: Employer },
  'start_date',
  'end_date'
];

interface IJobProps {
  id: number;
  personId: number;
  person?: Person;
  employerId: number;
  employer?: Employer;
  startDate: Date;
  endDate: Date;
}

export class Job implements IModel {
  id: number;
  personId: number;
  person?: Person;
  employerId: number;
  employer?: Employer;
  startDate: Date;
  endDate: Date;
  constructor(props: IJobProps) {
    this.id = props.id;
    this.personId = props.personId;
    this.person = props.person;
    this.employerId = props.employerId;
    this.employer = props.employer;
    this.startDate = props.startDate;
    this.endDate = props.endDate;
  }
  // any business methods...
}

export class Jobs implements ICollection<Job> {
  models: Array<Job>;
  constructor({ models }: any) {
    this.models = models;
    return this;
  }
  // any business methods...
}

export const jobEntity = {
  tableName,
  columns,
  Model: Job,
  Collection: Jobs,
}
