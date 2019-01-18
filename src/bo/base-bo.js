const camelCase = require('camelcase');

module.exports = ({ getTableData }) =>
  class Base {
    constructor(props, { tableMap, collectionsMap, singleToCollection } = {}) {
      const closureData = getTableData();
      this.tableMap = tableMap || closureData.tableMap;
      this.collectionsMap = collectionsMap || closureData.collectionsMap;
      this.singleToCollection =
        singleToCollection || closureData.singleToCollection;
      Object.assign(this, props);
      /*
      const relationships = Object.keys(props).reduce((obj, prop) => {
        if (Object.keys(this.tableMap).indexOf(prop) > -1) {
          if (this.singleToCollection[prop]) {
            // I *think* the above line is safe, since this is for relationships and not own
            // if (props[prop] && Array.isArray(props[prop].id)) {
            const BoConstructor = this.singleToCollection[prop];
            const items = Array.isArray(props[prop].id)
              ? props[prop].id.map((_, index) => {
                  return Object.keys(props[prop]).reduce((o, p) => {
                    o[p] = props[prop][p][index];
                    return o;
                  }, {});
                })
              : props[prop];
            obj[BoConstructor.name.toLowerCase()] = new BoConstructor(
              BoConstructor.parseFromObjects(items)
            );
          } else {
            const BoConstructor = this.tableMap[prop];
            const propCamel =
              BoConstructor.displayName ||
              prop.charAt(0).toLowerCase() + prop.slice(1);
            const params = BoConstructor.parseSqlColumns(props[prop]);
            obj[propCamel] = new BoConstructor(params);
          }
        } else if (Object.keys(this.collectionsMap).indexOf(prop) > -1) {
          const BoConstructor = this.collectionsMap[prop];
          obj[prop] = new BoConstructor(
            BoConstructor.parseFromObjects(props[prop])
          );
        }
        return obj;
      }, {});
      Object.assign(this, relationships);
      */
    }

    static primaryKey() {
      const primaryKey = this.sqlColumnsData.filter(x => x.primaryKey);
      return primaryKey.length > 0 ? primaryKey : ['id'];
    }

    static get columns() {
      return this.sqlColumnsData.map(x => x.property || camelCase(x.column || x));
    }

    static get sqlColumns() {
      return this.sqlColumnsData.map(x => x.column || x);
    }

    static get references() {
      return this.sqlColumnsData
        .filter(x => x.references)
        .reduce(
          (accum, item) => Object.assign({}, accum, {[item.column]: item.references}),
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

    /* Maps values from `sqlColumns` to `columns`. Can be overridden for more.
     * ^ Not sure about that, but now has additional "recognized"/"canonical"
     * fields for extra select fields, eg `..., count(*) as "utm_source#meta_occurence"`
     * */
    static parseSqlColumns(cols) {
      const sqlColumns = [...this.sqlColumns, 'meta_occurence'];
      const jsColumns = [...this.columns, 'metaOccurence'];
      const normalObj = sqlColumns.reduce((obj, col, index) => {
        obj[jsColumns[index]] = cols[col];
        return obj;
      }, {});
      const customsObj = Object.keys(cols).reduce(
        (accum, key) =>
          key.indexOf('meta') === 0
            ? { ...accum, [camelCase(key)]: cols[key] }
            : accum,
        {}
      );
      return { ...normalObj, ...customsObj };
    }

    static processFromDatabase(result) {
      const rtnval = Object.keys(result).reduce((obj, column) => {
        const tableName =
          column.indexOf('#') > -1 ? column.split('#')[0] : this.tableName;
        const propertyName =
          column.indexOf('#') > -1 ? column.split('#')[1] : column;
        obj[tableName] = obj[tableName] || {};
        obj[tableName][propertyName] = result[column];
        return obj;
      }, {});
      return rtnval;
    }

    /*
     * Make objects (based on special table#column names) from flat database
     * return value.
     */
    static objectifyDatabaseResult(result) {
      return Object.keys(result).reduce((obj, text) => {
        const tableName = text.indexOf('#') > -1 ? text.split('#')[0] : this.tableName;
        const column = text.indexOf('#') > -1 ? text.split('#')[1] : text;
        obj[tableName] = obj[tableName] || {};
        obj[tableName][column] = result[text];
        return obj;
      }, {});
    }

    static mapToBos(objectified) {
      return Object.keys(objectified).map(tableName => {
        const Bo = getTableData().tableMap[tableName];
        const propified = Object.keys(objectified[tableName]).reduce(
          (obj, column) => {
            obj[Bo.columns[Bo.sqlColumns.indexOf(column)]] = objectified[tableName][column];
            return obj;
          },
          {}
        );
        return new Bo(propified);
      });
    }

    static flattenResult(array) {
      return Array.isArray(array)
        ? array.reduce((obj, item) => {
            Object.keys(item).forEach(key => {
              if (obj[key] == null) {
                obj[key] = item[key];
              } else if (
                Array.isArray(obj[key]) &&
                obj[key]
                  .map(x => JSON.stringify(x))
                  .indexOf(JSON.stringify(item[key])) === -1
              ) {
                obj[key] = [...obj[key], item[key]];
              } else if (
                JSON.stringify(obj[key]) !== JSON.stringify(item[key])
              ) {
                obj[key] = [obj[key], item[key]];
              }
            });
            return obj;
          }, {})
        : array;
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
        const id = this.primaryKey().map(key => item.find(x => x.Bo === this)[key]).join('@');
        accum[id] = accum[id] ? [...accum[id], item] : [item];
        return accum;
      }, {});
      return Object.values(clumps);
    }

    /*
     * Start at root and pull in any object where _id matches the object id
     * Look at _id of remaining id and patch them into the object tree.
     * When doing all this, use array once more than one
     * In:
     *  [
     *    [
     *      [Article {id: 32}, ArticleTag {id: 54}]
     *      [Article {id: 32}, ArticleTag {id: 55}]
     *    ]
     *    [
     *      [Article {id: 33}, ArticleTag {id: 56}]
     *    ]
     *  ]
     * Out:
     *  [
     *    Article {id: 32, ArticleTags articleTags: [ArticleTag {id: 54}, ArticleTag {id: 55}]
     *    Article {id: 33, ArticleTag {id: 56}]
     *  ]
     */
    static nestClumps(clumps) {
      return clumps.map(this.nestClump.bind(this));
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
      const built = {[root.Bo.displayName]: root};

      let nodes = [root];
      debugger;

      // Wowzer is this both CPU and Memory inefficient
      clump.forEach(array => {
        array.forEach(bo => {
          const nodePointingToIt = nodes.find(x =>
            Object.values(x.Bo.references).indexOf(bo.Bo) > -1
            && x[`${bo.Bo.displayName}Id`] === bo.id // Assumptions are being made here about property name and id ending
          );
          const nodeItPointsTo = nodes.find(x =>
            Object.values(bo.Bo.references).indexOf(x.Bo) > -1
            && bo[`${x.Bo.displayName}Id`] === x.id // Assumptions are being made here about property name and id ending
          );
          if (!(nodePointingToIt || nodeItPointsTo)) {
            throw Error(`Could not find how this BO fits: ${JSON.stringify(bo)}`);
          }
          if (nodePointingToIt) {
            nodePointingToIt[bo.Bo.displayName] = bo;
          } else {
            let collection = nodeItPointsTo[bo.BoCollection.displayName];
            if (collection) {
              collection.models.push(bo);
            } else {
              nodeItPointsTo[bo.BoCollection.displayName] = new bo.BoCollection({models: [bo]});
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
      const nested = this.nestClumps(clumps);
      return nested;
    }

    static createOneFromDatabase(_result) {
      const array = this.createFromDatabase(_result);
      if (array.length > 1) {
        throw Error('Got more than one.');
      }
      return Object.values(array[0])[0];
    }

    static parseFromDatabase(result) {
      const flattenedResult = this.flattenResult(result);
      const processed = this.processFromDatabase(flattenedResult);
      const own = this.parseSqlColumns(processed[this.tableName]);
      const relationshipObjects = Object.keys(processed).reduce(
        (obj, tableName) => {
          if (tableName !== this.tableName) {
            // obj[tableName] = map[tableName].parseSqlColumns(processed[tableName]);
            obj[tableName] = processed[tableName];
          }
          return obj;
        },
        {}
      );
      return Object.assign({}, own, relationshipObjects);
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
  };
