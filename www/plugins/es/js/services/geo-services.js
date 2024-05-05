angular.module('cesium.es.geo.services', ['cesium.services', 'cesium.es.http.services'])
  .config(function(PluginServiceProvider, csConfig) {
    'ngInject';

    var enable = csConfig.plugins && csConfig.plugins.es;
    if (enable) {
      // Will force to load this service
      PluginServiceProvider.registerEagerLoadingService('esGeo');
    }

  })

  .factory('esGeo', function($rootScope, $q, csConfig, csSettings, csHttp) {
    'ngInject';

    var
      that = this;

    that.raw = {
      osm: {
        search: csHttp.get('nominatim.openstreetmap.org', 443, '/search.php?format=json'),
        license: {
          name: 'OpenStreetMap',
          url: 'https://www.openstreetmap.org/copyright'
        }
      },
      google: {
        apiKey: undefined,
        search: csHttp.get('maps.google.com', 443, '/maps/api/geocode/json')
      },
      freegeoip: {
        //search: csHttp.get('localhost', 8080, '/json/:ip'),
        search: csHttp.get('freegeoip.net', 443, '/json/:ip'),
        license: {
          name: 'freegeoip',
          url: 'https://freegeoip.net'
        }
      }
    };

    function _normalizeAddressString(text) {
      // Remove line break
      var searchText = text.trim().replace(/\n/g, ',');
      // Remove zip code
      searchText = searchText.replace(/(?:^|[\t\n\r\s ])([A−Z09-]+)(?:$|[\t\n\r\s ])/g, '');
      // Remove redundant comma
      searchText = searchText.replace(/,[ ,]+/g, ', ');
      return searchText;
    }

    function googleSearchPositionByString(address) {

      return that.raw.google.search({address: address, key: that.raw.google.apiKey})
        .then(function(res) {
          if (!res || !res.results || !res.results.length) return;
          return res.results.reduce(function(res, hit) {
            return res.concat({
              display_name: hit.address_components && hit.address_components.reduce(function(res, address){
                return address.long_name ? res.concat(address.long_name) : res;
              }, []).join(', '),
              lat: hit.geometry && hit.geometry.location && hit.geometry.location.lat,
              lon: hit.geometry && hit.geometry.location && hit.geometry.location.lng
            });
          }, []);
        });
    }

    function _fallbackSearchPositionByString(osmErr, address) {

      console.debug('[ES] [geo] Search position failed on [OSM]. Trying [google] service');

      return googleSearchPositionByString(address)
        .catch(function(googleErr) {
          console.debug('[ES] [geo] Search position failed on [google] service');
          throw osmErr || googleErr; // throw first OMS error if exists
        });
    }

    function searchPositionByAddress(query) {

      if (typeof query == 'string') {
        query = {q: query};
      }

      // Normalize query string
      if (query.q) {
        query.q = _normalizeAddressString(query.q);
      }

      query.addressdetails = 1; // need address field

      var now = Date.now();
      //console.debug('[ES] [geo] Searching position...', query);

      return that.raw.osm.search(query)
        .then(function(res) {
          //console.debug('[ES] [geo] Received {0} results from OSM'.format(res && res.length || 0), res);
          if (!res) return; // no result

          // Filter on city/town/village
          res = res.reduce(function(res, hit){
            if (hit.class == 'waterway' || hit.class == 'railway' ||!hit.address) return res;
            hit.address.city =  hit.address.city || hit.address.village || hit.address.town || hit.address.postcode;
            hit.address.road =  hit.address.road || hit.address.suburb || hit.address.hamlet;
            if (hit.address.postcode && hit.address.city == hit.address.postcode) {
              delete hit.address.postcode;
            }
            if (!hit.address.city) return res;
            return res.concat({
              id: hit.place_id,
              name: hit.display_name,
              address: hit.address,
              lat: hit.lat,
              lon: hit.lon,
              class: hit.class,
              license: that.raw.osm.license
            });
          }, []);

          console.debug('[ES] [geo] Found {0} address position(s)'.format(res && res.length || 0, Date.now() - now), res);

          return res.length ? res : undefined;
        })

        // Fallback service
        .catch(function(err) {
          var address = query.q ? query.q : ((query.street ? query.street +', ' : '') + query.city +  (query.country ? ', '+ query.country : ''));
          return _fallbackSearchPositionByString(err, address);
        });
    }

    function getCurrentPosition() {
      var defer = $q.defer();
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
          if (!position || !position.coords) {
            console.error('[ES] [geo] navigator geolocation > Unknown format:', position);
            return;
          }
          defer.resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        }, function(error) {
          defer.reject(error);
        },{timeout:5000});
      }else{
        defer.reject();
      }
      return defer.promise;
    }

    function searchPositionByIP(ip) {

      //var now = new Date();
      //console.debug('[ES] [geo] Searching IP position [{0}]...'.format(ip));

      return that.raw.freegeoip.search({ip: ip})
        .then(function(res) {
          //console.debug('[ES] [geo] Found IP {0} position in {0}ms'.format(res ? 1 : 0, Date.now() - now.getTime()));
          return res ? {
            lat: res.latitude,
            lng: res.longitude
          } : undefined;
        });
    }

    // Source: http://www.geodatasource.com/developers/javascript
    // Unit: 'M' is statute miles (default),  'Km' is kilometers, 'N' is nautical miles
    function getDistance(lat1, lon1, lat2, lon2, unit) {
      var radlat1 = Math.PI * lat1/180;
      var radlat2 = Math.PI * lat2/180;
      var theta = lon1-lon2;
      var radtheta = Math.PI * theta/180;
      var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
      dist = Math.acos(dist);
      dist = dist * 180/Math.PI;
      dist = dist * 60 * 1.1515;
      // nautical miles
      if (unit == "km") { return dist * 1.609344; }
      // nautical miles
      if (unit == "N") return dist * 0.8684;
      // statute miles
      return dist;
    }

    that.raw.google.apiKey = csConfig.plugins && csConfig.plugins.es && csConfig.plugins.es.googleApiKey;
    var hasConfigApiKey = !!that.raw.google.apiKey;
    csSettings.ready()
      .then(function() {

        // Listen settings changed
        function onSettingsChanged(data){
          if (!hasConfigApiKey) {
            // If no google api key in config, use in settings
            that.raw.google.apiKey = data.plugins.es.googleApiKey;
          }
          that.raw.google.enable = that.raw.google.apiKey && data.plugins && data.plugins.es && data.plugins.es.enableGoogleApi;
        }
        csSettings.api.data.on.changed($rootScope, onSettingsChanged, this);

        onSettingsChanged(csSettings.data);
      });

    return {
      point: {
        current: getCurrentPosition,
        searchByAddress: searchPositionByAddress,
        distance: getDistance,
        ip: {
          search: searchPositionByIP,
          license: that.raw.freegeoip.license
        }
      },
      google: {
        isEnable: function() {
          return that.raw.google.enable && that.raw.google.apiKey;
        },
        searchByAddress: googleSearchPositionByString
      }
    };
  });
