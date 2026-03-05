// migrate-mongo-config.js
// Docs: https://github.com/seppevs/migrate-mongo

require('dotenv').config();

const config = {
    mongodb: {
        url: "mongodb+srv://khoa_dev_db_quick_order:SqvHzLf2rvcNE5xa@quick-order.zru6mhd.mongodb.net/test?appName=quick-order",

        databaseName: 'test',

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
