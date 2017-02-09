
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

const debug = () => undefined;

module.exports = async (spec, main) => {
    debug(`redisApp '${spec.description}' {${Object.keys(spec.required).join(', ')}}`);
    const ends = [];
    const end = code => Promise.all(ends.map(end => {
        end().catch(err => console.error('end', err.message));
    })).then(() => process.exit(code));
    try {
        const defaults = spec[process.env.NODE_ENV || 'production'];
        const config = appSpec(spec, process.env, {defaults});
        const client = redis.createClient({
            host: config.redisHost,
            port: config.redisPort,
            password: config.redisPassword
        });
        ends.push(() => new Promise(() => client.end(false)));
        const logger = redisLogger(config, redis);
        logger.level = config.loggerLevel;
        const app = new Koa();
        const api = KoaRouter();
        await main({
            app, api,
            assert, clc, lodash, Promise,
            asserta, asserto, DataError, multiExecAsync,
            redis, client, logger, config, ends
        });
        //app.use(bodyParser());
        app.use(api.routes());
        app.use(async (ctx, ...args) => {
            console.log(args);
           ctx.statusCode = 404;
        });
        const server = app.listen(config.httpPort);
        logger.info('listen', config.httpPort);
        ends.push(async () => {
            server.close();
        });
    } catch (err) {
        console.error(['', clc.red.bold(err.message), ''].join('\n'));
        end(1);
    }
};
