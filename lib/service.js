'use strict';
const goblinName = 'garona';
const Goblin = require('xcraft-core-goblin');

//https://github.com/prometheus/docs/blob/master/content/docs/instrumenting/exposition_formats.md
//https://prometheus.io/docs/concepts/data_model/#metric-names-and-labels
//https://www.section.io/blog/prometheus-querying/

//example query:

// {__name__=~"^polypheme_dev_.*desktop.*workitems_total"}

// Define initial logic values
const logicState = {};

// Define logic handlers according rc.json
const logicHandlers = {};

Goblin.registerQuest(goblinName, 'init', function* (quest, desktopId) {
  const xEtc = require('xcraft-core-etc')();
  const {appId, api} = xEtc.load('goblin-garona');
  quest.goblin.setX('desktopId', desktopId);
  quest.goblin.setX('appId', appId);
  if (api.enabled) {
    const tradeAPI = yield quest.create('tradingpost', {
      id: `tradingpost@${goblinName}-${appId}`,
      desktopId,
      host: api.host,
      port: api.port,
      exposeSwagger: true,
      swaggerServerUrl: api.serverUrl,
    });

    const metrics = {
      metrics: {
        verb: 'GET',
        route: 'metrics',
        contentType: 'text/plain;version=0.0.4',
      },
    };

    yield tradeAPI.addGoblinApi({
      goblinId: goblinName,
      apiKey: api.keys,
      allowedCommands: metrics,
    });
    const url = yield tradeAPI.start();
    console.log(
      '\x1b[32m%s\x1b[0m',
      `Goblin-Garona: REST API ${url} [RUNNING]`
    );
  }
});

const groupMetrics = (metrics) => {
  return Object.entries(metrics).reduce((state, [name, value]) => {
    const ns = name.split('.').splice(1); //skip hostname
    const sanitized = ns.map((str) =>
      str
        .replace(/[a-f0-9-]{16,}/g, (match) => match.toUpperCase())
        .replace(/([^a-zA-Z0-9_:])[a-z]/g, (match, p1) =>
          match.replace(p1, '').toUpperCase()
        )
        .replace(/[^a-zA-Z0-9_:]/g, '')
    );
    state.push(`${sanitized.join('_')} ${value}\n`);
    return state;
  }, []);
};

Goblin.registerQuest(goblinName, 'metrics', function* (quest) {
  const appId = quest.goblin.getX('appId');
  const metrics = yield quest.cmd(`bus.${appId}.xcraftMetrics`, {
    from: quest.goblin.id,
  });
  const output = `${groupMetrics(metrics).join('\n')}\n`;
  return output;
});

module.exports = Goblin.configure(goblinName, logicState, logicHandlers);
Goblin.createSingle(goblinName);
