
const assert = require('assert');
const lodash = require('lodash');
const redis = require('redis');
const bluebird = require('bluebird');
const clc = require('cli-color');
const multiExecAsync = require('multi-exec-async');
const redisLogger = require('redis-logger-rpf');
const appSpec = require('app-spec');
const Promise = bluebird;
const Koa = require('koa');
const KoaRouter = require('koa-router');
const bodyParser = require('koa-bodyparser');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

function DataError(message, data) {
    this.name = 'DataError';
    this.message = message;
    this.data = data;
    this.constructor.prototype.__proto__ = Error.prototype;
    Error.captureStackTrace(this, this.constructor);
}

function StatusError(message, statusCode, data) {
   this.name = 'StatusError';
   this.message = message;
   this.statusCode = statusCode;
   this.data = data;
   this.constructor.prototype.__proto__ = Error.prototype;
   Error.captureStackTrace(this, this.constructor);
}

function asserta(actual, expected) {
    if (actual !== expected) {
        throw new DataError('Unexpected', {actual, expected});
    }
}

function asserto(object) {
    const key = Object.keys(object).find(key => !object[key]);
    if (key) {
        throw new DataError('Missing', {key});
    }
}

module.exports = async (pkg, spec, main) => {
    const ends = [];
    const end = code => Promise.all(ends.map(end => {
        end().catch(err => console.error('end', err.message));
    })).then(() => process.exit(code));
    try {
        const config = appSpec(pkg, spec);
        const client = redis.createClient({
            host: config.redisHost,
            port: config.redisPort,
            password: config.redisPassword
        });
        ends.push(() => new Promise(() => client.end(false)));
        const logger = redisLogger(config, redis);
        logger.level = config.loggerLevel;
        logger.info({config});
        const app = new Koa();
        const api = KoaRouter();
        const routeAnalyticsKey = [config.redisNamespace, 'route:count:h'].join(':');
        api.get('/favicon.ico', async ctx => {
            ctx.statusCode = 404;
            multiExecAsync(client, multi => {
               multi.hincrby(routeAnalyticsKey, 'favicon', 1);
            });
        });
        await main({
            app, api,
            assert, clc, lodash, Promise,
            asserta, asserto,
            DataError, StatusError,
            redis, client, logger, config, ends,
            multiExecAsync
        });
        app.use(bodyParser());
        app.use(api.routes());
        app.use(async ctx => {
            logger.debug('404', ctx.request.url);
            ctx.statusCode = 404;
            multiExecAsync(client, multi => {
               multi.hincrby(routeAnalyticsKey, '404', 1);
            });
        });
        const server = app.listen(config.httpPort);
        logger.info('listen', config.httpPort);
        ends.push(async () => {
            server.close();
        });
    } catch (err) {
        console.error();
        console.error(clc.red.bold(err.message));
        if (err.data) {
            console.error(clc.yellow(JSON.stringify(err.data, null, 2)));
        } else {
          console.error();
          console.error(err.stack);
        }
        end(1);
    }
};
