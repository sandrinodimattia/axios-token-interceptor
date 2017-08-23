const tokenCache = require('./token-cache');

function getToken(options) {
  if (options.token) {
    return Promise.resolve(options.token);
  }

  const token = options.getToken();
  if (typeof token !== 'object' || !token.then) {
    return Promise.resolve(token);
  }

  return token;
}

module.exports = function tokenInterceptor(options) {
  const header = options.header || 'Authorization';
  const headerFormatter = options.headerFormatter || function defaultHeaderFormatter(token) {
    return `Bearer ${token}`;
  };

  return function interceptRequest(config) {
    const requestConfig = config;
    return getToken(options).then((token) => {
      requestConfig.headers[header] = headerFormatter(token);
      return config;
    });
  };
};

module.exports.tokenCache = tokenCache;
