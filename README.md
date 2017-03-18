
# redis-koa-app

Redis Koa2 application archetype.

This provides lifecycle boilerplate reused across similar applications.

## Usage

The app's `index.js` entry-point uses the `redis-koa-app-rpf` application archetype.
```
require('redis-koa-app')(
    require('../package'),
    require('./spec'),
    async deps => Object.assign(global, deps),    
    () => require('./main')
).catch(err => {
    console.error(err);
});
```
where we extract the `config` from `process.env` according to the `spec` and invoke our `main` function.

In the above example, we assign the archetype's dependencies on `global` before `main.js` is parsed i.e. including:
```javascript
    const redisApp = {
        assert, clc, lodash, Promise,
        asserta, asserto,
        DataError, StatusError,
        redis, client, logger, config,
        multiExecAsync
    };
```

## Implementation

See `index.js` https://github.com/evanx/redis-koa-app/blob/master/index.js


## Uses

- https://github.com/evanx/app-spec


## Used by:

Inter alia:
- https://github.com/evanx/reslack

<hr>

https://twitter.com/@evanxsummers
