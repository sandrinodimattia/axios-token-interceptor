var Lock = require('lock');

module.exports = function (getToken, options) {
  var lock = Lock();
  var getMaxAge = options.getMaxAge || function getMaxAge() {
    return options.maxAge || 0;
  };

  var cachedToken = null;
  var cacheExpiration = null;

  var cache = function getFromCache() {
    if (cachedToken && cacheExpiration && cacheExpiration - Date.now() > 0) {
      return Promise.resolve(cachedToken);
    }

    // Get a new token and prevent concurrent request.
    return new Promise(function (resolve, reject) {
      lock('cache', function (unlockFn) {
        var unlock = unlockFn();

        // Token was already loaded by the previous lock.
        if (cachedToken && cacheExpiration && cacheExpiration - Date.now() > 0) {
          unlock();
          return resolve(cachedToken);
        }

        // Get the token.
        return getToken()
          .then(function (token) {
            cachedToken = token;
            cacheExpiration = Date.now() + (getMaxAge(token));
            unlock();
            resolve(token);
          })
          .catch(function (err) {
            unlock();
            reject(err);
          });
      });
    });
  };
  cache.reset = function resetCache() {
    cachedToken = null;
    cacheExpiration = null;
  };

  return cache;
};
