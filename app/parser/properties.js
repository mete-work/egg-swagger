const utils = require('../utils');
const _ = require('lodash');
const Joi = require('@hapi/joi');

// TODO: 没有对更多的类型做处理，比如字符串的 email、数字的精度等等
module.exports = class Properties {
  constructor() {
    // swagger 的类型可以是 string, number, integer, boolean, array, file
    this.simpleTypePropertyMap = {
      boolean: { type: 'boolean' },
      binary: { type: 'string', format: 'binary' },
      date: { type: 'string', format: 'date' },
      number: { type: 'number' },
      string: { type: 'string' },
    };

    this.complexTypePropertyMap = {
      any: { type: 'string' },
      array: { type: 'array' },
      func: { type: 'string' },
      object: { type: 'object' },
      alternatives: { type: 'alternatives' },
    };

    this.propertyMap = Object.assign(
      {},
      this.simpleTypePropertyMap,
      this.complexTypePropertyMap,
    );
  }

  parseProperty(name, joiObj, parent, parameterType) {
    let property = {
      type: 'void',
    };

    const isJoi = utils.isJoi(joiObj);

    if (!isJoi) {
      joiObj = Joi.object(joiObj);
    }

    const joiLabel = utils.getJoiLabel(joiObj);

    if (!name && joiLabel && parameterType !== 'path') {
      name = joiLabel;
    }

    let joiType = joiObj.type.toLowerCase();

    if (!(joiType in this.propertyMap)) {
      joiType = 'any';
    }

    const map = this.propertyMap[joiType];
    property.type = map.type;
    if (map.format) {
      property.format = map.format;
    }

    property = this.parsePropertyMetadata(property, name, parent, joiObj);

    // 添加枚举值
    const describe = joiObj.describe();
    if (Array.isArray(describe.allow) && describe.allow.length) {
      const enums = describe.allow.filter(item => {
        return item !== '' && item !== null;
      });
      if (enums.length) {
        property.enum = enums;
      }
    }

    // 字符串
    if (property.type === 'string') {
      property = this.parseString(property, joiObj);
    }

    // 数字
    if (property.type === 'number') {
      property = this.parseNumber(property, joiObj);
    }

    // 日期
    if (property.type === 'string' && property.format === 'date') {
      property = this.parseDate(property, joiObj);
    }

    // 对象
    if (property.type === 'object') {
      if (utils.hasJoiChildren(joiObj)) {
        property = this.parseObject(property, joiObj, name, parameterType);
      } else {
        property.properties = {};
      }

      const allowUnknown = joiObj._flags.allowUnknown;
      if (allowUnknown !== undefined && !allowUnknown) {
        property.additionalProperties = false;
      }
    }

    // 数组
    if (property.type === 'array') {
      property = this.parseArray(property, joiObj, name, parameterType);
    }

    // 可选值
    if (property.type === 'alternatives') {
      property = this.parseAlternatives(property, joiObj, name, parameterType);
    }

    if (utils.getJoiMetaProperty(joiObj, 'swaggerType') === 'file') {
      property.type = 'file';
      property.in = 'formData';
    }

    property = utils.deleteEmptyProperties(property);

    return property;
  }

  parsePropertyMetadata(property, name, parent, joiObj) {
    // 添加普通属性
    property.description = _.get(joiObj, '_flags.description');
    property.notes = _.get(joiObj, '$_terms.notes');
    property.tags = _.get(joiObj, '$_terms.tags');

    property.default = _.get(joiObj, '_flags.default');

    if (parent && name) {
      if (_.get(joiObj, '_flags.presence')) {
        if (parent.required === undefined) {
          parent.required = [];
        }
        if (parent.optional === undefined) {
          parent.optional = [];
        }
        if (_.get(joiObj, '_flags.presence') === 'required') {
          parent.required.push(name);
        }
        if (_.get(joiObj, '_flags.presence') === 'optional') {
          parent.optional.push(name);
        }
      }
    }

    if (property.default && property.default.call && property.default.apply) {
      property.default = property.default();
    }

    return property;
  }

  parseObject(property, joiObj, name, parameterType) {
    property.properties = {};

    joiObj._ids._byKey.forEach(obj => {
      const keyName = obj.id;
      let itemName = obj.id;
      const joiChildObj = obj.schema;

      // 获取 label 名称
      if (utils.getJoiLabel(joiChildObj)) {
        itemName = utils.geJoiLabel(joiChildObj);
      }

      property.properties[keyName] = this.parseProperty(
        itemName,
        joiChildObj,
        property,
        parameterType,
      );
    });

    property.name = name;

    return property;
  }

  parseString(property, joiObj) {
    const describe = joiObj.describe();

    if (describe !== 'date') {
      this.setValueExcludeFalse(
        property,
        'minLength',
        utils.getArgByName(describe.rules, 'min', 'limit'),
      );
      this.setValueExcludeFalse(
        property,
        'maxLength',
        utils.getArgByName(describe.rules, 'max', 'limit'),
      );
    }

    // regex
    joiObj._rules.forEach(rule => {
      if (rule.args && rule.args.regex) {
        property.pattern = rule.args.regex;
      }
    });
    return property;
  }

  parseNumber(property, joiObj) {
    const describe = joiObj.describe();

    this.setValueExcludeFalse(
      property,
      'minimum',
      utils.getArgByName(describe.rules, 'min'),
    );
    this.setValueExcludeFalse(
      property,
      'maximum',
      utils.getArgByName(describe.rules, 'max'),
    );

    if (Array.isArray(describe.rules) && describe.rules.includes('integer')) {
      property.type = 'integer';
    }

    return property;
  }

  parseDate(property, joiObj) {
    if (joiObj._flags.timestamp) {
      property.type = 'number';
      delete property.format;
    }

    return property;
  }

  parseArray(property, joiObj, name, parameterType) {
    const describe = joiObj.describe();
    this.setValueExcludeFalse(
      property,
      'minItems',
      utils.getArgByName(describe.rules, 'min'),
    );
    this.setValueExcludeFalse(
      property,
      'maxItems',
      utils.getArgByName(describe.rules, 'max'),
    );

    // 默认数组类型
    property.items = {
      type: 'string',
    };

    // 对 query 和 formData 单独处理
    if (parameterType === 'query' || parameterType === 'formData') {
      property.collectionFormat = 'multi';
    }

    const arrayItemTypes = joiObj.$_terms.items;
    const arrayItem = Array.isArray(arrayItemTypes)
      ? arrayItemTypes[0]
      : undefined;

    if (arrayItem) {
      let itemName;
      const labelName = utils.getJoiLabel(arrayItem);
      if (labelName) {
        itemName = labelName;
      }

      const arrayItemProperty = this.parseProperty(
        itemName,
        arrayItem,
        property,
        parameterType,
      );

      if (this.simpleTypePropertyMap[arrayItem.type.toLowerCase()]) {
        property.items = {};
        for (const key in arrayItemProperty) {
          property.items[key] = arrayItemProperty[key];
        }
      } else {
        property.items = arrayItemProperty;
      }
    }

    property.name = name;
    return property;
  }

  parseAlternatives(property, joiObj, name, parameterType) {
    if (_.get(joiObj, '$_terms.matches.0.schema')) {
      const child = joiObj.$_terms.matches[0].schema;
      const childName = utils.getJoiLabel(joiObj);

      property = this.parseProperty(childName, child, property, parameterType);
    } else {
      const child = joiObj.$_terms.matches[0].then;
      const childMetaName = utils.getJoiMetaProperty(child, 'swaggerLabel');

      const childName = childMetaName || utils.getJoiLabel(child) || name;
      property = this.parseProperty(childName, child, property, parameterType);
    }

    return property;
  }

  /**
   * 给对象的某个字段设置不为 false 的值
   * @param {*} property 要改变值的目标对象
   * @param {*} key 目标对象的目标 key
   * @param {*} value 要设置的值
   */
  setValueExcludeFalse(property, key, value) {
    if (property && key && value !== false) {
      _.set(property, key, value);
    }
  }
};
