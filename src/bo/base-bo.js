const camelCase = require('camelcase');

module.exports = ({ getTableData }) =>
  class Base {
    constructor(props, { tableMap } = {}) {
      const closureData = getTableData();
      this.tableMap = tableMap || closureData.tableMap;
      Object.assign(this, props);
    }

    static primaryKey() {
      const primaryKey = this.sqlColumnsData.filter(x => x.primaryKey);
      return primaryKey.length > 0 ? primaryKey : ['id'];
    }

    static get columns() {
      return this.sqlColumnsData.map(
        x => x.property || camelCase(x.column || x)
      );
    }

    static get sqlColumns() {
      return this.sqlColumnsData.map(x => x.column || x);
    }

    static get references() {
      return this.sqlColumnsData
        .filter(x => x.references)
        .reduce(
          (accum, item) =>
            Object.assign({}, accum, {
              [item.property || camelCase(item.column || item)]: item.references
            }),
          {}
        );
    }

    static get displayName() {
      return camelCase(this.tableName);
    }

    static getPrefixedColumnNames() {
      return this.sqlColumns.map(col => `${this.tableName}#${col}`);
    }

    static getSQLSelectClause() {
      return this.getPrefixedColumnNames()
        .map(
          (prefixed, index) =>
            `"${this.tableName}".${this.sqlColumns[index]} as "${prefixed}"`
        )
        .join(', ');
    }

    /*
     * Make objects (based on special table#column names) from flat database
     * return value.
     */
    static objectifyDatabaseResult(result) {
      return Object.keys(result).reduce((obj, text) => {
        const tableName =
          text.indexOf('#') > -1 ? text.split('#')[0] : this.tableName;
        const column = text.indexOf('#') > -1 ? text.split('#')[1] : text;
        obj[tableName] = obj[tableName] || {};
        obj[tableName][column] = result[text];
        return obj;
      }, {});
    }

    static mapToBos(objectified) {
      return Object.keys(objectified).map(tableName => {
        const Bo = getTableData().tableMap[tableName];
        if (!Bo) {
          throw Error(`No property in tableMap for "${tableName}"`);
        }
        const propified = Object.keys(objectified[tableName]).reduce(
          (obj, column) => {
            let propertyName = Bo.columns[Bo.sqlColumns.indexOf(column)];
            if (!propertyName) {
              if (column.startsWith('meta_')) {
                propertyName = camelCase(column);
              } else {
                throw Error(
                  `No property name for "${column}" in business object "${
                    Bo.displayName
                  }". Non-spec'd columns must begin with "meta_".`
                );
              }
            }
            obj[propertyName] = objectified[tableName][column];
            return obj;
          },
          {}
        );
        return new Bo(propified);
      });
    }

    /*
     * Clump array of flat objects into groups based on id of root
     * In:
     *  [
     *    [Article {id: 32}, ArticleTag {id: 54}]
     *    [Article {id: 32}, ArticleTag {id: 55}]
     *    [Article {id: 33}, ArticleTag {id: 56}]
     *  ]
     * Out:
     *  [
     *    [
     *      [Article {id: 32}, ArticleTag {id: 54}]
     *      [Article {id: 32}, ArticleTag {id: 55}]
     *    ]
     *    [
     *      [Article {id: 33}, ArticleTag {id: 56}]
     *    ]
     *  ]
     */
    static clumpIntoGroups(processed) {
      const clumps = processed.reduce((accum, item) => {
        const id = this.primaryKey()
          .map(key => item.find(x => x.Bo === this)[key])
          .join('@');
        if (accum.has(id)) {
          accum.set(id, [...accum.get(id), item]);
        } else {
          accum.set(id, [item]);
        }
        return accum;
      }, new Map());
      return [...clumps.values()];
    }

    /*
     * In:
     *  [
     *    [Article {id: 32}, ArticleTag {id: 54}]
     *    [Article {id: 32}, ArticleTag {id: 55}]
     *  ]
     * Out:
     *  Article {id: 32, ArticleTags articleTags: [ArticleTag {id: 54}, ArticleTag {id: 55}]
     */
    static nestClump(clump) {
      clump = clump.map(x => Object.values(x)); // clump wasn't actually what I have documented
      const root = clump[0][0];
      clump = clump.map(row => row.filter((item, index) => index !== 0));
      const built = { [root.Bo.displayName]: root };

      let nodes = [root];

      // Wowzer is this both CPU and Memory inefficient
      clump.forEach(array => {
        array.forEach(bo => {
          const nodePointingToIt = nodes.find(x => {
            const index = Object.values(x.Bo.references).indexOf(bo.Bo);
            if (index === -1) {
              return false;
            }
            const property = Object.keys(x.Bo.references)[index];
            return x[property] === bo.id;
          });
          const nodeItPointsTo = nodes.find(x => {
            const index = Object.values(bo.Bo.references).indexOf(x.Bo);
            if (index === -1) {
              return false;
            }
            const property = Object.keys(bo.Bo.references)[index];
            return bo[property] === x.id;
          });
          if (!(nodePointingToIt || nodeItPointsTo)) {
            if (!bo.getId()) {
              // If the join is fruitless; todo: add a test for this path
              return;
            }
            throw Error(
              `Could not find how this BO fits: ${JSON.stringify(bo)}`
            );
          }
          if (nodePointingToIt) {
            nodePointingToIt[bo.Bo.displayName] = bo;
          } else {
            let collection = nodeItPointsTo[bo.BoCollection.displayName];
            if (collection) {
              collection.models.push(bo);
            } else {
              nodeItPointsTo[bo.BoCollection.displayName] = new bo.BoCollection(
                { models: [bo] }
              );
            }
          }
          nodes = [bo, ...nodes];
        });
      });

      return built;
    }

    static createFromDatabase(_result) {
      const result = Array.isArray(_result) ? _result : [_result];
      const objectified = result.map(this.objectifyDatabaseResult.bind(this));
      const boified = objectified.map(this.mapToBos.bind(this));
      const clumps = this.clumpIntoGroups(boified);
      const nested = clumps.map(this.nestClump.bind(this));
      const models = nested.map(n => Object.values(n)[0]);
      return new new this().BoCollection({ models });
    }

    static createOneFromDatabase(_result) {
      const collection = this.createFromDatabase(_result);
      if (collection.models.length > 1) {
        throw Error('Got more than one.');
      } else if (collection.models.length === 0) {
        throw Error('Did not get one.');
      }
      return collection.models[0];
    }

    static createOneOrNoneFromDatabase(_result) {
      const collection = this.createFromDatabase(_result);
      if (collection.models.length > 1) {
        throw Error('Got more than one.');
      }
      return collection.models[0];
    }

    static createManyFromDatabase(_result) {
      const collection = this.createFromDatabase(_result);
      if (collection.models.length === 0) {
        throw Error('Did not get at least one.');
      }
      return collection;
    }

    getSqlInsertParts() {
      const columns = this.Bo.sqlColumns
        .filter((column, index) => this[this.Bo.columns[index]] != null)
        .join(', ');
      const values = this.Bo.columns
        .map(column => this[column])
        .filter(value => value != null);
      const valuesVar = values.map((value, index) => `$${index + 1}`);
      return { columns, values, valuesVar };
    }

    getSqlUpdateParts() {
      const clauseArray = this.Bo.sqlColumns
        .filter((sqlColumn, index) => this[this.Bo.columns[index]] != null)
        .map((sqlColumn, index) => `${sqlColumn} = $${index + 1}`);
      const clause = clauseArray.join(', ');
      const idVar = `$${clauseArray.length + 1}`;
      const _values = this.Bo.columns
        .map(column => this[column])
        .filter(value => value != null);
      const values = [..._values, this.id];
      return { clause, idVar, values };
    }

    getMatchingParts() {
      const whereClause = this.Bo.columns
        .map((col, index) =>
          this[col] != null
            ? `"${this.Bo.tableName}".${this.Bo.sqlColumns[index]}`
            : null
        )
        .filter(x => x != null)
        .map((x, i) => `${x} = $${i + 1}`)
        .join(' AND ');
      const values = this.Bo.columns
        .map(col => (this[col] != null ? this[col] : null))
        .filter(x => x != null);
      return { whereClause, values };
    }

    // This one returns an object, which allows it to be more versatile.
    // Todo: make this one even better and use it instead of the one above.
    getMatchingPartsObject() {
      const whereClause = this.Bo.columns
        .map((col, index) =>
          this[col] != null
            ? `"${this.Bo.tableName}".${this.Bo.sqlColumns[index]}`
            : null
        )
        .filter(x => x != null)
        .map((x, i) => `${x} = $(${i + 1})`)
        .join(' AND ');
      const values = this.Bo.columns
        .map(col => (this[col] != null ? this[col] : null))
        .filter(x => x != null)
        .reduce(
          (accum, val, index) => Object.assign({}, accum, { [index + 1]: val }),
          {}
        );
      return { whereClause, values };
    }

    getNewWith(sqlColumns, values) {
      const Constructor = this.c;
      const boKeys = sqlColumns.map(
        key => Constructor.columns[Constructor.sqlColumns.indexOf(key)]
      );
      const boData = boKeys.reduce((data, key, index) => {
        data[key] = values[index];
        return data;
      }, {});
      return new Constructor(boData);
    }

    getValueBySqlColumn(sqlColumn) {
      return this[this.Bo.columns[this.Bo.sqlColumns.indexOf(sqlColumn)]];
    }

    // Returns unique identifier of bo (the values of the primary keys)
    getId() {
      return this.Bo.primaryKey()
        .map(key => this[key])
        .join('');
    }
  };
