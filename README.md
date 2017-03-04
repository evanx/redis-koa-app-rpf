
# redis-koa-app

Redis Koa2 application archetype.

This provides lifecycle boilerplate reused across similar applications.

## Usage

The app's `index.js` entry-point uses the `redis-koa-app-rpf` application archetype.
```
require('redis-koa-app')(
    require('../package'),
    require('./spec'),
    () => require('./main')
).catch(err => {
    console.error(err);
});
```
where we extract the `config` from `process.env` according to the `spec` and invoke our `main` function.


## Implementation

See `index.js` https://github.com/evanx/redis-koa-app/blob/master/index.js


## Uses

- https://github.com/evanx/app-spec


## Used by:

Inter alia:
- https://github.com/evanx/geo-cache
- https://github.com/evanx/refind
- https://github.com/evanx/resend

<hr>

https://twitter.com/@evanxsummers
