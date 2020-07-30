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
  document.getElementById('map-title').innerText = '';
  document.getElementById('more-info').innerText = 'Please wait. Loading...';
  document.getElementById('result').style.display = 'block';

  const query = new FormData(document.getElementById('query-form'));
  const personType = query.get('person-type');
  const action = query.get('action');
  const actionToText = new Map();
  actionToText['moved'] = 'moved to';
  if (actionToText.has(action)) {
    action = actionToText[action];
  } 
  const description = {action: action, age: personType};

  const locationName = query.get('location');
  const location = document.querySelector(
    '#location option[value=\''+locationName+'\']').dataset.value;

  const region =
      location === 'state' ? 'U.S. state' : 'State Name county';
  const title = 'Population who ' + action +
      ' in each ' + region + ' (' + personType.replace('-', ' ') + ')';

  const fetchUrl = '/query?person-type=' + personType +
      '&action=' + action +
      '&location=' + location;
  fetch(fetchUrl)
    .then((response) => {
      if (response.ok) {
        response.json().then((jsonResponse) => JSON.parse(jsonResponse))
        .then((data) => {
          // data is a 2D array, where the first row is a header row and all
          // subsequent rows are one piece of data (e.g. for a state or county)
          displayVisualization(data, description, title);
        });
      } else {
        displayError(response.status, response.statusText);
      }
    });
}

// Display an error on the front end
function displayError(status, statusText) {
  document.getElementById('map').innerHTML = '';
  document.getElementById('more-info').innerText = `Error ${status}: ${statusText}`;
}

// displayVisualization takes in a data array representing the 2D array
// returned  by the census API. The first row in the census Data array
// is the header, which describes the type of data.
// Eg: Header for the query that finds for populations of all counties is
// ["NAME","S0201_001E","state","county"]
function displayVisualization(censusDataArray, description, title) {
  const dataLength = censusDataArray[0].length;
  // Check to see that it's not a county query
  if (censusDataArray[0][dataLength - 1] !== 'county') {
    google.charts.setOnLoadCallback(drawRegionsMap(censusDataArray,
      description, title));
  } else {
    // We currently do not have counties implemented
    displayError(400, 'We do not support this visualization yet.');
  }
}

// Takes in a 2D array from the census API and displays the visualization
function drawRegionsMap(censusDataArray, description, title) {
  const shortDataArray = createDataArray(censusDataArray, description);
  const data = google.visualization.arrayToDataTable(shortDataArray);
  const options = {
    'region': 'US',
    'height': 550,
    'resolution': 'provinces',
    'colorAxis': {colors: ['white', 'blue']},
  };
  document.getElementById('map-title').innerText = title;
  const mapElement = document.getElementById('map');
  const chart = new google.visualization.GeoChart(mapElement);
  chart.draw(data, options);
  const mapNote = 'Populations are in thousands';
  document.getElementById('more-info').innerHTML = mapNote;
}

// createDataArray takes in the data array returned by the census API
// and reformats it into a data table for the visualization API.
function createDataArray(censusDataArray, description) {
  const vizDataArray = [];
  // Check to see if an extra calculation for percentages is needed
  if (checkPercentage(censusDataArray[0])) {
    censusDataArray.forEach((state) => {
      vizDataArray.push([state[0], percentToTotal(state[1], state[2])]);
    });
  } else {
    censusDataArray.forEach((state) => {
      vizDataArray.push([state[0], state[1]/1000]);
    });
  }
  // Changes the header of the vizDataArray to match Visualization API
  vizDataArray[0][0] = 'State';
  // Add a more accurate descriptor for each state
  vizDataArray[0][1] = 'Population of people ' +
    description.age + ' who ' + description.action;
  // make it moved to
  if (description.action === 'moved') {
    vizDataArray[0][1] += ' to';
  }
  return vizDataArray;
}

// percentToTotal takes in the total number of people in a category
// and the percentage and returns the total
function percentToTotal(totalNumber, percentage) {
  return (totalNumber/100) * percentage;
}

// checkPercentage() Takes in the header of a census query and returns 
// whether or not the total needs to be calculated using the percentToTotal() function
function checkPercentage(headerColumn) {
  // percentageQueries is a list of queries that return percents and not raw
  // data. It is hard coded for now.
  const percentageQueries = ['S0201_157E', 'S0201_126E'];
  let i;
  // Iterate through all the data variables in the header.
  // Eg: ["NAME","S0201_119E","S0201_126E","state"]
  // We need to return true
  for (i = 1; i < headerColumn.length - 1; i++) {
    // if the current data is in the percentage array
    if (percentageQueries.indexOf(headerColumn[i]) > -1) {
      return true;
    }
  }
  return false;
}

function resizeVisualization() {
  passQuery();
}

window.addEventListener('resize', resizeVisualization);


//Todo: write a function that creates a json object that gives the corresponding file path
//, coordinates to center the map, and other necessary info.
function displayCountyGeoJson(censusData, state) {
  let map = new google.maps.Map(document.getElementById("map"), {
		zoom: state.zoomLevel,
    center: {lat: state.lat, lng: state.lng}
  }); 
  let countyToPopMap = new Map();
  censusData.forEach((county) => {
    if (county[3] !== "NAME") {
      let countyAndStateArray = county[3].split(',');
      let countyArray = countyAndStateArray[0].split(' ');
      let countyString = "";
      let i;
      for (i = 0; i < countyArray.length - 1; i++) {
        countyString += countyArray[i];
        if (i !== countyArray.length - 2) {
          countyString += " ";
        }
      }
      // Map the population to the county
      countyToPopMap[countyString] = county[1];
      }
    });
  let f = chroma.scale(['white', 'blue']).domain([0, 3000000]);
  map.data.loadGeoJson(state.filePath, {}, function(features) {
  	map.data.forEach(function(feature) {
      map.data.setStyle(feature => {
      	return {
        	fillColor: f(countyToPopMap[feature.j.name]).toString()
        };
    	});
    });
  });
 	let openInfoWindows = [];
  map.data.addListener('mouseover', function(event) {
    map.data.overrideStyle(event.feature, {
      fillColor: "#00ffff"
    });
    let contentString = '<p>' + event.feature.j.name + '</p><p>Population: ' + countyToPopMap[event.feature.j.name]
		let infoWindow = new google.maps.InfoWindow({
    	content: contentString,
      maxWidth: 100
    });
    infoWindow.setPosition(event.latLng);
    infoWindow.open(map);
    openInfoWindows.push(infoWindow);
  });
  map.data.addListener('mouseout', function(event) {
  	map.data.revertStyle();
    let i;
    for (i = 0; i < openInfoWindows.length; i++) {
    	openInfoWindows[i].close();
    }
  });
}
