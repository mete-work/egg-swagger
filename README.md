# Egg plugin for swagger

## 启用

```typescript
// config/plugin.ts
import { EggPlugin } from 'egg';

const plugin: EggPlugin = {
  swagger: {
    enable: true,
    package: '@mete-work/egg-swagger',
  },
};

export default plugin;
```

## 配置

```typescript
config.swagger = {
  info: {
    version: '1.0.0',
    description: '基于 TypeScript 和 Egg 的 Web 服务端模板',
  },
  tags: [
    {
      name: 'root',
      description: '根路径',
    },
    {
      name: 'account',
      description: '账号相关的路由',
    },
    {
      name: 'user',
      description: '用户相关路由',
    },
    {
      name: 'module',
      description: '模块相关路由',
    },
    {
      name: 'groups',
      description: '用户组相关路由',
    },
    {
      name: 'sys',
      description: '系统配置相关路由',
    },
  ],
};
```

- info: 这个字段是配置 swagger 的一些相关信息，更多可查看 [Swagger 官方文档](https://swagger.io/docs/)
- tags: 这个字段是配置 tag 分组信息，也就是在配置路由时填写的 `options.tags`

## 使用

添加路由需要在 `app/routes` 文件夹下，创建路由文件。

```typescript
// routes/your-routes.ts
import { Application } from 'egg';

export default (app: Application) => {
  return {
    'path.to.controller': {
      method: 'GET',
      path: '/api/path',
      options: {
        description: '路由简介',
        handler: app.controller.path.to.controller,
      },
    },
  };
};
```

这样路由就添加成功了，需要注意的是 `path.to.controller` 这个键值作用是提供唯一标识，所以推荐使用 controller 的路径进行标识。

### 如何添加路由中间件

在配置时，可以在 `options` 中配置 `middlewares` 字段，比如：

```typescript
export default (app: Application) => {
  const { auth } = app.middleware;

  return {
    'path.to.controller': {
      method: 'GET',
      path: '/api/path',
      options: {
        // 添加权限中间件
        middlewares: [auth('rbackey')],
        handler: app.controller.path.to.controller,
      },
    },
  };
};
```

### 路由分组

前面说到在配置插件时，配置了 **tags** 参数，这个参数就是分组，而我们在路由中配置 `options.tags` 就可以将路由放到不同的分组中。

```typescript
export default (app: Application) => {
  const { auth } = app.middleware;

  return {
    'path.to.controller': {
      method: 'GET',
      path: '/api/path',
      options: {
        // 分组到 user
        tags: ['user'],
        handler: app.controller.path.to.controller,
      },
    },
  };
};
```

### Swagger 出入参文档及校验

当路由配置好之后，您就可以访问 `http://127.0.0.1:7001/swagger` 使用 swagger 啦。

PS：默认情况如上地址，取决于您 Boss API 的启动端口。

#### 入参文档及校验

首先需要在 `validate` 文件夹创建校验规则：

```typescript
// user.ts
import * as Joi from '@hapi/joi';

export const getUserRule = {
  // 校验 query
  query: {
    // Joi 规则
  },
  // 校验 params
  params: {
    // Joi 规则
  },
  // 检验 body
  body: {
    // Joi 规则
  },
};
```

配置好校验规则之后，我们就可以在路由配置里进行配置了。

```typescript
import { getUserRule } from '@validate/user';

export default (app: Application) => {
  const { auth } = app.middleware;

  return {
    'path.to.controller': {
      method: 'GET',
      path: '/api/path',
      options: {
        // 分组到 user
        tags: ['user'],
        handler: app.controller.path.to.controller,
        validate: getUserRule,
      },
    },
  };
};
```

同时，我们在 `controller` 中进行参数的校验。

```typescript
// user.ts
import { Controller } from 'egg';

export default class UserController extends Controller {
  async getUser() {
    const { query, params } = this.ctx.validateReq('path.to.controller');
    // ...
  }
}
```

在 `ctx` 上我们挂载了一个 `validateReq` 方法，参数就是我们刚刚在上面提到的唯一标识，这样我们就能够完成参数校验了。

#### 出参文档

在 `options.response` 配置出参就可以形成 swagger 文档了。

```typescript
import { getUserRule } from '@validate/user';

export default (app: Application) => {
  const { auth } = app.middleware;

  return {
    'path.to.controller': {
      method: 'GET',
      path: '/api/path',
      options: {
        // 分组到 user
        tags: ['user'],
        handler: app.controller.path.to.controller,
        response: {
          description: '出参描述',
          schema: {
            // Joi 规则
          },
        },
      },
    },
  };
};
```

配置好之后，就可以享用 swagger 啦。
