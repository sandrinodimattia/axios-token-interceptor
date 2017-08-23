const Lock = require('lock');

module.exports = (getToken, options) => {
  const lock = Lock();
  const getMaxAge = options.getMaxAge || function getMaxAge() {
    return options.maxAge || 0;
  };

  let cachedToken = null;
  let cacheExpiration = null;

  const cache = function getFromCache() {
    if (cachedToken && cacheExpiration && cacheExpiration - Date.now() > 0) {
      return Promise.resolve(cachedToken);
    }

    // Get a new token and prevent concurrent request.
    return new Promise((resolve, reject) => {
      lock('cache', (unlockFn) => {
        const unlock = unlockFn();

        // Token was already loaded by the previous lock.
        if (cachedToken && cacheExpiration && cacheExpiration - Date.now() > 0) {
          unlock();
          return resolve(cachedToken);
        }

        // Get the token.
        return getToken()
          .then((token) => {
            cachedToken = token;
            cacheExpiration = Date.now() + (getMaxAge(token));
            unlock();
            resolve(token);
          })
          .catch((err) => {
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
