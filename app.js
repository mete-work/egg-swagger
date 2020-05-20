const koaSwagger = require('koa2-swagger-ui');
const getSwaggerJSON = require('./app/builder');
const path = require('path');

// 使用加载器自动加载路由
function loadRoutes(app) {
  const dir = path.join(app.config.baseDir, 'app/routes');

  const routes = {};
  const loader = new app.loader.FileLoader({
    directory: dir,
    target: routes,
    inject: app,
  });
  // 将 routes 下面的路由加载到 routes 对象上
  loader.load();

  // 扁平化 loader 的路由，目前只支持一级目录
  const flatRoutes = Object.values(routes).reduce(
    (prev, current) => Object.assign(prev, current),
    {},
  );

  return flatRoutes;
}

// 将 json 格式的 router 转换为 egg 的 router
const arrRoutes = [];
function json2Router(app, routes) {
  routes = routes || loadRoutes(app);
  app.swaggerRoutes = Object.assign({}, app.swaggerRoutes, routes);
  Object.keys(routes).forEach(key => {
    const route = routes[key];
    if (route.enable === false || !route.options) {
      return;
    }
    arrRoutes.push(route);
    const middlewares = route.options.middlewares || [];
    app.router[route.method.toLowerCase()](
      route.path,
      ...middlewares,
      route.options.handler,
    );
  });
}

module.exports = app => {
  app.ready(() => {
    json2Router(app);
    if (app.config.env === 'local') {
      app.router.get('/swagger.json', ctx => {
        ctx.body = JSON.stringify(
          Object.assign(app.config.swagger, getSwaggerJSON(arrRoutes)),
        );
      });

      app.router.get(
        '/swagger',
        koaSwagger({
          routePrefix: false,
          swaggerOptions: {
            url: '/swagger.json',
            requestInterceptor: req => {
              // 拦截 swagger 的请求，加上 csrf 令牌
              const matches = /csrfToken=([\w-]+)\b/.exec(document.cookie);
              if (matches) {
                req.headers['x-csrf-token'] = matches[1];
              }
              return req;
            },
          },
        }),
      );
    }
  });

  app.swagger = {
    json2Router,
  };
};
