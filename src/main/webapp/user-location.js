const apiKey = 'AIzaSyB5cba6r-suEYL-0E_nRQfXDtT4XW0WxbQ';
const fetchJson = {
  'considerIp': 'true',
};
const geoCodingUrl = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=';
const geoLocationUrl = 'https://www.googleapis.com/geolocation/v1/geolocate?key=';
const placesUrl =
    'https://maps.googleapis.com/maps/api/place/findplacefromtext/json?key=';
const corsApiUrl = 'https://cors-anywhere.herokuapp.com/';

// Given the user's lat and lng from the geoLocation API,
// getUserState calls to the geoCoding API to reverse geoCode
// the coordinates and get the user's current state.
async function getUserState(lat, lng) {
  const geoCodingFetch = geoCodingUrl + lat + ',' + lng + '&key=' + apiKey;
  return fetch(geoCodingFetch).then((response) => response.json())
    .then(function(jsonResponse) {
      // Traverse all of the addresses and find one that
      // has administrative_area_level_1 (state) as one of the address
      // components.Then return the addressComponent.long_name
      // which will be the state name.
      const results = jsonResponse.results;
      let state;
      let country;
      results.forEach((address) => {
        const addressComponents = address.address_components;
        addressComponents.forEach((component) => {
          const types = component.types;
          types.forEach((type) => {
            if (type === 'administrative_area_level_1') {
              state = component.long_name;
            } else if (type === 'country') {
              country = component.long_name;
            }
          });
        });
      });
      // Check to see that the state is valid
      if (country !== 'United States' || typeof state === 'undefined') {
        return 'each U.S. state';
      } else {
        return state;
      }
    });
}

// Makes a call to the geoLocation API to get the current
// lat and lng of the user based on IP address.
async function getUserLocation() {
  const geoLocationFetchUrl = geoLocationUrl + apiKey;
  return fetch(geoLocationFetchUrl, {
    method: 'POST',
    body: JSON.stringify(fetchJson),
  }).then((response) => response.json())
    .then(function(jsonResponse) {
    return jsonResponse.location;
  });
}

// Returns the state to set as the default value for
// location field.
async function getDefaultValue() {
  const location = await getUserLocation();
  const lat = location.lat;
  const lng = location.lng;
  const state = await getUserState(lat, lng);
  return state;
}

// Given a text location (e.g 'New York City'), use the Places API and geoCoding API to
// find out what state the location is in
async function findStateOfLocation(location) {
  const fetchUrl =
      corsApiUrl + placesUrl + apiKey 
      + '&input=' + location + '&inputtype=textquery&fields=geometry';
  const response = await fetch(fetchUrl);
  if (!response.ok) {
    displayError(
        response.status,
        'There was an error while trying to find the location you entered.');
    return;
  }
  const geoInfo = await response.json();
  const place = geoInfo.candidates[0];
  // TODO: change name of getUserState function to be more generic
  return getUserState(place.geometry.location.lat, place.geometry.location.lng)
    .then(state => {
      if (state === 'each U.S. state') { // TODO: have gUS() throw an error in this case
        displayError(
            400, 
            'Either this location is not in one of the 50 U.S. states, or we \
            are not able to find it (try being more specific or adding the \
            state code).');
        return;
      }
      else {
        return {name: state,
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            number: document
                .querySelector('#location option[value=\'' + state + '\']').dataset.value};
      }
    });
}