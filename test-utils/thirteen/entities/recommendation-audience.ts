import { Recommendation } from './recommendation';
import { Audience } from './audience';
import { IEntity, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'recommendation_audience';

export const columns: IColumns = [
  'id',
  { column: 'recommendation_id', references: Recommendation },
  { column: 'audience_id', references: Audience }
];

export class RecommendationAudience implements IEntity {
  id: number;
  recommendationId: number;
  recommendation?: Recommendation;
  audienceId: number;
  audience?: Audience;

  constructor(props: any) {
    this.id = props.id;
    this.recommendationId = props.recommendationId;
    this.recommendation = props.recommendation;
    this.audienceId = props.audienceId;
    this.audience = props.audience;
  }
}

export class RecommendationAudiences implements ICollection<RecommendationAudience> {
  models: Array<RecommendationAudience>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const recommendationAudienceConfiguration = {
  tableName,
  columns,
  entityClass: RecommendationAudience,
  collectionClass: RecommendationAudiences,
}
