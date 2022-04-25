import orm from '../orm';

export const getRandom = () => {
  const query = `
    SELECT ${orm.tables.person.columns}
    FROM person
    ORDER BY random()
    LIMIT 1;
  `;
  return orm.one(query);
};
