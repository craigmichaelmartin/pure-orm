import { IModel, ICollection } from '../core';
import { ICreateForDriverOptions, ICoreIntegratedDriver } from './index';

export const createForPGP = ({
  core,
  db,
  logError
}: ICreateForDriverOptions): ICoreIntegratedDriver => {
  const defaultErrorHandler = (err: Error) => {
    if (!(err.name === 'QueryResultError')) {
      if (logError) {
        logError(err);
      }
    }
    throw err;
  };

  /* ------------------------------------------------------------------------*/
  /* Query functions --------------------------------------------------------*/
  /* ------------------------------------------------------------------------*/

  const one = <T extends IModel>(
    query: string,
    values?: object,
    errorHandler = defaultErrorHandler
  ): Promise<T> => {
    return db
      .many(query, values)
      .then((rows: any) => core.createOneFromDatabase(rows))
      .catch(errorHandler);
  };

  const oneOrNone = <T extends IModel>(
    query: string,
    values?: object,
    errorHandler = defaultErrorHandler
  ): Promise<T | void> => {
    return db
      .any(query, values)
      .then((rows: any) => core.createOneOrNoneFromDatabase(rows))
      .catch(errorHandler);
  };

  const many = <T extends ICollection<IModel>>(
    query: string,
    values?: object,
    errorHandler = defaultErrorHandler
  ): Promise<T> => {
    return db
      .any(query, values)
      .then((rows: any) => core.createManyFromDatabase(rows))
      .catch(errorHandler);
  };

  const any = <T extends ICollection<IModel>>(
    query: string,
    values?: object,
    errorHandler = defaultErrorHandler
  ): Promise<T | void> => {
    return db
      .result(query, values)
      .then((result: any) => {
        const name = result.fields[0].name;
        const hashIndex = name.indexOf('#');
        return core.createAnyFromDatabase(
          result.rows,
          hashIndex === -1 ? name : name.substring(0, hashIndex)
        );
      })
      .catch(errorHandler);
  };

  const none = (
    query: string,
    values?: object,
    errorHandler = defaultErrorHandler
  ): Promise<void> => {
    return db
      .none(query, values)
      .then(() => null)
      .catch(errorHandler);
  };

  return Object.assign({}, core, {
    // Query Functions
    one,
    oneOrNone,
    many,
    any,
    none,
    // provide direct access to db
    db
  });
};
