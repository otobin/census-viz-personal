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
          // data is a 2D array, where the first row is a header row and all
          // subsequent rows are one piece of data (e.g. for a state or county)
          displayVisualization(data);
        });
      } else {
        console.log('There was an error');
      }
    });
}

 // displayVisualization takes in a data array representing the 2D array returned by the 
 // census API. The function creates the necessary visualization with the census data.
function displayVisualization(censusDataArray) {
  if (censusDataArray[0][2] == 'state' && censusDataArray[0][3] != 'county') {
    google.charts.setOnLoadCallback(drawRegionsMap(censusDataArray));
  } else {
    // We currently do not have counties implemented
    document.getElementById('map').innerHTML = "";
    document.getElementById('more-info').innerHTML = 'We do not have this information yet.'
  }
}

// Takes in a 2D array from the census API and draws the appropriate visualization
function drawRegionsMap(censusDataArray) {
  const shortDataArray = createDataArray(censusDataArray);
  var data = google.visualization.arrayToDataTable(shortDataArray);
  var options = {
    'region': 'US',
    'resolution': 'provinces',
    'colorAxis': {colors: ['white', 'blue']}
  };
  var chart = new google.visualization.GeoChart(document.getElementById('map'));
  chart.draw(data, options);
  document.getElementById('more-info').innerHTML = 'These populations are divided by 1000';
}

// createDataArray takes in the data array returned by the census API and reformats it 
// into a data table that can be processed by the visualization API.
function createDataArray(censusDataArray) {
  const vizDataArray = [];
  censusDataArray.forEach((state) => {
    vizDataArray.push([state[0], state[1]/1000]);
  });
  vizDataArray[0][0] = 'State';
  vizDataArray[0][1] = 'Population';
  return vizDataArray;
}
