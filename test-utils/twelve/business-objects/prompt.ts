import { Member } from './member';
import { IEntity, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'prompt';

export const columns: IColumns = [
  { column: 'for_member_id', references: Member },
  { column: 'from_member_id', references: Member }
];

export class Prompt implements IEntity {
  id: number;
  forMemberId: number;
  forMember?: Member;
  fromMemberId: number;
  fromMember?: Member;

  constructor(props: any) {
    this.id = props.id;
    this.forMemberId = props.forMemberId;
    this.forMember = props.forMember;
    this.fromMemberId = props.fromMemberId;
    this.fromMember = props.fromMember;
  }
}

export class Prompts implements ICollection<Prompt> {
  models: Array<Prompt>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const promptConfiguration = {
  tableName,
  columns,
  entityClass: Prompt,
  collectionClass: Prompts,
}
