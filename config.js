'use strict';

/**
 * Retrieve the inquirer definition for xcraft-core-etc
 */
module.exports = [
  {
    type: 'confirm',
    name: 'api.enabled',
    message: 'Enable API',
    default: false,
  },
  {
    type: 'input',
    name: 'api.host',
    message: 'hostname',
    default: '127.0.0.1',
  },
  {
    type: 'input',
    name: 'api.port',
    message: 'port',
    default: 8500,
  },
  {
    type: 'list',
    name: 'api.keys',
    message: 'API keys',
    default: [],
  },
  {
    type: 'input',
    name: 'api.serverUrl',
    message: 'public url',
    default: 'http://127.0.0.1:8500',
  },
];
