import { IEntity, ICollection, IColumns } from '../../../src/index';
import { Article } from './article';
import { Tag } from './tag';

export const tableName = 'article_tag';

export const columns: IColumns = [
  'id',
  { column: 'article_id', references: Article },
  { column: 'tag_id', references: Tag },
];

export class ArticleTag implements IEntity {
  id: number;
  articleId: number;
  article?: Article;
  tagId: number;
  tag?: Tag;

  constructor(props: any) {
    this.id = props.id;
    this.articleId = props.articleId;
    this.article = props.article;
    this.tagId = props.tagId;
    this.tag = props.tag;
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
  entityClass: ArticleTag,
  collectionClass: ArticleTags,
};
