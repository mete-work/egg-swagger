const joi = require('boss-joi');

module.exports = {
  validateReq(key, options) {
    const routeConfig = this.app.swaggerRoutes[key];
    const validateObjects = {};

    for (const key in routeConfig.options.validate) {
      if (key === 'params') {
        // 如果是 params 则从 ctx.params 里面取
        validateObjects[key] = this.params;
      } else {
        // 否则从 ctx.request 里面取
        validateObjects[key] = this.request[key];
      }
    }

    try {
      const { value, error } = joi
        .object(routeConfig.options.validate)
        .validate(validateObjects, options);

      if (error) {
        throw error;
      }
      return value;
    } catch (e) {
      this.throw(400, e.message);
    }
  },
};
