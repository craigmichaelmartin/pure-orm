# [PureORM](https://github.com/craigmichaelmartin/pure-orm) &middot; [![Build Status](https://travis-ci.org/craigmichaelmartin/pure-orm.svg?branch=master)](https://travis-ci.org/craigmichaelmartin/pure-orm) [![codecov](https://codecov.io/gh/craigmichaelmartin/pure-orm/branch/master/graph/badge.svg)](https://codecov.io/gh/craigmichaelmartin/pure-orm)

## Installation

```bash
npm install --save pure-orm
```

## What is PureORM?

PureORM is a lightweight ORM for mapping the relational result rows of a database driver query to properly structured (nested) pure instances of your business object classes.

It's purpose - and guiding principle - is to allow you to write regular native SQL (not niche library-specific ORM wrapper APIs) and receive back properly structured/nested pure business objects (not database-connected stateful objects).

PureORM is the top layer for interfacing with your database. You bring your own database driver (eg [node-postgres](https://github.com/brianc/node-postgres)/[pg-promise](https://github.com/vitaly-t/pg-promise), [mysql](https://github.com/mysqljs/mysql), [node-sqlite3](https://github.com/mapbox/node-sqlite3), [node-mssql](https://github.com/tediousjs/node-mssql), [node-oracledb](https://github.com/oracle/node-oracledb), etc), and PureORM works on top of it to perform the Object-Relational Mapping (ORM).

PureORM contrasts with tradtional ORMs in two ways:

1. PureORM is purely the "orm" (object-relational mapping) - it has the small scope of "owning" the mapping of database driver relational result rows to properly structured business objects. This contrasts against "ORM"s as typically exist - where they have grown to intertwine a huge query builder API with the ORM layer, where mapped objects are database-connected and serve as the query builder.
2. PureORM yields pure (not database-connected) business objects. Queries are written in SQL (not niche library-specific ORM wrapper APIs), and the results are pure businesses objects.

Thus PureORM contrasts against traditional ORMs which use query builders (rather than raw SQL) to return database-connected (rather than pure) objects.

The name _**pure**ORM_ reflects both of these points - that it is _pure_ ORM (there is no query builder dimension) as well as the _purity_ of the mapped objects.

#### Philosophy

- Write _native_, _unobstructed_ SQL in a "data access layer" which returns _pure_ "business objects" to be used in the app's business logic.

#### Concepts

A **Business Object** is a pure javascript object corresponding to a table.

- They represent a row of the table data, but as pure javascript objects.
- They are not connected to the database.
- They are the subject of the app's business logic.
- They will be full of userland business logic methods.
- Their purity allows them to be easy to test/use.
- These are also referred to as "models".

A **Business Object Collection** is a group of business objects.

- If your query returns records for multiple business objects, a Business Object Collection will be created and returned.
- You can create a Business Object Collection class for your business objects (in cases where it is useful to have business methods on the collection entity, not just each model entity).

A **Data Access Layer** is a database-aware abstraction layer where native SQL is written.

- This is not an "expresion language" or "query builder". There are not hundreds of methods mapping the complexity, expressiveness, and nuance of SQL to class objects.
- Rather, is a data access layer in which native SQL is written, and which returns business objects (properly nested and structured).

## Practical Example

Lets take a practical example to see all this in action. Lets fill in the backend for a tiny rest server for a person.

Lets say we have a database with three tables: person, job, and employer. We want our rest server to return an payload like this for requests which the get method receive.

```javascript
// controllers/rest/person.js
const get = (req, res) => {
  const person = {
    id: 55,
    name: 'John Doe',
    jobs: {
      models: [
        {
          id: 277,
          personId: 55,
          employerId: 17,
          startDate: '2020-01-01',
          endDate: '2020-12-31',
          employer: {
            id: 17,
            name: 'Good Corp'
          }
        },
        {
          id: 278,
          personId: 55,
          employerId: 26,
          startDate: '2021-01-01',
          endDate: '2021-12-31',
          employer: {
            id: 26,
            name: 'Better Corp'
          }
        }
      ]
    }
  };
  res.json(person);
};
```

Based on the tables, I know exactly how to query for this:

```sql
SELECT *
FROM person
LEFT JOIN job on person.id = job.person_id
LEFT JOIN employer on job.employer_id = employer.id
WHERE id = 55;
```

I already know how to SQL, and don't want to spend the time mapping what I already know how to do onto a huge, niche, library-specific API.

However, using this query with a database driver would give me a bunch of flat result records, not one object that is properly structed/nested like I want in my code, and with collided fields (id from all three tables, name from person and employer, etc).

So, lets install PureORM and the database driver and get started!

### Step 1: Installing PureORM and the Database Driver

For our example, we'll assume postgres database so we'll use the incredible [pg-promise](https://github.com/vitaly-t/pg-promise) database driver.

```bash
npm install --save pure-orm
npm install --save pg-promise
```

### Step 2: Creating the Business Objects

Let's create a `/business-objects` directory of business object classes for our database tables. These classes need to implement a static getter for `tableName` and `sqlColumnsData` to denote the database table and columns.

```javascript
// business-objects/person.js
class Person {
  static get tableName() {
    return 'person';
  }
  static get sqlColumnsData() {
    return ['id', 'name'];
  }
  // any other business methods...
}
module.exports = Person;
```

```javascript
// business-objects/job.js
const Person = require('./person');
const Employer = require('./employer');

class Job {
  static get tableName() {
    return 'job';
  }
  static get sqlColumnsData() {
    return [
      'id',
      { column: 'person_id', references: Person },
      { column: 'employer_id', references: Employer },
      'start_date',
      'end_date'
    ];
  }
  // any other business methods...
}
module.exports = Job;
```

```javascript
// business-objects/employer.js
class Employer {
  static get tableName() {
    return 'employer';
  }
  static get sqlColumnsData {
    return ['id', 'name'];
  }
  // any other business methods...
}
module.exports = Employer;
```

We've not got our three business object classes. To review, each business object class has:

- A static `tableName` getter to denote which table results this class is for.
- A static `sqlColumnsData` getter to enumerate the table columns.

### Step 3: Creating our ORM

First we create our database driver:

```javascript
// ./factories/db.js
const pgPromise = require('pg-promise');
const pgp = pgPromise();
module.exports = pgp({
  host: process.env.DB_HOSTNAME,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD
});
```

We can now create our ORM, which layers atop the database driver to do the object relational mapping of raw sql row data to nest objects. (Besides using the `db` instance directly, the orm also offers access to the db directly (`orm.db`) for anytime this object relational mapping isn't desired.

```javascript
// factories/orm.js
const { create } = require('pure-orm');
const db = require('./db');
const Person = require('../business-objects/person');
const Job = require('../business-objects/job');
const Employer = require('../business-objects/employer');

const orm = create({
  db,
  getBusinessObjects: () => [Person, Job, Employer]
});
module.exports = orm;
```

### Step 4: Creating our Data Access Layer

Let's now create a data access directory with a person file for data access operations related to a person.

```javascript
// data-access/person.js
const orm = require('../factories/orm');

const getPerson({ id }) {
  const query = `
    SELECT
      ${orm.tables.person.columns},
      ${orm.tables.job.columns},
      ${orm.tables.employer.columns}
    FROM person
    LEFT JOIN job on person.id = job.person_id
    LEFT JOIN employer on job.employer_id = employer.id
    WHERE id = $(id)
  `;
  return orm.one(query, { id });
}
module.exports = getPerson;
```

Some things to note:

- Our data access function returns a single Person business object which is properly structured from the many relational row records!
- Our query is executed with a `one` method. The ORM methods for `one`, `oneOrNone`, `many`, `any` ensure their count against the number of generated top level business objects - not the number of relational row records the sql expression returns!
- Rather than manually specifying our columns in the sql select expression, we used the orm's getter for columns. This is purely a convenience method which namespaces each column with the table name prefix to ensure column names don't collide (for example, the person, job, and employer `id`s would collide if not namespaced, as would person and employer `name`s). You are welcome to do this by hand instead of using this convenience if you don't mind the tedium:
  ```javascript
  // data-access/person.js
  const getPerson = ({ id }) => {
    // Example showing you can manually specify the select expression fields
    // instead of using the orm's columns getter.
    // Note: you must namespace the field with table name and hashtag.
    const query = `
      SELECT
        person.id as "person#id",
        person.name as "person#name",
        job.id as "job#id",
        job.person_id: "job#person_id",
        job.employer_id: "job#employer_id",
        job.start_date: "job#start_date",
        job.end_date: "job#end_date",
        employer.id as "employer#id",
        employer.name as "employer#name"
      FROM person
      LEFT JOIN job on person.id = job.person_id
      LEFT JOIN employer on job.employer_id = employer.id
      WHERE id = $(id)
    `;
    return orm.one(query, { id });
  };
  ```

### Step 5: Writing the Controller Code

We can now return to our controller code, and use our person data access function.

```diff
// controllers/rest/person.js
+const { getPerson } = require('../../data-access/person');
const renderProfile = (req, res) => {
- const person = {
-   id: 55,
-   name: 'John Doe',
-   jobs: {
-     models: [
-       {
-         id: 277,
-         personId: 55,
-         employerId: 17,
-         startDate: '2020-01-01',
-         endDate: '2020-12-31',
-         employer: {
-           id: 17,
-           name: 'Good Corp',
-         }
-       },
-       {
-         id: 278,
-         personId: 55,
-         employerId: 26,
-         startDate: '2021-01-01',
-         endDate: '2021-12-31',
-         employer: {
-           id: 26,
-           name: 'Better Corp',
-         }
-       }
-     ]
-   }
- };
+ const person = getPerson({ id: req.params.id });
  res.render('profile.html', person);
```

That's it! This controller code now works! The `getPerson` function returns a properly structured business object as we desire.

## FAQ

### Can you show a more complex business object and collection?

```javascript
// business-objects/library.js
const Libraries = require('./libraries');
class Library {
  get BoCollection() {
    return Libraries;
  }
  static get tableName() {
    return 'library_v2';
  }
  static get displayName() {
    // If we didn't provide this static field, in javascript an object
    // referencing a library bo would use `libraryV2` as the property name.
    return 'library';
  }
  static get sqlColumnsData() {
    return [
      'id',
      'name',
      { column: 'is_ala_member', property: 'isALAMember' },
      { column: 'address', references: Address }
    ];
  }
  aBussinessObjectMethod() {}
  anotherBussinessObjectMethod() {}
}
```

```javascript
// business-objects/libraries.js
class Library {
  static get Bo() {
    return require('./person'); // eslint-disable-line
  }
  static get displayName() {
    // If we didn't provide this static field, in javascript an object
    // referencing this collection would use `librarys` as the property name.
    return 'libraries';
  }
  aCollectionMethod() {}
  anotherCollectionMethod() {}
}
```

### If I use PureORM do I have to re-invent all the super basic CRUD methods?

The goal of PureORM is to foster writing SQL and receiving pure business objects. That said, some SQL is so common that we preload the created ORM with with some basic CRUD operations.

For example, rather than every entity needing data access operatons for get, create, etc method, you can use built-in orm functions.

```javascript
// controllers/rest/person.js
const get = (req, res) => {
  if (req.params.id) {
    return res.json(await orm.getMatching(new Person({ id })));
  }
  if (req.query.name) {
    return res.json(
      await orm.getAnyMatching(new Person({ name: req.query.name }))
    );
  }
  res
    .status(404)
    .json({ error: 'Please specify an id or provide a name filter' });
};
```

At any point you can ditch these built-ins and write some SQL in a data access function.

```javascript
// controllers/rest/person.js
const { getPerson, getPeopleWithName } = require('../../data-access/person');
const get = (req, res) => {
  if (req.params.id) {
    return res.json(await getPerson(id));
  }
  if (req.query.name) {
    return res.json(await getPeopleWithName(req.query.name));
  }
  res
    .status(404)
    .json({ error: 'Please specify an id or provide a name filter' });
};
```

### Whare are the tradeoffs that PureORM makes in using SQL instead of a query builder API?

Traditional/stateful ORMs offer a dialetic-generic, chainable object api for expressing underlying SQL - thus solving for database "lock-in" as well the inability of string queries compose easily. PureORM takes the approach that the tradeoff of developers having to learn the huge surface area of of a query builder, and having to map the complexity and nuance of SQL to it, are simply not worth the cost, and so is premised on not using a query building library. PureORM sees writing straight SQL heaviliy as a feature, not a defect needing solved, and not eclipsed by the composibility of a query builder.

### Will I then have dozens of similar data access functions, since strings aren't as composable as stateful ORM builder builder APIs?

There is still a lot of composibility possible with functions returning strings (someone create an Issue if you want to see examples used in the Kujo codebase), but in general yes, there is more repitition. Most of this remaining repitition is not something I think is a defect (though those obsessed with DRY would disagree). The only "defect" of this repitition is that there may be more than one similiar method (for example a "get" that does certain joins vs others), and differentiating the large query in a function name can be lengthy/annoying. In these cases where composing functions doesn't bring the number of similar functions methods to only one, rather than distilling these large queries into the function name (eg, getPersonWithJobsAndEmployers), I usually just opt for a small arbitrary hash at the end of the short name (eg, getXTW instead of getPersonWithJobsAndEmployers, getRJF instead of getPersonWithFriendsLocatedNearANewFriendRequest, etc).

### Does PureORM abstract away the database driver?

No, the whole premise of PureORM is to offer a library to aid the use of writing SQL. The datebase driver is always available to you (at `orm.db`) if you wish to use it directly with no PureORM mappings, or just import it. In my experience, a small percentage of highly complex queries looking for sums or counts in my data access layer use the database driver directly.

The only difference is how the SQL is invoked: `orm.one(query, {})` vs `orm.db.one(query, {})`

### Can I use aggregate functions while still using the PureORM mapping?

Yes, if you'd like to get the mapping while also passing through some select expressions, use the special meta prefix. For example:

```javascript
const getBloggerPayout = ({ id, startDate, endDate }) => {
  const query = `
    SELECT
      ${orm.tables.person.columns},
      COALESCE(SUM(article.blogger_payout), 0) as meta_amount
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
  return orm.one(query, { id, startDate, endDate });
};
```

## Comparisons

Low Level Abstractions

- **Database Drivers** (eg [node-postgres](https://github.com/brianc/node-postgres), [mysql](https://github.com/mysqljs/mysql), [node-sqlite3](https://github.com/mapbox/node-sqlite3), [node-mssql](https://github.com/tediousjs/node-mssql), [node-oracledb](https://github.com/oracle/node-oracledb)) - These are powerful low level libraries that handle connecting to a database, executing raw SQL, and returning raw rows. All the higher level abstractions are built on these. `PureORM` like "stateful ORMs" are built on these.

Stateful ORMs (comprised of two portions)

- **Query Builders** (eg [knex](https://github.com/tgriesser/knex)) - These (built on database drivers) offer a dialetic-generic, chainable object api for expressing underlying SQL - thus solving for database "lock-in" as well the inability to compose SQL queriers as strings. PureORM takes the approach that the tradeoff of developers having to learn the huge surface area of dialetic-generic api, and having to map the complexity and nuance of SQL to it, are simply not worth the cost, and so does not use a query building library. With PureORM you just write SQL. The tradeoff on PureORM side that is indeed being tied to a sql dialect and in the inability to compose sql expressions (strings don't compose nicely). Yet all this considered, PureORM sees writing straight SQL heaviliy as a feature, not a defect needing solved, and not eclipsed by the composibility of a query builder.

- **Stateful, Database Aware Objects** (eg [sequelize](https://github.com/sequelize/sequelize), [waterline](https://github.com/balderdashy/waterline), [bookshelf](https://github.com/bookshelf/bookshelf), [typeorm](https://github.com/typeorm/typeorm)) - These stateful, database-aware object libraries are the full embrace of "Stateful ORMs". Contrary to this these is PureORM which yields pure, un-attached, structured objects.

PureORM

- PureORM is more than just the preference against the query builder portion of Stateful ORMs
- PureORM is the preference against stateful, db-connected objects: PureORM resolves result rows to _pure_ business objects. This purity in business objects fosters a clean layer of the business layer from the data access layer, as well as ensuring the very best in performance (eg, the [N+1 problem](https://docs.sqlalchemy.org/en/13/glossary.html#term-n-plus-one-problem) can't exist with pure objects).

## API

### Functions

#### `create`

```typescript
function create(options: {
  getBusinessObjects: () => Array<new () => PureORMEntity>;
  db: DataBaseDriver;
}): PureORM;
```

The factory function for creating your ORM.

**Parameters**

- `getBusinessObjects: () => Array<PureORMEntity>` - A function which returns an array of all the business object classes (where each business object must implement `PureORMEntity`).
- `db: <DataBaseDriverInstance>` - A database driver instance.

**Return Value**

Your `PureORM` instance.

### Interfaces

#### `PureORM`

```typescript
interface PureORM {
  one: (query: string, params: object) => PureORMEntity;
  oneOrNone: (query: string, params: object) => PureORMEntity | void;
  many: (query: string, params: object) => Array<PureORMEntity>;
  any: (query: string, params: object) => Array<PureORMEntity> | void;
  none: (query: string, params: object) => void;
  getMatching: (bo: PureORMEntity) => PureORMEntity;
  getOneOrNoneMatching: (bo: PureORMEntity) => PureORMEntity | void;
  getAnyMatching: (bo: PureORMEntity) => Array<PureORMEntity> | void;
  getAllMatching: (bo: PureORMEntity) => Array<PureORMEntity>;
  create: (bo: PureORMEntity) => PureORMEntity;
  update: (bo: PureORMEntity) => PureORMEntity;
  delete: (bo: PureORMEntity) => void;
  deleteMatching: (bo: PureORMEntity) => void;
  tables: Array<new () => PureORMEntity>;
}
```

It has the following query methods:

- `one(query: string, params: object)` - executes a query and returns a Bo, or throws.
- `oneOrNone(query: string, params: object)` - executes a query and returns a Bo or undefined, or throws.
- `many(query: string, params: object)` - executes a query and returns a BoCollection with at least one model, or throws.
- `any(query: string, params: object)` - executes a query and returns a BoCollection.
- `none(query: string, params: object)` - executes a query and returns null.

(Note these orm query methods ensure their count against the number of generated top level business objects are created - not the number of relational rows returned from the database driver! Thus, for example, `one` understands that there may be multiple result rows (which a database driver's `one` query method would throw at) but which correctly nest into one PureORMEntity.)

Built-in "basic" / generic crud functions

- `getMatching: (bo: PureORMEntity) => PureORMEntity`
- `getOneOrNoneMatching: (bo: PureORMEntity) => PureORMEntity | void`
- `getAnyMatching: (bo: PureORMEntity) => Array<PureORMEntity> | void`
- `getAllMatching: (bo: PureORMEntity) => Array<PureORMEntity>`
- `create: (bo: PureORMEntity) => PureORMEntity`
- `update: (bo: PureORMEntity) => PureORMEntity`
- `delete: (bo: PureORMEntity) => void`
- `deleteMatching: (bo: PureORMEntity) => void`

These are just provided because they are so common and straight-forward. While the goal of this library is foster writing SQL in your data access layer (which returns pure business objects) some CRUD operations are so common they are included in the ORM. Feel free to completely disregard if you want to write these in your data access layer yourself.

### Interfaces

#### `PureORMEntity`

An interface which your business object classes need to implement.

- `static get tableName(): string` - Returns the string table name which the business object associates with from the database.
- `static get sqlColumnsData(): Array<string|ColumnData>` - Returns an array of the database column data. The type is either:
  - `ColumnData {column, property?, references?, primaryKey?}`
    - `column: string` - The sql column name
    - `propery: string` - The javascript property name for this column (defaults to camelCase of `column`)
    - `references: PureORMEntity` - The relationship to another PureORMEntity (defaults to null)
    - `primaryKey: boolean` - Is this column (part of) the primary key (defaults to false)
  - `string` - If a string, it is applied as the `column` value, with all others defaulted.
  - (Note: if there is no primary key, `id` is defaulted)
- `get BoCollection()?: BoCollection` - (Optional) returns the business object collection class constructor.
- `static get displayName()?: string` - (Optional) returns the string display name of the business object (defaults to camelcase of tableName)

#### `PureORMCollection`

An interface which your collection business object classes need to implement.

- `static get Bo(): PureORMEntity` - Returns the individual (singular) business object class constructor.
- `get displayName()?: string` - (Optional) returns the string display name of the business object collection (defaults to PureORMEntity displayName with an "s")

## Current Status

#### Current Limitations (PRs welcome!)

- `pg-promise`/`node-postgres` is the only database driver supported out-of-the-box. There is not technical reason for this, other than that the project I'm using has a postgres database and so I only had `pg-promise` in mind. We could support more database drivers out of the box.
- there must be a clear path in the "select" to your leaf joined-to-entities (eg, (Good): Article, ArticleTag, Tag, TagModerator, Moderator; not (Bad): Article, Moderator).
- the result of _the select_ must always be a non-circular tree (eg, (Bad): Article, Person, Group, GroupArticle, Article)

#### Current Todos (PRs welcome!):

- Performance. While the API has been somewhat thought through and iterated on to this point, the implementation details have been secondary, knowing that they can be perfected in time. Probably about time now.
- Add more tests
- Known Bug: if a table references the same table twice, the first one is found as the nodePointingToIt and so ends up throwing.
  - ideally the fix to this will change the behavior of when a table points to another table by another name (author_id -> person)

#### Is it production ready?

It is in production at [www.kujo.com](https://www.kujo.com) - powering the marketing pages and blog, as well as the customer, affiliate, and admin platforms (behind login). When considering for your case, note the Current Limitations and TODOs sections above.
