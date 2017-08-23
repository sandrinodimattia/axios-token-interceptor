const Promise = require('bluebird');
const tokenCache = require('./token-cache');

describe('cache', () => {
  test('should use the maxAge setting', () => {
    const getToken = jest
        .fn()
        .mockReturnValueOnce(Promise.resolve('token1'))
        .mockReturnValueOnce(Promise.resolve('token2'));

    const cache = tokenCache(getToken, {
      maxAge: 100
    });

    return cache()
        .then((token) => {
          expect(token).toEqual('token1');
        })
        .then(() => Promise.delay(50))
        .then(() => cache())
        .then((token) => {
          expect(token).toEqual('token1');
        })
        .then(() => Promise.delay(100))
        .then(() => cache())
        .then((token) => {
          expect(token).toEqual('token2');
        });
  });

  test('should use the getMaxAge setting', () => {
    const getToken = jest
      .fn()
      .mockReturnValueOnce(Promise.resolve({ access_token: 'token1', expires_in: 50 }))
      .mockReturnValueOnce(Promise.resolve({ access_token: 'token2', expires_in: 100 }));

    const cache = tokenCache(getToken, {
      getMaxAge: token => token.expires_in
    });

    return cache()
        .then((token) => {
          expect(token.access_token).toEqual('token1');
        })
        .then(() => Promise.delay(20))
        .then(() => cache())
        .then((token) => {
          expect(token.access_token).toEqual('token1');
        })
        .then(() => Promise.delay(40))
        .then(() => cache())
        .then((token) => {
          expect(token.access_token).toEqual('token2');
        });
  });

  test('should support reset', () => {
    const getToken = jest
      .fn()
      .mockReturnValueOnce(Promise.resolve({ access_token: 'token1', expires_in: 50 }))
      .mockReturnValueOnce(Promise.resolve({ access_token: 'token2', expires_in: 100 }));

    const cache = tokenCache(getToken, {
      getMaxAge: token => token.expires_in
    });

    return cache()
        .then((config) => {
          expect(config.access_token).toEqual('token1');
          cache.reset();
        })
        .then(() => cache())
        .then((config) => {
          expect(config.access_token).toEqual('token2');
        });
  });

  test('should not make concurrent calls for a cache miss', () => {
    const getToken = jest.fn()
        .mockReturnValueOnce(Promise.delay(50).then(() => Promise.resolve('token1')));
    const cache = tokenCache(getToken, {
      maxAge: 100
    });

    return Promise.all([cache(), cache()])
        .spread((token1, token2) => {
          expect(token1).toEqual('token1');
          expect(token2).toEqual('token1');
        });
  });

  test('should handle errors correctly', () => {
    const getToken = () => Promise.reject(new Error('unable to fetch token'));
    const cache = tokenCache(getToken, {
      maxAge: 100
    });

    return cache()
      .catch((err) => {
        expect(err.message).toEqual('unable to fetch token');
      });
  });
});
