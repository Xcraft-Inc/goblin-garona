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

const sanitizeName = (name) => {
  const ns = name.split('.').splice(1); //skip hostname
  return ns
    .map((str) =>
      str
        .replace(/[a-f0-9-]{16,}/g, (match) => match.toUpperCase())
        .replace(/([^a-zA-Z0-9_:])[a-z]/g, (match, p1) =>
          match.replace(p1, '').toUpperCase()
        )
        .replace(/[^a-zA-Z0-9_:]/g, '')
    )
    .join('_');
};

const extractMetrics = (state, name, value) => {
  const isObject = typeof value === 'object';
  let labels = '';
  const rows = [];

  if (isObject) {
    for (const key in value) {
      if (key === 'labels') {
        labels =
          Object.entries(value.labels).reduce(
            (labels, [labelName, labelValue]) => {
              labels += labels.length ? ', ' : '{';
              labels += `${labelName}="${labelValue}"`;
              return labels;
            },
            ''
          ) + '}';
        continue;
      }

      if (key === 'timestamp') {
        continue;
      }

      const row = {kind: `_${key}`, value: value[key]};
      if (value.timestamp) {
        row.timestamp = value.timestamp;
      }

      rows.push(row);
    }
  } else {
    rows.push({kind: '', value});
  }

  for (const row of rows) {
    state.push(
      `${name}${row.kind}${labels} ${row.value}${
        row.timestamp ? ' ' + row.timestamp : ''
      }`
    );
  }

  return state;
};

const groupMetrics = (metrics) => {
  return Object.entries(metrics).reduce((state, [name, value]) => {
    name = sanitizeName(name);

    if (value.type && value.metrics) {
      if (value.help) {
        state.push(`# HELP ${name} ${value.help}`);
      }
      state.push(`# TYPE ${name} ${value.type}`);
      for (const _value of value.metrics) {
        state = extractMetrics(state, name, _value);
      }
    } else {
      state = extractMetrics(state, name, value);
    }
    state.push('');
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
