import { ICore, IModel, ICollection } from '../core';

export interface ICreateForDriverOptions {
  core: ICore;
  db: any;
  logError?: (err: Error) => never;
}

export interface ICoreIntegratedDriver extends ICore {
  db: any;

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
  ) => Promise<T>;

  // Execute a query returning either single model or undefined, or throws.
  oneOrNone: <T extends IModel>(
    query: string,
    values?: object,
    errorHandler?: (err: Error) => never
  ) => Promise<T | void>;

  // Execute a query returning a Collection with at least one model, or throws.
  many: <T extends ICollection<IModel>>(
    query: string,
    values?: object,
    errorHandler?: (err: Error) => never
  ) => Promise<T>;

  // Execute a query returning a Collection.
  any: <T extends ICollection<IModel>>(
    query: string,
    values?: object,
    errorHandler?: (err: Error) => never
  ) => Promise<T | void>;

  // Execute a query returning null.
  none: (
    query: string,
    values?: object,
    errorHandler?: (err: Error) => never
  ) => Promise<void>;
}
