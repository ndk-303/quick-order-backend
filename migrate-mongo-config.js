// migrate-mongo-config.js
// Docs: https://github.com/seppevs/migrate-mongo

require('dotenv').config();

const config = {
    mongodb: {
        url: process.env.MONGODB_URI,

        databaseName: 'quick-order',

        options: {
        },
    },

    migrationsDir: 'migrations',

    changelogCollectionName: '_migrations',

    migrationFileExtension: '.js',

    useFileHash: false,

    moduleSystem: 'commonjs',
};

module.exports = config;
