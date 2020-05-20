const _ = require('lodash');
const Properties = require('./properties');

module.exports = class Response {
  constructor() {
    this.properties = new Properties();
  }

  build(responses) {
    // 默认 string
    const out = {
      200: {
        description: '成功',
        schema: {
          type: 'string',
        },
      },
    };

    if (!responses) {
      return out;
    }

    out[200] = this.getResponse(responses);

    return out;
  }

  getResponse(responses) {
    const outProperties = this.properties.parseProperty(
      null,
      responses.schema,
      null,
      'body',
    );

    const out = {
      description: _.get(responses, 'description', '成功'),
      schema: outProperties,
    };

    return out;
  }
};
