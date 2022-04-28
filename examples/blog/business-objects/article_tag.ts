import { IEntity, ICollection, IColumns } from '../../../src/index';
import { Article } from './article';
import { Person } from './person';

export const tableName = 'article_tag';

export const columns: IColumns = [
  'id',
  { column: 'article_id', references: Article },
  { column: 'person', references: Person },
];

export class ArticleTag implements IEntity {
  id: number;
  articleId: number;
  article?: Article;
  personId: number;
  person?: Person;

  constructor(props: any) {
    this.id = props.id;
    this.articleId = props.articleId;
    this.article = props.article;
    this.personId = props.personId;
    this.person = props.person;
  }
}

export class ArticleTags implements ICollection<ArticleTag> {
  models: Array<ArticleTag>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const articleTagConfiguration = {
  tableName,
  columns,
  entityClass: Article,
  collectionClass: ArticleTags,
};
