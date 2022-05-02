import { IModel, ICollection, IColumns } from '../../../src/index';
import { Person } from './person';

export const tableName = 'article';

export const columns: IColumns = [
  'id',
  { column: 'author_id', references: Person },
  'created_date',
  'read_time_minutes',
  'seo_description',
  'primary_image',
  'title',
  'slug',
  'body',
  'amp_body',
  'kind',
  'points'
];

export class Article implements IModel {
  id: number;
  authorId: number;
  author?: Person;
  createdDate: Date;
  readTimeMinutes: number;
  seoDescription: string;
  primaryImage: string;
  title: string;
  slug: string;
  body: string;
  ampBody: string;
  kind: string;
  point: number;

  constructor(props: any) {
    this.id = props.id;
    this.authorId = props.authorId;
    this.author = props.author;
    this.createdDate = props.createdDate;
    this.readTimeMinutes = props.readTimeMinutes;
    this.seoDescription = props.seoDescription;
    this.primaryImage = props.primaryImage;
    this.title = props.title;
    this.slug = props.slug;
    this.body = props.body;
    this.ampBody = props.ampBody;
    this.kind = props.kind;
    this.point = props.point;
  }
}

export class Articles implements ICollection<Article> {
  models: Array<Article>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const articleEntity = {
  tableName,
  columns,
  Model: Article,
  Collection: Articles
};
