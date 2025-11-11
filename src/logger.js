const config = require('./config.js');


class Logger {
  httpLogger = (req, res, next) => {
    let send = res.send;
    res.send = (resBody) => {
      res.send = send;

      // Collect log data
      const logData = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        hasAuthHeader: !!req.headers.authorization,
        requestBody: this.sanitize(req.body),
        responseBody: this.sanitize(resBody),
      };

      // Log the request
      const level = this.statusToLogLevel(res.statusCode);
      this.log(level, 'http_request', logData);

      return send.call(res, resBody);
    };
    next();
  };

  log(level, type, logData) {
    const labels = { component: config.logging.source, level: level, type: type };
    const values = [this.nowString(), this.sanitize(logData)];
    const logEvent = { streams: [{ stream: labels, values: [values] }] };

    this.sendLogToGrafana(logEvent);
  }

  statusToLogLevel(statusCode) {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  nowString() {
    return (Math.floor(Date.now()) * 1000000).toString();
  }

  sanitize(data) {
    if (!data) return data;
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return str.replace(/"password":\s*"[^"]*"/g, '"password": "*****"');
  }

sendLogToGrafana(event) {
  const body = JSON.stringify(event);
  fetch(`${config.logging.url}`, {
    method: 'post',
    body: body,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.logging.userId}:${config.logging.apiKey}`,
    },
  }).then((res) => {
    if (!res.ok) console.log('Failed to send log to Grafana');
  });
}
}

module.exports = new Logger();