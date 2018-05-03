const showdown = require('showdown');
const path = require('path');
const fsUtils = require('./fs-utils');
const { Maybe } = require('monet');

module.exports = async (baseFolder, indexFile) => {

    const loadIndex = async indexFilePath => {
        if (fsUtils.exists(indexFilePath)) {
            const data = await fsUtils.readFile(indexFilePath);
            return Maybe.Some(JSON.parse(data));
        }
        return Maybe.None();
    }

    const createIndexItemFromMarkdown = text => {
        const mdConverter = new showdown.Converter({ metadata: true });
        const html = mdConverter.makeHtml(text);
        return Object.assign({ content: html, date: Date.now().toString() }, mdConverter.getMetadata());
    }

    const buildIndexItem = folderPath => async name => {
        const filePath = path.join(folderPath, name);
        const text = await fsUtils.readFile(filePath);
        return createIndexItemFromMarkdown(text);
    }

    const buildIndex = async (indexBaseFolder) => {
        const folderContent = await fsUtils.readDir(indexBaseFolder);
        return await Promise.all(folderContent.map(buildIndexItem(indexBaseFolder)));
    }

    const getIndexApi = index => {
        return {
            getByName: name => Maybe.fromNull(index.find(entry => entry.name === name)),
            addEntry: markdown => getIndexApi( [createIndexItemFromMarkdown(markdown)].concat(...index) ),
            remove: name => getIndexApi( index.filter(entry => entry.name !== name) ),
            listByDate: () => index.sort((a, b) => {
                if (a.date > b.date) return -1;
                if (a.date < b.date) return 1;
                return 0;
            }),
            save: async () => fsUtils.writeFile(indexFile, JSON.stringify(index))
        }
    }

    const blogIndex =
        (await loadIndex(indexFile))
        .orJust(await buildIndex(baseFolder));

    return getIndexApi(blogIndex);
}