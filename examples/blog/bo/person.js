const Base = require('./base');

class Person extends Base {
  static get tableName() {
    return 'person';
  }

  static get sqlColumnsData() {
    return [
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
  }
}

module.exports = Person;
