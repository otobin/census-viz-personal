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
      }
      else {
        console.log("There was an error");
      }
    });
}

// displayVisualization takes in a data array, which is a 2D array that 
function displayVisualization(dataArray) {
  google.charts.load('current', {
    'packages':['geochart'],
    // Note: you will need to get a mapsApiKey for your project.
    // See: https://developers.google.com/chart/interactive/docs/basic_load_libs#load-settings
    'mapsApiKey': 'AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY'
  });
  google.charts.setOnLoadCallback(drawRegionsMap(dataArray));
}

function drawRegionsMap(dataArray) {
  const shortDataArray = [];
  dataArray.forEach((state) => {
    shortDataArray.push([state[0], state[1]/1000]);
  });
  shortDataArray[0][0] = 'State';
  shortDataArray[0][1] = 'Population';
  console.log(shortDataArray);
  var data = google.visualization.arrayToDataTable(shortDataArray);

  var options = {
    'region': 'US',
    'resolution': 'provinces',
    'colorAxis': {colors: ['white', 'blue']}
  };

  var chart = new google.visualization.GeoChart(document.getElementById('visualization'));

  chart.draw(data, options);
}