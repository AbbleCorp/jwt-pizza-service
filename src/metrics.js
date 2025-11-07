const config = require('./config');
const os = require('os');

// Metrics stored in memory
let totalRequests = 0;
let putRequests = 0;
let getRequests = 0;
let postRequests = 0;
let deleteRequests = 0;
let cpuPercentage = 0;
let memoryPercentage = 0;
let successfulAuthentications = 0;
let failedAuthentications = 0;
let pizzasSold = 0;
let revenueGenerated = 0;
let creationLatencyMs = 0;
let creationFailures = 0;
let activeUsers = new Set();
let totalLatencyMs = 0;
let latencySamples = 0;

let creationTotalLatency = 0;
let creationLatencySamples = 0;

function recordCreationLatency(latencyMs) {
  creationTotalLatency += latencyMs;
  creationLatencySamples++;
  creationLatencyMs = creationTotalLatency / creationLatencySamples;
}

function userBecameActive(userId) {
  activeUsers.add(userId);
}

function userBecameInactive(userId) {
  activeUsers.delete(userId);
}


function incrementSuccessfulAuthentications() {
  successfulAuthentications++;
}

function incrementFailedAuthentications() {
  failedAuthentications++;
}

function incrementPizzasSold(count) {
  pizzasSold += count;
}

function addRevenue(amount) {
  revenueGenerated += amount;
}

//TODO: implement latency tracking properly

function incrementCreationFailures() {
  creationFailures++;
}

function getCpuUsagePercentage() {
  const cpuUsage = (os.loadavg()[0] / os.cpus().length) * 100;
  return Number(cpuUsage.toFixed(2));
}


function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

function incrementgetRequests() {
  getRequests++;
  totalRequests++;
}

function incrementpostRequests() {
  postRequests++;
  totalRequests++;
}

function incrementdeleteRequests() {
  deleteRequests++;
  totalRequests++;
}

function incrementputRequests() {
  putRequests++;
  totalRequests++;
}

function requestTracker(req, res, next) {
  const start = Date.now();

  const method = req.method.toLowerCase();

  switch (method) {
    case 'get':
      incrementgetRequests();
      break;
    case 'post':
      incrementpostRequests();
      break;
    case 'put':
      incrementputRequests();
      break;
    case 'delete':
      incrementdeleteRequests();
      break;
    default:
      totalRequests++;
  }

    res.on('finish', () => {
    const duration = Date.now() - start;
    totalLatencyMs += duration;
    latencySamples++;
  });

  next();
}






// This will periodically send metrics to Grafana
setInterval(() => {
  const metrics = [];
  metrics.push(createMetric('totalRequests', totalRequests, '1', 'sum', 'asInt', {}));
  metrics.push(createMetric('getRequests', getRequests, '1', 'sum', 'asInt', {}));
  metrics.push(createMetric('postRequests', postRequests, '1', 'sum', 'asInt', {}));
  metrics.push(createMetric('putRequests', putRequests, '1', 'sum', 'asInt', {}));
  metrics.push(createMetric('deleteRequests', deleteRequests, '1', 'sum', 'asInt', {}));


  cpuPercentage = getCpuUsagePercentage();
  metrics.push(createMetric('cpuPercentage', cpuPercentage, 'percent', 'sum', 'asDouble', {}));

  memoryPercentage = getMemoryUsagePercentage();
  metrics.push(createMetric('memoryPercentage', memoryPercentage, 'percent', 'sum', 'asDouble', {}));

  metrics.push(createMetric('successfulAuthentications', successfulAuthentications, '1', 'sum', 'asInt', {}));
  metrics.push(createMetric('failedAuthentications', failedAuthentications, '1', 'sum', 'asInt', {}));

  metrics.push(createMetric('pizzasSold', pizzasSold, '1', 'sum', 'asInt', {}));
  metrics.push(createMetric('revenueGenerated', revenueGenerated, 'USD', 'sum', 'asDouble', {}));

  metrics.push(createMetric('creationLatencyMs', creationLatencyMs, 'ms', 'sum', 'asDouble', {}));
  metrics.push(createMetric('creationFailures', creationFailures, '1', 'sum', 'asInt', {}));
  metrics.push(createMetric('activeUsers', activeUsers.size, '1', 'sum', 'asInt', {}));
  const avgLatency = latencySamples > 0 ? totalLatencyMs / latencySamples : 0;
  metrics.push(createMetric('avgLatencyMs', avgLatency, 'ms', 'sum', 'asDouble', {}));
  totalLatencyMs = 0;
  latencySamples = 0;




  sendMetricToGrafana(metrics);
  //clearRequests();
}, 10000);

function createMetric(metricName, metricValue, metricUnit, metricType, valueType, attributes) {
  attributes = { ...attributes, source: config.metrics.source };

  const metric = {
    name: metricName,
    unit: metricUnit,
    [metricType]: {
      dataPoints: [
        {
          [valueType]: metricValue,
          timeUnixNano: Date.now() * 1000000,
          attributes: [],
        },
      ],
    },
  };

  Object.keys(attributes).forEach((key) => {
    metric[metricType].dataPoints[0].attributes.push({
      key: key,
      value: { stringValue: attributes[key] },
    });
  });

  if (metricType === 'sum') {
    metric[metricType].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
    metric[metricType].isMonotonic = true;
  }

  return metric;
}

function sendMetricToGrafana(metrics) {
  const body = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics,
          },
        ],
      },
    ],
  };

  fetch(`${config.metrics.url}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP status: ${response.status}`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}

module.exports = { requestTracker, incrementSuccessfulAuthentications, incrementFailedAuthentications, 
  incrementPizzasSold, addRevenue, incrementCreationFailures, recordCreationLatency, userBecameActive,
   userBecameInactive, incrementgetRequests, incrementpostRequests, incrementputRequests, incrementdeleteRequests };