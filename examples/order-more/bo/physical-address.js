const PhysicalAddresses = require('./physical-addresses');

class PhysicalAddress {
  constructor(props) {
    Object.assign(this, props);
  }

  get BoCollection() {
    return PhysicalAddresses;
  }

  static get tableName() {
    return 'physical_address';
  }

  static get sqlColumnsData() {
    return [
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
  }
}

module.exports = PhysicalAddress;
