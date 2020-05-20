const _ = require('lodash');
const Properties = require('./properties');
const Response = require('./response');
const utils = require('../utils');
const fromProperties = require('./parameters');

module.exports = class Paths {
  constructor() {
    this.responses = new Response();
    this.properties = new Properties();
  }

  build(routes) {
    const routesData = routes.map(route => {
      return {
        method: route.method,
        path: route.path,
        description: _.get(route, 'options.description') || '',
        notes: _.get(route, 'options.notes') || '',
        tags: _.get(route, 'options.tags') || [],
        queryParams: _.get(route, 'options.validate.query'),
        pathParams: _.get(route, 'options.validate.params'),
        bodyParams: _.get(route, 'options.validate.body'),
        headerParams: _.get(route, 'options.validate.headers'),
        response: _.get(route, 'options.response'),
      };
    });

    return this.buildRoutes(routesData);
  }

  buildRoutes(routes) {
    const pathObj = {};
    const swagger = {
      definitions: {},
    };

    routes.forEach(route => {
      const method = route.method;
      let path = route.path;
      const out = {
        tags: route.tags,
        summary: route.description,
        description: route.notes,
        parameters: [],
        consumes: [],
      };

      out.description = Array.isArray(route.notes)
        ? route.notes.join('<br /><br />')
        : route.notes;

      let bodyStructures = {};
      const bodyJoi = route.bodyParams;
      const bodyType = 'json';
      if (bodyJoi && bodyType.toLowerCase() === 'json') {
        bodyStructures = this.getSwaggerStructures(
          utils.toJoiObj(bodyJoi),
          'body',
        );
      } else {
        out.consumes = ['application/x-www-form-urlencoded'];
      }

      let pathStructures = {};
      const pathJoi = route.pathParams;
      if (pathJoi && utils.hasJoiChildren(utils.toJoiObj(pathJoi))) {
        pathStructures = this.getSwaggerStructures(pathJoi, 'path');
        pathStructures.parameters.forEach(function(item) {
          // add required based on path pattern {prama} and {prama?}
          if (path.indexOf(`:${item.name}`)) {
            path = path.replace(`:${item.name}`, `{${item.name}}`);
          }
          if (item.required === undefined) {
            item.required = true;
          }
        });
      }

      let headerStructures = {};
      const headerJoi = route.headerParams;
      if (headerJoi && utils.hasJoiChildren(utils.toJoiObj(headerJoi))) {
        headerStructures = this.getSwaggerStructures(headerJoi, 'header');
      }

      let queryStructures = {};
      const queryJoi = route.queryParams;
      if (queryJoi && utils.hasJoiChildren(utils.toJoiObj(queryJoi))) {
        queryStructures = this.getSwaggerStructures(queryJoi, 'query');
      }

      pathStructures.parameters &&
        out.parameters.push(...pathStructures.parameters);
      bodyStructures.parameters &&
        out.parameters.push(...bodyStructures.parameters);
      headerStructures.parameters &&
        out.parameters.push(...headerStructures.parameters);
      queryStructures.parameters &&
        out.parameters.push(...queryStructures.parameters);

      out.responses = this.responses.build(route.response);

      if (!pathObj[path]) {
        pathObj[path] = {};
      }

      pathObj[path][method.toLowerCase()] = utils.deleteEmptyProperties(out);
    });

    swagger.paths = pathObj;
    return swagger;
  }

  getSwaggerStructures(joiObj, parameterType) {
    let outProperties;
    let outParameters;

    if (joiObj) {
      outProperties = this.properties.parseProperty(
        null,
        joiObj,
        null,
        parameterType,
      );
      outParameters = fromProperties(outProperties, parameterType);
    }

    const out = {
      properties: outProperties || {},
      parameters: outParameters || {},
    };

    return out;
  }
};
