'use strict';
const goblinName = 'garona';
const Goblin = require('xcraft-core-goblin');

// Define initial logic values
const logicState = {};

// Define logic handlers according rc.json
const logicHandlers = {};

Goblin.registerQuest(goblinName, 'init', function* (quest, desktopId) {
  quest.goblin.setX('desktopId', desktopId);
  const tradeAPI = yield quest.create('tradingpost', {
    id: `tradingpost@${goblinName}`,
    desktopId,
    host,
    port,
    exposeSwagger: true,
    swaggerServerUrl: serverUrl,
  });

  const {metrics} = require('./schemas/polypheme-api.js');

  yield tradeAPI.addGoblinApi({
    goblinId: goblinName,
    apiVersion: 'v1',
    apiKey: apiKeys,
    allowedCommands: {metrics},
  });
  const url = yield tradeAPI.start();
  console.log('\x1b[32m%s\x1b[0m', `Goblin-Garona: REST API ${url} [RUNNING]`);
  return url;
});

module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
Goblin.createSingle(goblinName);
