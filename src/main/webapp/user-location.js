const apiKey = 'AIzaSyB5cba6r-suEYL-0E_nRQfXDtT4XW0WxbQ';
const fetchJson = {
  "considerIp": "true",
};
const geoCodingUrl = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=';
const geoLocationUrl = 'https://www.googleapis.com/geolocation/v1/geolocate?key=';

// Given the user's lat and lng from the geoLocation API,
// getUserState calls to the geoCoding API to reverse geoCode
// the coordinates and get the user's current state.
function getUserState(lat, lng) {
  const geoCodingFetch = geoCodingUrl + lat + ',' + lng + '&key=' + apiKey;
  fetch(geoCodingFetch).then(function(response) {
    response.json().then(function(jsonResponse) {
      // Traverse all of the addresses and find one that 
      // has administrative_area_level_1 as one of the address 
      // components. Then return the addressComponent[long_name] 
      // which will be the state name.
      const results = jsonResponse.results;
      results.forEach((address) => {
        const addressComponents = address.address_components;
        addressComponents.forEach((component) => {
          const types = component.types;
          types.forEach((type) => {
            if (type === 'administrative_area_level_1') {
              return component.long_name;
            }
          })
        })
      })
    })
  });
}

function getUserLocation() {
  const geoLocationFetchUrl = geoLocationUrl + apiKey;
  fetch(geoLocationFetchUrl, {
    method: "POST",
    body: JSON.stringify(fetchJson),
  }).then(function(response) {
    return response.json()}).then(function(jsonResponse) {
    return jsonResponse.location;
  });
}

async function setDefaultValue() {
  const location = getUserLocation();
  const lat = location.lat;
  const lng = location.lng;
  const state = getUserState(lat, lng);
  return state;
}



