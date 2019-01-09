# SQL Toolkit

[![Build Status](https://travis-ci.org/craigmichaelmartin/sql-toolkit.svg?branch=master)](https://travis-ci.org/craigmichaelmartin/algorithm)
[![Greenkeeper badge](https://badges.greenkeeper.io/craigmichaelmartin/sql-toolkit.svg)](https://greenkeeper.io/)
[![codecov](https://codecov.io/gh/craigmichaelmartin/sql-toolkit/branch/master/graph/badge.svg)](https://codecov.io/gh/craigmichaelmartin/sql-toolkit)

## Installation

```bash
npm install --save sql-toolkit
```

## What is SQL Toolkit?

SQL Toolkit is a node library built for `pr-promise` to make working with a postgres database seamless.

#### Philosophy

SQL Toolkit is intentionally not an ORM. There are not hundreds of methods mapping the complexit of SQL to class objects.

Instead, the value of the toolkit is that you get to write native SQL (not ORM-abstracted SQL-ish) while receiving back pure javascript objects.

#### Design Goals

- Have **pure** "business" objects which can represent the data of a table and be the subject of the app's business logic.
  - These objects are pure javascript objects: decoupled from the database, and agnostic to how interfacing is done.
  - They will be full of business logic methods, and their purity make them easy to test/use.
- Allow the unobstructed writing of normal SQL.
  - I want to write SQL. I don't want to re-create the nuances of SQL in an API. I woulnd't want to learn that API even if it existed. I want to write SQL exactly as I would if in psql. Not SQL-ish. Not chunked up with special APIs. Not using wierd json_build_object functions. Just normal SQL.
- Have the SQL (Data Access) understand pure business objects as inputs, and return them as outputs.

#### Concepts

A **Business Object** (BO) is a pure javascript object corresponding to a table.

A **Data Access Object** (DAO) is a database-aware abstraction layer where SQL is written.

DAO methods return pure BOs. Likewise, BOs may be passed to DAO methods to get or update records.

## Example Usage of already made BOs and DAOs

```javascript
let raw = new Person({
  email: 'foobar@gmail.com',
  firstName: 'craig',
  lastName: 'martin'
});

const personDAO = new PersonDAO({ db });

// Returns a person business object with the persisted data
let person = await personDAO.create(raw);

person.email = 'craigmartin@gmail.com';

// Returns a person business object with the updated persisted data
person = await personDAO.update(person);

// Gets or creates a person business object
same = await personDAO.getOrCreate(raw);
same.id === person.id; // true

// Returns the person business object which matches this data
same = await personDAO.getMatching(
  new Person({ email: 'craigmartin11@gmail.com' })
);
same.id === person.id; // true

// Deletes the person data form the database
await personDAO.delete(person);

// Returns the person business object returned by whatever DAO methods your write
person = await personDAO.getFromCustomMadeMethod();
```

See examples below for what the DAO side of this looks like.

## API

### Classes

#### `BaseBO`

An abstract class which is the base class your BO classes to extend.

**Abstract Methods** to be implemented

- `get c(): BO` - Returns the business object class constructor.
- `static get tableName(): string` - Returns the string table name which the business object associates with from the database.
- `static get displayName(): string` - Returns the string display name of the business object.
- `static get sqlColumns(): Array<string>` - Returns an array of the database column names.
- `static get columns(): Array<string>` - Returns an array of the columns names to be used as javascript properties.

**Public Methods**

- `constructor(props: object)`
- static getSQLSelectClause()
- static parseFromDatabase(result)

#### `BaseDAO`

The base class your DAO classes extend.

**Public Methods**

- `constructor({ db }})
- `getMatching(bo: BaseBO)`
- `getAllMatching(bo: BaseBO)`
- `getOrCreate(bo: BaseBO)`
- `create(bo: BaseBO)`
- `update(bo: BaseBO)`
- `delete(bo: BaseBO)`

While BaseDAO provides these basic methods, the philosophy of this toolkit is not to have a huge API surface area which mirrors the intricacies of the SQL DSL. Rather, you write DAO methods using SQL and pass back business objects.

Lets take a few examples to show this.

#### Examples

```javascript
class Person extends BaseDAO {
  // ...
}
```

Lets start with a basic example which just uses the
**`BaseBO.parseFromDatabase`** method to map the column names to our desired
javascript properties.

```javascript
getRandom() {
  const query = `
    SELECT person.id, person.first_name, person.last_name, person.created_date, person.employer_id
    FROM person
    ORDER BY random()
    LIMIT 1;
  `;
  return this.db
    .one(query)
    .then(result => Right(new Person(Person.parseFromDatabase(result))))
    .catch(Left);
}
// OUTPUT: Person {id, firstName, lastName, createdDate, employerId}
```

Specifying all the columns is tedious; lets use
**`BaseBo.getSQLSelectClause()`** to get them for free.

```diff
getRandom() {
  const query = `
-    SELECT person.id, person.first_name, person.last_name, person.created_date, person.employer_id
+    SELECT ${Person.getSQLSelectClause()}
    FROM person
    ORDER BY random()
    LIMIT 1;
  `;
  return this.db
    .one(query)
    .then(result => Right(new Person(Person.parseFromDatabase(result))))
    .catch(Left);
}
// OUTPUT: Person {id, firstName, lastName, createdDate, employerId}
```

More important than saving the tedium, though, is how
**`BaseBo.getSQLSelectClause()`** namespaces each select expression name
under the hood, and which **`BaseBo.parseFromDatabase`** knows how to handle.
This means that when joining, not only is the select expression easy,
select expression names won't collide:

```diff
getRandom() {
  const query = `
-    SELECT ${Person.getSQLSelectClause()}
+    SELECT ${Person.getSQLSelectClause()}, ${Employer.getSQLSelectClause()}
    FROM person
+    JOIN employer on person.employer_id = employer.id
    ORDER BY random()
    LIMIT 1;
  `;
  return this.db
    .one(query)
    .then(result => Right(new Person(Person.parseFromDatabase(result))))
    .catch(Left);
}
// OUTPUT: Person {id, firstName, lastName, createdDate, employer: Employer}
```

Rather than being flat, with the employer id and createdDate colliding with
person's id and createDate, the result is a nice Person BO with a nested
Employer BO.

Lets move to a different example to show off another aspect of
**`BaseBo.parseFromDatabase`**: how it handles flattening data. Lets say
there are three tags for article being retrieved, rather than the data
being an array of 3 results with article repeated, the result is
a nice Article BO with the tags nested in it.

```javascript
getBySlug(slug) {
  const query = `
    SELECT
      ${Article.getSQLSelectClause()},
      ${Person.getSQLSelectClause()},
      ${Tag.getSQLSelectClause()}
    FROM article
    JOIN person
        ON article.author_id = person.id
    LEFT JOIN article_tags
        ON article.id = article_tags.article_id
    LEFT JOIN tag
        ON article_tags.tag_id = tag.id
    WHERE article.slug = $(slug);
  `;
  return this.db
    .many(query, { slug })
    .then(result => Right(new Article(Article.parseFromDatabase(result))));
    .catch(Left);
}
// OUTPUT: Person {id, firstName, lastName, createdDate, tags: [Tag, Tag, Tag]}
```

Lastly, for now, lets see how meta data can be intertwined:

```javascript
getBloggerPayout(id, startDate, endDate) {
  const query = `
    SELECT
      person.id,
      person.slug,
      person.email,
      person.first_name,
      person.last_name,
      person.last_paid_date,
      person.pay_frequency,
      COALESCE(SUM(article.blogger_payout), 0) as meta_amount,
    FROM
      person
    LEFT JOIN article
      ON article.author_id = person.id
      AND (article.created_date BETWEEN $(startDate) AND $(endDate))
    WHERE
      person.id = $(id)
    GROUP BY person.id, person.slug, person.email,
      person.first_name, person.last_name, person.last_paid_date,
      person.pay_frequency
    ORDER BY meta_amount DESC NULLS LAST;
  `;
  return this.db
    .one(query, {id, startDate, endDate})
    .then(result => Right(new Person(Person.parseFromDatabase(result))))
    .catch(Left);
}
```

### Methods

#### `createBaseBO({ getTableData }): BaseBo`

**Parameters**

- `getTableData: () => { tableMap, collectionsMap, singleToCollection }` - A function which returns table information. These values (`tableMap`, `collectionsMap`, `singleToCollection`) may be omitted here if they are passed to the BaseBo constructor. Passing these every time is tedious (hence the ability to do it just once in this `createBaseBo` factory), but is nice mocking in tests.
  - `tableMap: object`
    - An object with the tablename as property name and the business object class constructor as key.
    - Used to construct joined row data in the business object. If supplied, the business object is returned; else, a raw js obj.
  - `collectionsMap: object`
  - `singleToCollection: object`

**Return Value**

- The BaseBo class to extend for your business objects.

#### `createBaseDAO({ getTableData, db, logError }): BaseDAO`

**Parameters**

- `getTableData: () => { tableMap, collectionsMap, singleToCollection }` - A function which returns table information. These values (`tableMap`, `collectionsMap`, `singleToCollection`) may be omitted here if they are passed to the BaseBo constructor. Passing these every time is tedious (hence the ability to do it just once in this `createBaseBo` factory), but is nice mocking in tests.
  - `tableMap: object`
    - An object with the tablename as property name and the business object class constructor as key.
    - Used to construct joined row data in the business object. If supplied, the business object is returned; else, a raw js obj.
  - `collectionsMap: object`
  - `singleToCollection: object`
- `logError: function`
- `db: pg-promise database`

**Return Value**

- The BaseDAO class to extend for your business objects.
