const fs = require('fs');
const showdown = require('showdown');
const hbs = require('handlebars');
const path = require('path');
const Index = require('./lib/blog-index');
const express = require('express');
const bodyParser = require('body-parser');

const getConfig = conf => {
    let result = {};
    Object.keys(conf).forEach(key => {
        result[key] = process.env[key] || conf[key];
    });
    return result;
}

const configFile = require('./config.json');

const serviceConfig = getConfig(configFile);

const renderTemplate = template => (blogEntry, context = {}) => {
    const page = hbs.compile(template);
    return page(Object.assign({ context }, blogEntry));
}

const render = renderTemplate( fs.readFileSync(serviceConfig.MD_BLOG_TEMPLATE, 'utf8') );

const runService = async () => {
    let index = await Index(serviceConfig.MD_BLOG_ARTICLE_FOLDER, serviceConfig.MD_BLOG_INDEX);
    const app = express();

    const someOrNotFound = res => maybe => maybe.toEither().cata(
        () => {
            res.status(404);
            return res.send( render({ content: '404 - Not Found' }) );
        },
        value => res.send(value)
    )

    const indexCommand = res => applicative => async (...args) => {
        try {
            index = await applicative(...args);
            await index.save();
            return res.send("OK");
        } catch (ex) {
            res.status(500);
            res.send(ex.message);
        }
    }

    app.use(bodyParser.text());

    app.get('/', async (req, res) => {
        const entries = index.listByDate();
        res.send(render(entries[0], { blog: entries }));
    });

    app.get('/:entryName', async (req, res) => {
        const entries = index.listByDate();
        const maybeEntry = index.getByName(req.params.entryName);
        someOrNotFound(res)(maybeEntry.map( entry => render(entry, { blog: entries }) ));
    });

    app.post('/', async (req, res) => indexCommand(res)(index.addEntry)(req.body));

    app.delete('/:entryName', async (req, res) => indexCommand(res)(index.remove)(req.params.entryName));

    app.listen(serviceConfig.MD_BLOG_PORT);
    return app;
}

runService()
    .then(() => console.log(`Markdown Blog Service running on Port ${serviceConfig.MD_BLOG_PORT}`))
    .catch(err => console.error(err));
