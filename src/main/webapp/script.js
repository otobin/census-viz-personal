// Tell browser where to find service worker file,
// so the service worker script can run in background.
// We're using this service worker to intercept fetch requests.
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then(function(response) {
          // Service worker registration done
          console.log('Registration Successful', response);
        }, function(error) {
          // Service worker registration failed
          console.log('Registration Failed', error);
        });
  }
}
google.charts.load('current', {
  'packages': ['geochart'],
  'mapsApiKey': 'AIzaSyB5cba6r-suEYL-0E_nRQfXDtT4XW0WxbQ',
});

function passQuery() {
  const query = new FormData(document.getElementById('query-form'));
  const personType = query.get('person-type');
  const location = query.get('location');

  fetch('/query?person-type=' + personType + '&location=' + location)
      .then((response) => {
        if (response.ok) {
          response.json().then((jsonResponse) => JSON.parse(jsonResponse))
              .then((data) => {
                // data is a 2D array, where the first row is a header row
                // and all subsequent rows are one piece of data
                // (e.g. for a state or county)
                displayVisualization(data);
              });
        } else {
          console.log('There was an error');
        }
      });
}

// displayVisualization takes in a data array representing the 2D array
// returned  by the census API. The first row in the census Data array
// is the header, which describes the type of data.
// Eg: Header for the query that finds for populations of all counties is
// ["NAME","S0201_001E","state","county"]
function displayVisualization(censusDataArray) {
  if (censusDataArray[0][2] == 'state' && censusDataArray[0][3] != 'county') {
    google.charts.setOnLoadCallback(drawRegionsMap(censusDataArray));
  } else {
    // We currently do not have counties implemented
    const errorMessage = 'We do not support this visualiztation yet';
    document.getElementById('map').innerHTML = '';
    document.getElementById('more-info').innerHTML = errorMessage;
  }
}

// Takes in a 2D array from the census API and displays the visualization
function drawRegionsMap(censusDataArray) {
  const shortDataArray = createDataArray(censusDataArray);
  const data = google.visualization.arrayToDataTable(shortDataArray);
  const options = {
    'region': 'US',
    'resolution': 'provinces',
    'colorAxis': {colors: ['white', 'blue']},
  };
  const mapElement = document.getElementById('map');
  const chart = new google.visualization.GeoChart(mapElement);
  chart.draw(data, options);
  document.getElementById('more-info').innerHTML = 'Populations are in thousands.';
}

// createDataArray takes in the data array returned by the census API
// and reformats it into a data table for the visualization API.
function createDataArray(censusDataArray) {
  const vizDataArray = [];
  censusDataArray.forEach((state) => {
    vizDataArray.push([state[0], state[1]/1000]);
  });
  // Changes the header of the vizDataArray to match the Visualization API
  vizDataArray[0][0] = 'State';
  vizDataArray[0][1] = 'Population';
  return vizDataArray;
}