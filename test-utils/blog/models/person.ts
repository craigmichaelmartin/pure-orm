import { IModel, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'person';

export const columns: IColumns = [
  'id',
  'first_name',
  'last_name',
  'slug',
  'email',
  'picture',
  'cover_photo',
  'brand',
  'tagline',
  'display_name',
  'biography',
  'title'
];

interface IPersonProps {
  id: number;
  firstName: string;
  lastName: string;
  slug: string;
  email: string;
  picture: string;
  coverPhoto: string;
  brand: string;
  tagline: string;
  displayName: string;
  biography: string;
  title: string;
}

export class Person implements IModel {
  id: number;
  firstName: string;
  lastName: string;
  slug: string;
  email: string;
  picture: string;
  coverPhoto: string;
  brand: string;
  tagline: string;
  displayName: string;
  biography: string;
  title: string;

  constructor(props: IPersonProps) {
    this.id = props.id;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.slug = props.slug;
    this.email = props.email;
    this.picture = props.picture;
    this.coverPhoto = props.coverPhoto;
    this.brand = props.brand;
    this.tagline = props.tagline;
    this.displayName = props.displayName;
    this.biography = props.biography;
    this.title = props.title;
  }
}

export class Persons implements ICollection<Person> {
  models: Array<Person>;
  constructor({ models }: any) {
    this.models = models;
    return this;
  }
}

export const personEntity = {
  tableName,
  columns,
  Model: Person,
  Collection: Persons,
}
