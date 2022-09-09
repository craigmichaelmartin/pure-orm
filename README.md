# [PureORM](https://github.com/craigmichaelmartin/pure-orm)

## Installation

```bash
npm install --save pure-orm
```

## What is PureORM?

PureORM is a lightweight ORM for mapping the relational result rows of a database driver query to properly structured (nested) pure instances of your business object classes.

It's purpose - and guiding principle - is to allow you to write _native_, _unobstructed_ SQL (not niche library-specific ORM wrapper APIs) and receive back properly structured/nested pure business objects (not database-connected stateful objects).

#### What does this mean?

This means you can just write SQL like this:

```javascript
SELECT *
FROM person
LEFT JOIN job on person.id = job.person_id
LEFT JOIN employer on job.employer_id = employer.id
WHERE person.id = 55
```

and rather than getting flat, collided result objects:

| id | name | id | personId | employerId | startDate | endDate | id | name |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 55 | John Doe | 277 | 55 | 17 | 2020-01-01 | 2020-12-31 | 17 | Good Corp |
| 55 | John Doe | 278 |  55 | 26 | 2021-01-01 | 2021-12-31 | 26 | Better Corp |

you get properly structured/nested, pure objects like this:

```javascript
{
    id: 55,
    name: 'John Doe',
    jobs: {
      models: [
        {
          id: 277,
          personId: 55,
          employerId: 17,
          employer: {
            id: 17,
            name: 'Good Corp'
          },
          startDate: '2020-01-01',
          endDate: '2020-12-31'
        },
        {
          id: 278,
          personId: 55,
          employerId: 26,
          employer: {
            id: 26,
            name: 'Better Corp'
          },
          startDate: '2021-01-01',
          endDate: '2021-12-31'
        }
      ]
    }
  };
  ```

#### How does PureORM compare with traditional ORMs?

PureORM contrasts with tradtional ORMs in two important ways:

1. PureORM is purely the "orm" (object-relational mapping) - it has the small scope of "owning" the mapping of database driver relational result rows to properly structured business objects. This contrasts against ORMs as typically exist - where they have swelled to intertwine a huge query builder API with the ORM layer, where mapped objects are database-connected and serve as the query builder.
2. PureORM yields pure (not database-connected) models. Queries are written in SQL (not niche library-specific ORM wrapper APIs), and the results are pure businesses objects.

PureORM thus contrasts against traditional ORMs which use query builders (rather than raw SQL) to return database-connected (rather than pure) objects. The name _**pure**ORM_ reflects both of these points - that it is _pure_ ORM (there is no query builder dimension) as well as the _purity_ of the mapped models.

#### So I bring my own database driver?

Yep! PureORM is the top layer for interfacing with your database. You bring your own database driver (eg [node-postgres](https://github.com/brianc/node-postgres)/[pg-promise](https://github.com/vitaly-t/pg-promise), [mysql](https://github.com/mysqljs/mysql), [node-sqlite3](https://github.com/mapbox/node-sqlite3), [node-mssql](https://github.com/tediousjs/node-mssql), [node-oracledb](https://github.com/oracle/node-oracledb), etc), and PureORM works on top of it to perform the Object-Relational Mapping (ORM).

## Practical Example

Lets take a practical example to see all this in action. Lets fill in the backend for a tiny rest server for a person.

Lets say we have a database with three tables: person, job, and employer. We want our rest server to return an payload like this for requests which the get method receive.

```typescript
// app.ts
import express, { Express, Request, Response } from 'express';

const app: Express = express();
const port = process.env.PORT;

app.get('/rest/person', (req: Request, res: Response) => {
  const person = {
    id: 55,
    name: 'John Doe',
    jobs: {
      models: [
        {
          id: 277,
          personId: 55,
          employerId: 17,
          employer: {
            id: 17,
            name: 'Good Corp'
          },
          startDate: '2020-01-01',
          endDate: '2020-12-31'
        },
        {
          id: 278,
          personId: 55,
          employerId: 26,
          employer: {
            id: 26,
            name: 'Better Corp'
          },
          startDate: '2021-01-01',
          endDate: '2021-12-31'
        }
      ]
    }
  };
  res.json(person);
});

app.listen(port);
```

Based on the tables with this data:

**Person**
| id | name |
| --- | --- |
| 55 | John Doe |

**Employer**
| id | name |
| --- | --- |
| 17 | Good Corp |
| 26 | Better Corp |

**Job**
| id | personId | employerId | startDate | endDate |
| --- | --- | --- | --- | ---|
| 277 | 55 | 17 | 2020-01-01 | 2020-12-31 |
| 278 | 55 | 26 | 2021-01-01 | 2021-12-31 |

I know exactly how I want to query for it:

```sql
SELECT *
FROM person
LEFT JOIN job on person.id = job.person_id
LEFT JOIN employer on job.employer_id = employer.id
WHERE person.id = 55;
```

I already know how SQL, and don't want to spend the time mapping what I already know how to do onto a huge, niche, library-specific API.

However, using this query with a database driver would give me a bunch of flat result records (not one object that is properly structed/nested) and with collided fields (id from all three tables, name from person and employer, etc).

So, lets install PureORM and the database driver and get started!

### Step 1: Installing PureORM and the Database Driver

For our example, we'll assume postgres database so we'll use the incredible [pg-promise](https://github.com/vitaly-t/pg-promise) database driver.

```bash
npm install --save pure-orm
npm install --save pg-promise
```

### Step 2: Creating the Business Objects

Let's create a `/models` directory, with a file corresponding to each table. These modules contain the model and (optionally) collection classes we want to use when mapping our flat results to business objects, as well as the `tableName` and `columns` fields. We'll end up passing all this to the PureORM factory later.

```typescript
// models/person.ts
import { IModel, ICollection, IColumns, IEntity } from 'pure-orm';

export const tableName: string = 'person';

export const columns: IColumns = ['id', 'name'];

export class Person implements IModel {
  id: number;
  name: string;
  constructor(props) {
    this.id = props.id;
    this.name = props.name;
  }
  // any business methods...
}

export const personEntity: IEntity = { tableName, columns, Model: Person };
```

```typescript
// models/job.ts
import { IModel, ICollection, IColumns, IEntity } from 'pure-orm';
import { Person } from './person';
import { Employer } from './employer';

export const tableName: string = 'job';

export const columns: IColumns = [
  'id',
  { column: 'person_id', references: Person },
  { column: 'employer_id', references: Employer },
  'start_date',
  'end_date'
];

export class Job implements IModel {
  id: number;
  personId: number;
  person?: Person;
  employerId: number;
  employer: Employer;
  startDate: Date;
  endDate: Date;
  constructor(props) {
    this.id = props.id;
    this.personId = props.personId;
    this.person = props.person;
    this.employerId = props.employerId;
    this.employer = props.employer;
    this.startDate = props.startDate;
    this.endDate = props.endDate;
  }
  // any business methods...
}

export const JobEntity: IEntity = { tableName, columns, Model: Job };
```

```typescript
// models/employer.ts
import { IModel, ICollection, IColumns, IEntity } from 'pure-orm';

export const tableName: string = 'employer';

export const columns: IColumns = ['id', 'name'];

export class Employer implements IModel {
  id: number;
  name: string;
  constructor(props: IEmployerProps) {
    this.id = props.id;
    this.name = props.name;
  }
  // any business methods...
}

export const EmployerEntity: IEntity = { tableName, columns, Model: Employer };
```

### Step 3: Creating our ORM

First we create our database driver:

```typescript
// ./factories/db.ts
import pgPromise from 'pg-promise';
const pgp = pgPromise();
const connectionObject = {
  host: process.env.DB_HOSTNAME,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD
};
export const db = pgp(connectionObject);
```

We can now create our ORM, which layers atop the database driver to do the object relational mapping of raw sql row data to nest objects. (Besides using the `db` instance directly, the orm also offers access to the db directly (`orm.db`) for anytime this object relational mapping isn't desired.

```typescript
// factories/orm.ts
import { create } from 'pure-orm';
import { db } from './db';
import { personEntity } from '../models/person';
import { jobEntity } from '../models/job';
import { employerEntity } from '../models/employer';
const orm = create({
  entities: [personEntity, jobEntity, employerEntity],
  db
});
export default orm;
```

### Step 4: Creating our Data Access Layer

Let's now create a data access directory with a person file for data access operations related to a person.

```typescript
// data-access/person.ts
import orm from '../factories/orm';
import { Person } from '../models/person';

export const getPerson = (id: number): Person => {
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
};
```

Some things to note:

- Our data access function returns a single Person model which is properly structured from the many relational row records!
- Our query is executed with a `one` method. The ORM methods for `one`, `oneOrNone`, `many`, `any` ensure their count against the number of generated top level models - not the number of relational row records the sql expression returns!
- Rather than manually specifying our columns in the sql select expression, we used the orm's getter for columns. This is purely a convenience method which namespaces each column with the table name prefix to ensure column names don't collide (for example, the person, job, and employer `id`s would collide if not namespaced, as would person and employer `name`s). You are welcome to do this by hand instead of using this convenience if you don't mind the tedium:

  ```typescript
  // data-access/person.ts
  import orm from '../factories/orm';
  import { Person } from '../models/person';

  const getPerson(id) {
    // Example showing you can manually specify the select expression fields
    // instead of using the orm's columns getter.
    // Note: you must namespace the field with table name and hashtag.
    const query = `
      SELECT
        person.id as "person#id",
        person.name as "person#name",
        job.id as "job#id",
        job.person_id as "job#person_id",
        job.employer_id as "job#employer_id",
        job.start_date as "job#start_date",
        job.end_date as "job#end_date",
        employer.id as "employer#id",
        employer.name as "employer#name"
      FROM person
      LEFT JOIN job on person.id = job.person_id
      LEFT JOIN employer on job.employer_id = employer.id
      WHERE id = $(id)
    `;
    return orm.one(query, { id });
  }
  module.exports = getPerson;
  ```

### Step 5: Writing the Controller Code

We can now return to our controller code, and use our data access function.

```diff
// app.ts
import express, { Express, Request, Response } from 'express';
+import { getPerson } from './data-access/person';

const app: Express = express();
const port = process.env.PORT;

app.get('/rest/person', (req: Request, res: Response) => {
- const person = {
-   id: 55,
-   name: 'John Doe',
-   jobs: {
-     models: [
-       {
-         id: 277,
-         personId: 55,
-         employerId: 17,
-         employer: {
-           id: 17,
-           name: 'Good Corp'
-         },
-         startDate: '2020-01-01',
-         endDate: '2020-12-31'
-       },
-       {
-         id: 278,
-         personId: 55,
-         employerId: 26,
-         employer: {
-           id: 26,
-           name: 'Better Corp'
-         },
-         startDate: '2021-01-01',
-         endDate: '2021-12-31'
-       }
-     ]
-   }
- };
+ const person = getPerson(req.params.id);
  res.json(person);
});

app.listen(port);
```

That's it! This controller code now works! The `getPerson` function returns a properly structured business object as we desire.

## API

### `create`

```typescript
function create(options: {
  entities: Array<IEntity>;
  db: DataBaseDriver;
}): PureORM;
```

The factory function for creating your ORM.

**Parameters**

- `entities: Array<IEntity>` - An array of all the business object class entity configuration objects.

  ```typescript
  interface IEntity<T extends IModel> {
    // the tablename in the database for the entity (EG: article_tag)
    tableName: string;
    // the name to use for the model in the structured results of other models
    // defaults to the camelcase of the tableName (EG: articleTag)
    displayName?: string;
    // the name to use for the collection in the structured results of other models
    // defaults to adding an "s" to the displayName (EG: articleTags)
    collectionDisplayName?: string;
    // the column specs for the table (see interferface below)
    columns: IColumns;
    // the pure business object to use for result data
    Model: new (props: any) => T;
    // the pure business object to use for result collection data
    Collection: new ({ models }: any) => ICollection<T>;
  }

  // the interface for the `columns` property of the Entity interface.
  // is usually an array of the column data, but can be a function which
  // returns they array of column data (which is used to avoid circular
  // dependency issues when two entities reference each other).
  type IColumns = Array<IColumn> | (() => Array<IColumn>);

  // the column can just be a string (EG: 'id', 'value, 'label') which is
  // understood to be the column name, or it can be an IColumnData object.
  type IColumn = string | IColumnData;

  // an object to specify more than just the column name
  interface IColumnData {
    // the name of the column (EG: is_active)
    column: string;
    // the name to be used in the pure business object model
    // (defaults to the camelcase of the column, EG: isActive)
    property?: string;
    // the model this column references as a foreign key
    references?: new (props: any) => IModel;
    // whether this column is a primary key
    primaryKey?: boolean;
  }
  ```

- `db: <DataBaseDriverInstance>` - A database driver instance.

**Return Value**

Your `PureORM` instance, which is of this interface:

```typescript
interface PureORM {
  /* ------------------------------------------------------------------------*/
  /* Query methods ----------------------------------------------------------*/
  /* ------------------------------------------------------------------------*/

  /* Note these query methods ensure their count against the number of
   * generated top level business objects which are created - not the number
   * of relational rows returned from the database driver! Thus, for example,
   * `one` understands that there may be multiple result rows (which a
   * database driver's `one` query method would throw at) but which correctly
   * nest into one Model.)
   */

  // Execute a query returning a single model, or throws.
  one: <T extends IModel>(
    query: string,
    values?: object,
    errorHandler?: (err: Error) => never
  ) => T;

  // Execute a query returning either single model or undefined, or throws.
  oneOrNone: <T extends IModel>(
    query: string,
    values?: object,
    errorHandler?: (err: Error) => never
  ) => T | void;

  // Execute a query returning a Collection with at least one model, or throws.
  many: <T extends ICollection<IModel>>(
    query: string,
    values?: object,
    errorHandler?: (err: Error) => never
  ) => T;

  // Execute a query returning a Collection.
  any: <T extends ICollection<IModel>>(
    query: string,
    values?: object,
    errorHandler?: (err: Error) => never
  ) => T | void;

  // Execute a query returning null.
  none: (
    query: string,
    values?: object,
    errorHandler?: (err: Error) => never
  ) => void;

  /* ------------------------------------------------------------------------*/
  /* Built-in basic CRUD functions ------------------------------------------*/
  /* ------------------------------------------------------------------------*/

  /* These are just provided because they are so common and straight-forward.
   * While the goal of this library is foster writing SQL in your data access
   * layer (which returns pure business objects) some CRUD operations are so
   * common they are included in the ORM. Feel free to completely disregard
   * if you want to write these in your data access layer yourself.
   */

  getMatching: <T extends IModel>(model: T) => T;
  getOneOrNoneMatching: <T extends IModel>(model: T) => T | void;
  getAnyMatching: <T extends ICollection<IModel>>(model: IModel) => T | void;
  getAllMatching: <T extends ICollection<IModel>>(model: IModel) => T;
  create: <T extends IModel>(model: T) => T;
  update: <T extends IModel>(model: T, options: { on: string }) => T;
  delete: <T extends IModel>(model: T) => void;
  deleteMatching: <T extends IModel>(model: T) => void;

  /* ------------------------------------------------------------------------*/
  /* Helpful Properties -----------------------------------------------------*/
  /* ------------------------------------------------------------------------*/

  /* The tables property gives access to the sql select clause string for
   * each entity based on it's `displayName`. This property can be used when
   * writing raw SQL as the select clause, which handles quoting column names
   * and namespacing them to the table to avoid collisions and as required
   * for PureORM mapping.
   */
  tables: { [key: string]: { columns: string } };
  db: DataBaseDriver;
}
```

## FAQ

### Can you show the business objects of a more complex entity?

```typescript
import { IModel, ICollection, IColumns, IEntity } from 'pure-orm';

export const tableName: string = 'library_v2';

export const columns: IColumns = [
  'id',
  'name',
  { column: 'is_ala_member', property: 'isALAMember' },
  { column: 'address_id', references: Address }
];

export const displayName = 'library';
export const collectionDisplayName = 'libraries';

interface ILibraryProps {
  id: number;
  name: string;
  isALAMember: string;
  addressId: number;
  address: Address;
}

export class Library implements IModel {
  id: number;
  name: string;
  constructor(props: ILibraryProps) {
    this.id = props.id;
    this.name = props.name;
    this.isALAMember = props.isALAMember;
    this.addressId = props.addressId;
    this.address = props.address;
  }
  aBussinessObjectMethod() {}
  anotherBussinessObjectMethod() {}
}

export class Persons implements ICollection<Person> {
  models: Array<Person>;
  constructor({ models }: any) {
    this.models = models;
    return this;
  }
  aCollectionMethod() {}
  anotherCollectionMethod() {}
}

export const personEntity: IEntity = {
  tableName,
  displayName,
  collectionDisplayName,
  columns,
  Model: Person,
  Collection: Persons
};
```

### If I use PureORM do I have to re-invent all the super basic CRUD methods?

The goal of PureORM is to foster writing SQL and receiving pure business objects. That said, some SQL is so common that we preload the created ORM with with some basic CRUD operations.

For example, rather than every entity needing data access operatons for get, create, etc method, you can use built-in orm functions.

```typescript
app.get('/rest/person', (req: Request, res: Response) => {
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

```typescript
import { getPerson, getPeopleWithName } from '../../data-access/person';

app.get('/rest/person', (req: Request, res: Response) => {
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

There is still a lot of composibility possible with functions returning strings (someone create an Issue if you want to see examples used in the Kujo codebase), but in general yes, there is more repitition. Most of this remaining repitition is not something I think is a defect (though those obsessed with DRY would disagree).

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

## Current Status

#### Current Todos (PRs welcome!):

- Performance. While the API has been somewhat thought through and iterated on to this point, the implementation details have been secondary, knowing that they can be perfected in time. Probably about time now.
- Add more tests
- Known Bug: if a table references the same table twice, the first one is found as the nodePointingToIt and so ends up throwing.
  - ideally the fix to this will change the behavior of when a table points to another table by another name (author_id -> person)

#### Is it production ready?

It is in production at [www.kujo.com](https://www.kujo.com) - powering the marketing pages and blog, as well as the customer, affiliate, and admin platforms (behind login). When considering for your case, note the Current Limitations and TODOs sections above.
