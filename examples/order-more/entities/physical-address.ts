import { IEntity, ICollection, IColumns } from '../../../src/index';

export const tableName: string = 'physical_address';

export const columns: IColumns = [
  'id',
  'address1',
  'address2',
  'city',
  'province',
  'zip',
  'country',
  'province_code',
  'country_code',
  'latitude',
  'longitude'
];

export class PhysicalAddress implements IEntity {
  id: number;
  address1: string;
  address2: string;
  city: string;
  province: string;
  zip: string;
  country: string;
  provinceCode: string;
  countryCode: string;
  latitude: string;
  longitude: string;

  constructor(props: any) {
    this.id = props.id;
    this.address1 = props.address1;
    this.address2 = props.address2;
    this.city = props.city;
    this.province = props.province;
    this.zip = props.zip;
    this.country = props.country;
    this.provinceCode = props.provinceCode;
    this.countryCode = props.countryCode;
    this.latitude = props.latitude;
    this.longitude = props.longitude;
  }
}

export class PhysicalAddresses implements ICollection<PhysicalAddress> {
  models: Array<PhysicalAddress>;
  constructor({ models }: any) {
    this.models = models;
  }
}

export const physicalAddressConfiguration = {
  tableName,
  columns,
  entityClass: PhysicalAddress,
  collectionClass: PhysicalAddresses,
}
