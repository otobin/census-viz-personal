const CACHE_VERSION = 1;
const CURRENT_CACHES = {
  censusData: 'census-data-cache-v' + CACHE_VERSION,
};


self.addEventListener('activate', function(event) {
  // Delete all caches that aren't named in CURRENT_CACHES.
  // Useful if multiple versioned caches
  const expectedCacheNamesSet = new Set(Object.values(CURRENT_CACHES));
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if(!expectedCacheNamesSet.has(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      )
    })
  )
});

// Check cache and cache data if necessary on every fetch()
self.addEventListener('fetch', function(event) {
  console.log('Handling fetch event for', event.request.url);
  event.respondWith(
    caches.open(CURRENT_CACHES.censusData).then(function(cache) {
      return cache.match(event.request).then(function(response) {
        if (response) {
          // response found in cache
          return response;
        }
        // response not found in cache, we need to fetch
        // make a copy of the request because fetch "consumes" a request
        // and we might need to cache it
        return fetch(event.request.clone()).then(function(response) {
          if(response.status < 300 &&
            response.headers.has('content-type') &&
            response.headers.get('content-type').match(/application\/json/)) {
              // only cache if non-error response
              // make a copy of response because put() "consumes" requests
              // and we will return original response object
              cache.put(event.request, response.clone());
          }
          return response;
        });
      }).catch(function(error) {
        // Handle exceptions from match() or fetch()
        // Note: HTTP error response does not trigger exception
        console.error('Error in fetch handler:', error);
        throw error;
      })
    })
  );
});
