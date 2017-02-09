
# redis-koa-app-rpf

Redis Koa2 application archetype.

## Usage

The `lib/index.js` entry-point uses the `redis-koa-app-rpf` application archetype.
```
require('./redis-koa-app-rpf')(require('./spec'), require('./main'));
```
where we extract the `config` from `process.env` according to the `spec` and invoke our `main` function.

## Related projects

The following projects reuse this application archetype:

https://github.com/evanx/geo-proxy

<hr>
https://twitter.com/@evanxsummers
