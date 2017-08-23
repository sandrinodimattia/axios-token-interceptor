const nock = require('nock');
const axios = require('axios');
const Promise = require('bluebird');

const plugin = require('./index');

describe('axios-token-interceptor', () => {
  describe('tokens', () => {
    test('should support promises', () => {
      const options = {
        getToken: () => Promise.resolve('abc')
      };

      return plugin(options)({ headers: {} }).then((config) => {
        expect(config).toEqual({
          headers: {
            Authorization: 'Bearer abc'
          }
        });
      });
    });

    test('should support strings', () => {
      const options = {
        getToken: () => 'def'
      };

      return plugin(options)({ headers: {} }).then((config) => {
        expect(config).toEqual({
          headers: {
            Authorization: 'Bearer def'
          }
        });
      });
    });

    test('should support static tokens', () => {
      const options = {
        token: 'my-token'
      };

      return plugin(options)({ headers: {} }).then((config) => {
        expect(config).toEqual({
          headers: {
            Authorization: 'Bearer my-token'
          }
        });
      });
    });

    test('should support the cache provider', () => {
      const cache = plugin.tokenCache(() => Promise.resolve('abc'), {
        maxAge: 100
      });

      const options = {
        getToken: cache
      };

      return plugin(options)({ headers: {} }).then((config) => {
        expect(config).toEqual({
          headers: {
            Authorization: 'Bearer abc'
          }
        });
      });
    });
  });

  describe('header', () => {
    test('should set a custom header', () => {
      const options = {
        header: 'X-Api-Key',
        getToken: () => Promise.resolve('abc')
      };

      return plugin(options)({ headers: {} }).then((config) => {
        expect(config).toEqual({
          headers: {
            'X-Api-Key': 'Bearer abc'
          }
        });
      });
    });

    test('should set a custom header value', () => {
      const options = {
        headerFormatter: token => `Token:${token}`,
        getToken: () => Promise.resolve('abc')
      };

      return plugin(options)({ headers: {} }).then((config) => {
        expect(config).toEqual({
          headers: {
            Authorization: 'Token:abc'
          }
        });
      });
    });
  });

  describe('cache', () => {
    test('should use the maxAge setting', () => {
      const getToken = jest
        .fn()
        .mockReturnValueOnce(Promise.resolve('token1'))
        .mockReturnValueOnce(Promise.resolve('token2'));
      const options = {
        getToken: plugin.tokenCache(getToken, {
          maxAge: 100
        })
      };

      const interceptor = plugin(options);
      return interceptor({ headers: {} })
        .then((config) => {
          expect(config).toEqual({
            headers: {
              Authorization: 'Bearer token1'
            }
          });
        })
        .then(() => Promise.delay(50))
        .then(() => interceptor({ headers: {} }))
        .then((config) => {
          expect(config).toEqual({
            headers: {
              Authorization: 'Bearer token1'
            }
          });
        })
        .then(() => Promise.delay(100))
        .then(() => interceptor({ headers: {} }))
        .then((config) => {
          expect(config).toEqual({
            headers: {
              Authorization: 'Bearer token2'
            }
          });
        });
    });

    test('should use the getMaxAge setting', () => {
      const getToken = jest
        .fn()
        .mockReturnValueOnce(Promise.resolve({ access_token: 'token1', expires_in: 50 }))
        .mockReturnValueOnce(Promise.resolve({ access_token: 'token2', expires_in: 100 }));

      const options = {
        headerFormatter: token => `Bearer ${token.access_token}`,
        getToken: plugin.tokenCache(getToken, {
          getMaxAge: token => token.expires_in
        })
      };

      const interceptor = plugin(options);
      return interceptor({ headers: {} })
        .then((config) => {
          expect(config).toEqual({
            headers: {
              Authorization: 'Bearer token1'
            }
          });
        })
        .then(() => Promise.delay(20))
        .then(() => interceptor({ headers: {} }))
        .then((config) => {
          expect(config).toEqual({
            headers: {
              Authorization: 'Bearer token1'
            }
          });
        })
        .then(() => Promise.delay(40))
        .then(() => interceptor({ headers: {} }))
        .then((config) => {
          expect(config).toEqual({
            headers: {
              Authorization: 'Bearer token2'
            }
          });
        });
    });

    test('should support reset', () => {
      const getToken = jest
        .fn()
        .mockReturnValueOnce(Promise.resolve({ access_token: 'token1', expires_in: 50 }))
        .mockReturnValueOnce(Promise.resolve({ access_token: 'token2', expires_in: 100 }));

      const cache = plugin.tokenCache(getToken, {
        getMaxAge: token => token.expires_in
      });
      const options = {
        headerFormatter: token => `Bearer ${token.access_token}`,
        getToken: cache
      };

      const interceptor = plugin(options);
      return interceptor({ headers: {} })
        .then((config) => {
          expect(config).toEqual({
            headers: {
              Authorization: 'Bearer token1'
            }
          });
          cache.reset();
        })
        .then(() => interceptor({ headers: {} }))
        .then((config) => {
          expect(config).toEqual({
            headers: {
              Authorization: 'Bearer token2'
            }
          });
        });
    });

    test('should not make concurrent calls for a cache miss', () => {
      const getToken = jest.fn()
        .mockReturnValueOnce(Promise.resolve('token1'));

      const options = {
        getToken: plugin.tokenCache(getToken, {
          maxAge: 100
        })
      };

      const interceptor = plugin(options);
      return Promise.all([interceptor({ headers: {} }), interceptor({ headers: {} })])
        .spread((config1, config2) => {
          expect(config1).toEqual({
            headers: {
              Authorization: 'Bearer token1'
            }
          });
          expect(config2).toEqual({
            headers: {
              Authorization: 'Bearer token1'
            }
          });
        });
    });

    test('should handle errors correctly', () => {
      const getToken = () => Promise.reject(new Error('unable to fetch token'));

      const options = {
        getToken: plugin.tokenCache(getToken, {
          maxAge: 100
        })
      };

      const interceptor = plugin(options);
      return interceptor({ headers: {} })
        .catch((err) => {
          expect(err.message).toEqual('unable to fetch token');
        });
    });
  });

  describe('axios', () => {
    test('should send the header to the api', () => {
      const options = {
        getToken: () => Promise.resolve('abc')
      };

      const instance = axios.create({
        baseURL: 'https://api.example.com'
      });
      instance.interceptors.request.use(plugin(options));

      const request = nock('https://api.example.com', {
        reqheaders: {
          authorization: 'Bearer abc'
        }
      })
      .get('/foo')
      .reply(200);

      return instance.get('/foo').then(() => {
        expect(request.isDone()).toBeTruthy();
      });
    });

    test('should handle token failures correctly', () => {
      expect.assertions(1);

      const options = {
        getToken: () => Promise.reject(new Error('unable to fetch token'))
      };

      const instance = axios.create({
        baseURL: 'https://api.example.com'
      });
      instance.interceptors.request.use(plugin(options));

      return instance.get('/foo').catch((err) => {
        expect(err.message).toEqual('unable to fetch token');
      });
    });
  });
});
