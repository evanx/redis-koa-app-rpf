
const assert = require('assert');
const lodash = require('lodash');
const redis = require('redis');
const bluebird = require('bluebird');
const clc = require('cli-color');
const mapProperties = require('map-properties');
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

const printError = err => {
    console.error();
    console.error(clc.red.bold(err.message));
    if (err.data) {
        console.error(clc.yellow(JSON.stringify(err.data, null, 2)));
    } else {
        console.error();
        console.error(err.stack);
    }
};

const exits = [];

const shutdown = () => Promise.all(exits.map(async exit => {
    try {
        await exit();
    } catch(err) {
        console.error('exit', err.message)
    }
}));

const exitOk = async () => {
    await shutdown();
    process.exit(0);
};

const exitError = async err => {
    printError(err);
    await shutdown();
    process.exit(1);
};

const mapRedisK = (spec, config) => {
    assert(typeof spec.redisK === 'function', 'redisK function');
    const redisK = spec.redisK(config);
    const invalidKeys = Object.keys(redisK).filter(key => redisK[key].key === undefined);
    if (invalidKeys.length) {
        throw new DataError('Redis key spec', {invalidKeys});
    }
    return mapProperties(
        redisK,
        meta =>
        typeof meta.key === 'string' && meta.key[0] === ':' ?
        config.redisNamespace + meta.key :
        meta.key
    );
}

module.exports = async (pkg, specf, mainf) => {
    try {
        const spec = specf(pkg);
        const config = appSpec(pkg, specf);
        config.redisHost = config.redisHost || config.host;
        config.redisPort = config.redisPort || config.port;
        config.redisPassword = config.redisPassword || config.password;
        config.redisNamespace = config.redisNamespace || config.namespace;
        const client = redis.createClient({
            host: config.redisHost,
            port: config.redisPort,
            password: config.redisPassword
        });
        exits.push(() => new Promise(() => client.end(false)));
        const logger = redisLogger(config, redis);
        logger.level = config.loggerLevel;
        logger.info({config});
        const redisApp = {
            assert, clc, lodash, Promise,
            asserta, asserto,
            DataError, StatusError,
            redis, client, logger, config,
            multiExecAsync
        };
        if (spec.redisK) {
            redisApp.redisK = mapRedisK(spec, config);
        }
        const app = new Koa();
        const api = KoaRouter();
        if (process.env.NODE_ENV !== 'production' && process.env.apiExit) {
            logger.info('apiExit');
            api.get(process.env.apiExit, async ctx => {
                logger.warn('apiExit');
                shutdown();
            });
        }
        const routeAnalyticsKey = [config.redisNamespace, 'route:count:h'].join(':');
        api.get('/favicon.ico', async ctx => {
            ctx.statusCode = 404;
            multiExecAsync(client, multi => {
                multi.hincrby(routeAnalyticsKey, 'favicon', 1);
            });
        });
        app.use(async (ctx, next) => {
            try {
                await next();
            } catch (err) {
                if (err.data) {
                    ctx.status = err.statusCode || err.status || 400;
                    ctx.body = {
                        errorMessage: err.message,
                        status: ctx.status,
                        data: err.data
                    };
                } else {
                    throw err;
                }
            }
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
        exits.push(async () => server.close());
        Object.assign(global, {redisApp}, redisApp);
        await mainf()(api);
    } catch (err) {
        exitError(err);
    }
};
