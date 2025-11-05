const config = require('./config');
const os = require('os');

// Metrics stored in memory
const requests = {};
let cpuPercentage = 0;
let memoryPercentage = 0;
let successfulAuthentications = 0;
let failedAuthentications = 0;
let pizzasSold = 0;
let revenueGenerated = 0;
let creationLatencyMs = 0;
let creationFailures = 0;
let activeUsers = new Set();

let totalLatency = 0;
let latencySamples = 0;

function recordCreationLatency(latencyMs) {
  totalLatency += latencyMs;
  latencySamples++;
  creationLatencyMs = totalLatency / latencySamples;
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
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

function requestTracker(req, res, next) {
  const endpoint = `[${req.method}] ${req.path}`;
  requests[endpoint] = (requests[endpoint] || 0) + 1;

  // Track total requests by HTTP method
  requests[req.method] = (requests[req.method] || 0) + 1;

  next();
}


// This will periodically send metrics to Grafana
setInterval(() => {
  const metrics = [];

  // Aggregate counts by HTTP method
  const methodCounts = { GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0 };

  Object.entries(requests).forEach(([key, count]) => {
    const match = key.match(/\[(\w+)\]/); // Extract method from key, e.g., "[GET]" → "GET"
    if (match && methodCounts[match[1]] !== undefined) {
      methodCounts[match[1]] += count;
    }
  });

  // Create metrics per method
  Object.entries(methodCounts).forEach(([method, count]) => {
    metrics.push(
      createMetric('httpRequestsByMethod', count, '1', 'sum', 'asInt', { method })
    );
  });


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


  sendMetricToGrafana(metrics);
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

module.exports = { requestTracker, incrementSuccessfulAuthentications, incrementFailedAuthentications, incrementPizzasSold, addRevenue, incrementCreationFailures, recordCreationLatency, userBecameActive, userBecameInactive };