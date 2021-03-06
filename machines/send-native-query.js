module.exports = {


  friendlyName: 'Send native query',


  description: 'Send a native query to the PostgreSQL database.',


  inputs: {

    connection:
      require('../constants/connection.input'),

    nativeQuery: {
      description: 'A SQL statement as a string (or to use parameterized queries, this should be provided as a dictionary).',
      extendedDescription: 'If provided as a dictionary, this should contain `sql` (the SQL statement string; e.g. \'SELECT * FROM dogs WHERE name = $1\') as well as an array of `bindings` (e.g. [\'Rover\']).',
      moreInfoUrl: 'https://github.com/brianc/node-postgres/wiki/Prepared-Statements#parameterized-queries',
      whereToGet: {
        description: 'This is oftentimes compiled from Waterline query syntax using "Compile statement", however it could also originate from userland code.',
      },
      example: '*',
      required: true
    },

    meta:
      require('../constants/meta.input')

  },


  exits: {

    success: {
      description: 'The native query was executed successfully.',
      outputVariableName: 'report',
      outputDescription: 'The `result` property is the result data the database sent back.  The `meta` property is reserved for custom driver-specific extensions.',
      moreInfoUrl: 'https://github.com/brianc/node-postgres/wiki/Query#result-object',
      example: {
        result: '*',
        meta: '==='
      }
    },

    badConnection:
      require('../constants/badConnection.exit')

  },


  fn: function (inputs, exits) {
    var util = require('util');
    var validateConnection = require('../helpers/validate-connection');

    // Validate provided connection.
    if ( !validateConnection({ connection: inputs.connection }).execSync() ) {
      return exits.badConnection();
    }


    // Validate provided native query.
    // (supports raw SQL string or dictionary consisting of `sql` and `bindings` properties)
    var sql;
    var bindings = [];
    if ( util.isString(inputs.nativeQuery) ) {
      sql = inputs.nativeQuery;
    }
    else if ( util.isObject(inputs.nativeQuery) && util.isString(inputs.nativeQuery.sql) ) {
      sql = inputs.nativeQuery.sql;
      if ( util.isArray(inputs.nativeQuery.bindings) ) {
        bindings = inputs.nativeQuery.bindings;
      }
    }
    else {
      return exits.error(new Error('Provided `nativeQuery` is invalid.  Please specify either a string of raw SQL or a dictionary like `{sql: \'SELECT * FROM dogs WHERE name = $1\', bindings: [\'Rover\']}`.'));
    }


    // Send native query.
    inputs.connection.client.query(sql, bindings, function query(err, result) {
      if (err) {
        return exits.error(err);
      }

      // While we _could hypothetically_ just return `result.rows`, for
      // completeness we currently include the other (albeit less-documented)
      // properties send back on `result` from node-postgres; e.g. `oid`.
      //
      // For more information, see:
      //  • https://github.com/brianc/node-postgres/wiki/Query#result-object
      return exits.success({
        result: {
          command: result.command,
          rowCount: result.rowCount,
          oid: result.oid,
          rows: result.rows
        },
        // For flexibility, an unadulterated reference to this callback's
        // arguments object is also exposed as `meta.rawArguments`.
        meta: {
          rawArguments: arguments
        }
      });
    });
  }


};
