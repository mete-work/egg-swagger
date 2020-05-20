const _ = require('lodash');
const Joi = require('@hapi/joi');

const isJoi = joiObj => joiObj && Joi.isSchema(joiObj);

const isObject = obj => {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj === 'object' &&
    !Array.isArray(obj)
  );
};

const hasProperties = obj => {
  let key;
  for (key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return true;
    }
  }
  return false;
};

const getJoiLabel = joiBoj => _.get(joiBoj, '_flags.label');

const hasJoiChildren = joiObj => {
  if (!isJoi(joiObj)) {
    return false;
  }

  const byId = _.get(joiObj, '_ids._byId');
  const byKey = _.get(joiObj, '_ids._byKey');

  if (byId.size > 0) {
    return true;
  }

  if (byKey.size > 0) {
    return true;
  }

  return false;
};

const getArgByName = (array, name, key = undefined) => {
  if (Array.isArray(array)) {
    let len = array.length;
    while (len--) {
      if (array[len].name === name) {
        if (array[len].args) {
          if (key) {
            return array[len].args[key];
          } else {
            return Object.values(array[len].args)[0];
          }
        } else {
          return true;
        }
      }
    }
  }

  return false;
};

const hasJoiMeta = joiObj => {
  return isJoi(joiObj) && joiObj.$_terms.metas.length > 0 ? true : false;
};

const getJoiMetaProperty = (joiObj, propertyName) => {
  if (isJoi(joiObj) && hasJoiMeta(joiObj)) {
    const meta = joiObj.$_terms.metas;
    let i = meta.length;
    while (i--) {
      if (meta[i][propertyName]) {
        return meta[i][propertyName];
      }
    }
  }
  return undefined;
};

const deleteEmptyProperties = obj => {
  let key;
  for (key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // delete properties undefined values
      if (obj[key] === undefined || obj[key] === null) {
        delete obj[key];
      }
      // allow blank objects for example or default properties
      if (!['default', 'example', 'security'].includes(key)) {
        // delete array with no values
        if (Array.isArray(obj[key]) && obj[key].length === 0) {
          delete obj[key];
        }
        // delete object which does not have its own properties
        if (isObject(obj[key]) && hasProperties(obj[key]) === false) {
          delete obj[key];
        }
      }
    }
  }
  return obj;
};

const removeProps = (obj, listOfProps) => {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (!listOfProps.includes(key) && !key.startsWith('x-')) {
        delete obj[key];
        //console.log('Removed property: ' + key + ' from object: ', JSON.stringify(obj));
      }
    }
  }
  return obj;
};

const toJoiObj = obj => {
  if (isJoi(obj)) {
    return obj;
  }

  return Joi.object(obj);
};

module.exports = {
  isJoi,
  toJoiObj,
  getJoiLabel,
  hasJoiChildren,
  getArgByName,
  removeProps,
  getJoiMetaProperty,
  deleteEmptyProperties,
};
