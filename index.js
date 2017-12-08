var tokenCache = require('./token-cache');

function getToken(options) {
  if (options.token) {
    return Promise.resolve(options.token);
  }

  var token = options.getToken();
  if (typeof token !== 'object' || !token.then) {
    return Promise.resolve(token);
  }

  return token;
}

module.exports = function tokenInterceptor(options) {
  var header = options.header || 'Authorization';
  var headerFormatter = options.headerFormatter || function defaultHeaderFormatter(token) {
    return 'Bearer ' + token;
  };

  return function interceptRequest(config) {
    var requestConfig = config;
    return getToken(options).then(function (token) {
      requestConfig.headers[header] = headerFormatter(token);
      return config;
    });
  };
};

module.exports.tokenCache = tokenCache;
