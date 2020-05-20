const utils = require('../utils');

const allowedProps = [
  'name',
  'in',
  'description',
  'required',
  'schema',
  'type',
  'format',
  'allowEmptyValue',
  'items',
  'collectionFormat',
  'default',
  'maximum',
  'exclusiveMaximum',
  'minimum',
  'exclusiveMinimum',
  'maxLength',
  'minLength',
  'pattern',
  'maxItems',
  'minItems',
  'uniqueItems',
  'enum',
  'multipleOf',
];

module.exports = (schemaObj, parameterType) => {
  const out = [];

  if (parameterType === 'body') {
    const item = {
      in: parameterType,
      name: 'body',
      schema: schemaObj,
    };

    out.push(item);
  } else {
    // object to array
    const keys = Object.keys(schemaObj.properties);
    keys.forEach((element, index) => {
      const key = keys[index];
      let item = schemaObj.properties[key];
      item.name = key;
      item.in = parameterType;

      // reinstate required at parameter level
      if (
        schemaObj.required &&
        (schemaObj.properties[key].required ||
          schemaObj.required.indexOf(key) > -1)
      ) {
        item.required = true;
      }
      if (schemaObj.optional && schemaObj.optional.indexOf(key) > -1) {
        item.required = false;
      }

      item = utils.removeProps(item, allowedProps);
      out.push(item);
    });
  }
  return out;
};
