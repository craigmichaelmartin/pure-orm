import orm from '../factories/orm';
import { Person } from '../models/person';

export const getPerson = (id: number): Promise<Person> => {
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
  return orm.one<Person>(query, { id });
};
