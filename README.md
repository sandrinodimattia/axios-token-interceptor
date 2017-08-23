# Axios Token Interceptor

An interceptor which makes it easier to work with tokens in [axios](https://github.com/mzabriskie/axios).

## Usage

```js
const tokenProvider = require('axios-token-interceptor');

const instance = axios.create({
  baseURL: 'https://api.example.com'
});

// Configure the provider with the necessary options.
const options = { ... };
instance.interceptors.request.use(tokenProvider(options));

// When a call to an endpoint is made, a token will be provided as a header.
instance.get('/foo')
```

### Providing a token

There are different ways to provide a token. You can provide the token as a static value:

```js
instance.interceptors.request.use(tokenProvider({
  token: 'abc'
}));

// This will send the "Authorization: Bearer abc" header when making the call to the API endpoint.
instance.get('/foo')
```

Instead of providing a static value you can also use a method to get the token:

```js
instance.interceptors.request.use(tokenProvider({
  getToken: () => localStorage.get('access_token')
}));

// This will send the "Authorization: Bearer ..." header when making the call to the API endpoint.
instance.get('/foo')
```

And this method can also return a promise:

```js
instance.interceptors.request.use(tokenProvider({
  getToken: () => someMethod()
    .then(response => response.access_token);
}));

// This will send the "Authorization: Bearer ..." header when making the call to the API endpoint.
instance.get('/foo')
```

### Customizing the Header

The following options allow you to set the header and the header value:

```js
instance.interceptors.request.use(tokenProvider({
  token: 'abc',
  header: 'X-Api-Key',
  headerFormatter: (token) => 'token/' + token,
}));

// This will send the "X-Api-Key: token/abc" header when making the call to the API endpoint.
instance.get('/foo')
```

### Caching

In cases where getting a token is an expensive operation (eg: exchanging a refresh token for an access token) you'll want to cache this work for as long as the token is valid.

The following example shows how we can cache tokens for 8 hours:

```js
const cache = tokenProvider.tokenCache(
  getTokenFromAuthorizationServer().then(res => res.body.access_token),
  { maxAge: ms('8h') }
);

instance.interceptors.request.use(tokenProvider({
  getToken: cache
}));
```

Now it could also be that the token itself contains the expiration time (this is typically `expires_in` you'll get from your Authorization Server). In that case you can also use this to configure the maximum age of the cache:

```js
const cache = tokenProvider.tokenCache(
  getTokenFromAuthorizationServer().then(res => res.body),
  { getMaxAge: (res) => res.expires_in }
);

instance.interceptors.request.use(tokenProvider({
  getToken: cache,
  headerFormatter: (res) => 'Bearer ' + res.access_token,
}));
```

And the cache can also be reset:

```js
const cache = tokenProvider.tokenCache(
  getTokenFromAuthorizationServer().then(res => res.body),
  { getMaxAge: (res) => res.expires_in }
);

cache.reset();
```
