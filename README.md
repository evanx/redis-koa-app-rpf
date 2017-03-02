
# redis-koa-app-rpf

Redis Koa2 application archetype.

Named in honour of https://en.wikipedia.org/wiki/Richard_Feynman 

This provides lifecycle boilerplate reused across similar applications.

## Usage

The app's `index.js` entry-point uses the `redis-koa-app-rpf` application archetype.
```
require('redis-koa-app-rpf')(
    require('../package'),
    require('./spec'),
    require('./main')
).catch(err => {
    console.error(err);
});
```
where we extract the `config` from `process.env` according to the `spec` and invoke our `main` function.


## Implementation 

See `index.js` https://github.com/evanx/redis-koa-app-rpf/blob/master/index.js


## Uses

- https://github.com/evanx/app-spec


## Used by:

Inter alia:
- https://github.com/evanx/geo-cache
- https://github.com/evanx/refind
- https://github.com/evanx/resend

<hr>

https://twitter.com/@evanxsummers

