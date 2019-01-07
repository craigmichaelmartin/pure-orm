const camelCase = require('camelcase');

module.exports = ({ tableData }) => class Base {
  constructor(props) {
    Object.assign(this, props);
    const relationships = Object.keys(props).reduce((obj, prop) => {
      if (tableData.names.indexOf(prop) > -1) {
        if (tableData.singleToCollection[prop]) {
          // I *think* the above line is safe, since this is for relationships and not own
          // if (props[prop] && Array.isArray(props[prop].id)) {
          const BoConstructor = tableData.singleToCollection[prop];
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
          const BoConstructor = tableData.map[prop];
          const propCamel =
            BoConstructor.displayName ||
            prop.charAt(0).toLowerCase() + prop.slice(1);
          const params = BoConstructor.parseSqlColumns(props[prop]);
          obj[propCamel] = new BoConstructor(params);
        }
      } else if (tableData.collectionsNames.indexOf(prop) > -1) {
        const BoConstructor = tableData.collectionsMap[prop];
        obj[prop] = new BoConstructor(
          BoConstructor.parseFromObjects(props[prop])
        );
      }
      return obj;
    }, {});
    Object.assign(this, relationships);
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
    const customsObj = Object.keys(cols)
      .reduce(
        (accum, key) =>
          key.indexOf('meta') === 0
            ? {...accum, [camelCase(key)]: cols[key]}
            : accum,
        {}
      );
    return {...normalObj, ...customsObj};
  }

  static processFromDatabase(result) {
    return Object.keys(result).reduce((obj, column) => {
      const tableName = column.indexOf('#') > -1 ? column.split('#')[0] : this.tableName;
      const propertyName = column.indexOf('#') > -1 ? column.split('#')[1] : column;
      obj[tableName] = obj[tableName] || {};
      obj[tableName][propertyName] = result[column];
      return obj;
    }, {});
  }

  static parseFromDatabase(result) {
    // const tableData = require('../table-names'); // Needs to be here re: circular dep
    const processed = this.processFromDatabase(result);
    const own = this.parseSqlColumns(processed[this.tableName]);
    const relationshipObjects = Object.keys(processed).reduce(
      (obj, tableName) => {
        if (tableName !== this.tableName) {
          // obj[tableName] = tableData.map[tableName].parseSqlColumns(processed[tableName]);
          obj[tableName] = processed[tableName];
        }
        return obj;
      },
      {}
    );
    return Object.assign({}, own, relationshipObjects);
  }

  getSqlInsertParts() {
    const columns = this.c.sqlColumns
      .filter((column, index) => this[this.c.columns[index]] != null)
      .join(', ');
    const values = this.c.columns
      .map(column => this[column])
      .filter(value => value != null);
    const valuesVar = values.map((value, index) => `$${index + 1}`);
    return { columns, values, valuesVar };
  }

  getSqlUpdateParts() {
    const clauseArray = this.c.sqlColumns
      .filter((sqlColumn, index) => this[this.c.columns[index]] != null)
      .map((sqlColumn, index) => `${sqlColumn} = $${index + 1}`);
    const clause = clauseArray.join(', ');
    const idVar = `$${clauseArray.length + 1}`;
    const _values = this.c.columns
      .map(column => this[column])
      .filter(value => value != null);
    const values = [..._values, this.id];
    return { clause, idVar, values };
  }

  getMatchingParts() {
    const whereClause = this.c.columns
      .map((col, index) =>
        this[col] != null
          ? `"${this.c.tableName}".${this.c.sqlColumns[index]}`
          : null
      )
      .filter(x => x != null)
      .map((x, i) => `${x} = $${i + 1}`)
      .join(' AND ');
    const values = this.c.columns
      .map((col) => this[col] != null ? this[col] : null)
      .filter(x => x != null);
    return {whereClause, values};
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
    return this[this.c.columns[this.c.sqlColumns.indexOf(sqlColumn)]];
  }
};
