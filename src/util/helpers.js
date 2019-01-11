// Previously keys and values were parsed from the error string, but the
// presence of commas in the values section messed it up.  So now, it
// returns just gets the keys from the error message and gets the values
// from the business object (previously did not accept a business object).
const getColumnsValuesFromInsertErrorOLD = (error = '') => {
  let keys, values;
  try {
    const results = /.*Key.*\((.*)\)=.*\((.*)\).*/g.exec(error);
    const [, keyString, valueString] = results;
    keys = keyString.split(', ');
    values = valueString.split(', ');
  } catch (_err) {}
  return [keys, values];
};
void getColumnsValuesFromInsertErrorOLD;

const getColumnsValuesFromInsertError = (error = '', bo) => {
  let keys, values;
  try {
    const results = /.*Key.*\((.*)\)=.*\((.*)\).*/g.exec(error);
    const [, keyString] = results;
    keys = keyString.split(', ');
    values = keys.map(key => bo.getValueBySqlColumn(key));
  } catch (_err) {}
  return [keys, values];
};

module.exports.getColumnsValuesFromInsertError = getColumnsValuesFromInsertError;
