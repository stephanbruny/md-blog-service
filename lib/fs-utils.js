const fs = require('fs');

module.exports = ({
    readFile: filePath =>
        new Promise((resolve, reject) => fs.readFile(filePath, 'utf8', (err, data) => err ? reject(err) : resolve(data))),

    writeFile: (filePath, data, format = 'utf8') =>
        new Promise((resolve, reject) => fs.writeFile(filePath, data, format, (err) => err ? reject(err) : resolve())),


    readDir: folderPath => new Promise((resolve, reject) =>
        fs.readdir(folderPath, (err, result) => err ? reject(err) : resolve(result))),

    exists: filePath => fs.existsSync(filePath)
})