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

// Maps the numerical value of the state to data used to create
// needed to create geoJson map of the state.
const states = {
  '06': {
    lat: 38,
    lng: -120,
    zoomLevel: 6,
  },
  '34': {
    lat: 40.25,
    lng: -75,
    zoomLevel: 8,
  },
};

function passQuery() {
  document.getElementById('map-title').innerText = '';
  am4core.disposeAllCharts();
  document.getElementById('more-info').innerText = 'Please wait. Loading...';
  document.getElementById('result').style.display = 'block';

  const query = new FormData(document.getElementById('query-form'));

  const personTypeInput = query.get('person-type');
  const actionInput = query.get('action');
  const locationInput = query.get('location');

  const personType = document.querySelector(
    '#person-type option[value=\'' + personTypeInput + '\']').dataset.value;
  const action = document.querySelector(
      '#action option[value=\'' + actionInput + '\']').dataset.value;
  const location = document.querySelector(
    '#location option[value=\'' + locationInput + '\']').dataset.value;

  const actionToText = new Map();
  actionToText['moved'] = 'moved to';
  if (actionToText.has(action)) {
    action = actionToText[action];
  }
  const description = {action: action, age: personType};
  const isCountyQuery = location !== 'state';
  const region = isCountyQuery ? locationInput + ' county' : 'U.S. state';
  let title = 'Population who ' + action;
  if (action === 'moved') {
    title += ' to ';
  } else {
    title += ' in ';
  }
  title += 'each ' + region + ' (' + personType.replace('-', ' ') + ')';
  document.getElementById('map-title').innerText = title;

  const fetchUrl = '/query?person-type=' + personType +
    '&action=' + action +
    '&location=' + location;

  fetch(fetchUrl)
    .then((response) => {
      if (response.ok) {
        response.json().then((jsonResponse) => JSON.parse(jsonResponse))
        .then((censusDataArray) => {
          // censusDatadata is a 2D array, where the first row is a header row and all
          // subsequent rows are one piece of data (e.g. for a state or county)
          displayVisualization(censusDataArray, description, location, isCountyQuery);
          document.getElementById('more-info').innerText = '';
        });
      } else {
        displayError(response.status, response.statusText);
      }
    });
}

function getGeoData(location, isCountyQuery) {
  if (isCountyQuery) {
    return location ===
        '06' ? am4geodata_region_usa_caLow : am4geodata_region_usa_njLow;
  } else {
    return am4geodata_usaLow;
  }
}


function displayVisualization(censusDataArray, description, location, isCountyQuery) {
  let geoData = getGeoData(location, isCountyQuery);
  if (isCountyQuery) {
    setStyleForCountyQuery();
    const mapsData = getMapsData(censusDataArray);
    const amChartsData = createDataArray(censusDataArray, isCountyQuery);
    displayAmChartsMap(amChartsData, description,geoData);
    displayCountyGeoJson(mapsData, location);
  } else {
    setStyleForStateQuery();
    const amChartsData = createDataArray(censusDataArray, isCountyQuery);
    displayAmChartsMap(amChartsData, description, geoData);
  }
  document.getElementById('more-info').innerText = '';
}

// Check that the input being written to a datalist can match one of its options
// Note: assumes that the input list has id equal to the datalist's id + '-list'
function validateInput(dataListId) {
  const datalist = document.getElementById(dataListId);
  const inputlist = document.getElementById(dataListId+'-list');
  const options = datalist.options;
  const typedSoFar = inputlist.value.toLowerCase();

  for (const option of options) {
    if (option.value.toLowerCase().includes(typedSoFar)) {
      inputlist.className = 'input-valid'; // At least one match present
      return;
    }
  }
  // Didn't find any matches
  inputlist.className = 'input-invalid';
}

// Display an error on the front end
function displayError(status, statusText) {
  document.getElementById('map').innerHTML = '';
  document.getElementById('more-info').innerText = `Error ${status}: ${statusText}`;
}

function displayAmChartsMap(data, description, geoData) {
  am4core.useTheme(am4themes_animated);
  const chart = am4core.create('amCharts', am4maps.MapChart);
  chart.height = 550;
  chart.zoomControl = new am4maps.ZoomControl();
  // only allow zooming with buttons
  chart.mouseWheelBehavior = 'none';
  chart.geodata = geoData;
  // Add button to zoom out
  const home = chart.chartContainer.createChild(am4core.Button);
  home.label.text = 'Home';
  home.align = 'right';
  home.events.on('hit', function(ev) {
    chart.goHome();
  });

  chart.projection = new am4maps.projections.AlbersUsa();
  const polygonSeries = chart.series.push(new am4maps.MapPolygonSeries());

  // Set min/max fill color for each area
  polygonSeries.heatRules.push({
    property: 'fill',
    target: polygonSeries.mapPolygons.template,
    min: chart.colors.getIndex(1).brighten(1),
    max: chart.colors.getIndex(1).brighten(-0.3),
    logarithmic: true,
  });
  polygonSeries.useGeodata = true;
  polygonSeries.data = data;

  // Set up heat legend
  const heatLegend = chart.createChild(am4maps.HeatLegend);
  heatLegend.series = polygonSeries;
  heatLegend.align = 'right';
  heatLegend.valign = 'bottom';
  heatLegend.height = am4core.percent(80);
  heatLegend.orientation = 'vertical';
  heatLegend.valign = 'middle';
  heatLegend.marginRight = am4core.percent(4);
  heatLegend.valueAxis.renderer.opposite = true;
  heatLegend.valueAxis.renderer.dx = - 25;
  heatLegend.valueAxis.strictMinMax = false;
  heatLegend.valueAxis.fontSize = 9;
  heatLegend.valueAxis.logarithmic = true;

  // Configure series tooltip
  const polygonTemplate = polygonSeries.mapPolygons.template;
  let descriptionString = 'Population of people ' +
    description.age + ' who ' + description.action;
  // make it moved to
  if (description.action === 'moved') {
    descriptionString += ' to';
  }
  polygonTemplate.tooltipText = '{name}\n' + descriptionString + ': {value}';
  polygonTemplate.nonScalingStroke = true;
  polygonTemplate.strokeWidth = 0.5;

  // Create hover state and set alternative fill color
  const hs = polygonTemplate.states.create('hover');
  hs.properties.fill = am4core.color('#3c5bdc');

  // heat legend behavior
  polygonSeries.mapPolygons.template.events.on('over', function(event) {
    handleHover(event.target);
  });
  polygonTemplate.events.on('hit', function(event) {
    chart.zoomToMapObject(event.target);
  });
  function handleHover(column) {
    if (!isNaN(column.dataItem.value)) {
      heatLegend.valueAxis.showTooltipAt(column.dataItem.value);
    } else {
      heatLegend.valueAxis.hideTooltip();
    }
  }
  polygonSeries.mapPolygons.template.events.on('out', function(event) {
    heatLegend.valueAxis.hideTooltip();
  });
}

// Note the value of a field and then empty it.
let storedVal = '';
function storeValueAndEmpty(dataListId) {
  const inputlist = document.getElementById(dataListId+'-list');
  storedVal = inputlist.value;
  inputlist.value = '';
}

// If a field is empty, replace it with the value it had directly prior to
// being emptied. Since this function is called on focus out, it will always
// be called directly after storeValueAndEmpty, which is called on focus in.
// Therefore, the most recently stored value will always be the one we want.
function replaceValueIfEmpty(dataListId) {
  const inputlist = document.getElementById(dataListId+'-list');
  const typedSoFar = inputlist.value;
  if (typedSoFar === '') {
    inputlist.value = storedVal;
  }
}

function getLocationId(location, isCountyQuery, regionIndex) {
  if (isCountyQuery) {
    return location[regionIndex] + location[regionIndex + 1];
  }
  return stateInfo[location[regionIndex]].ISO;
}

// createDataArray takes in the data array returned by the census API
// and reformats it into a data table for amCharts.
function createDataArray(censusDataArray, isCountyQuery) {
  const vizDataArray = [];
  // first row is headers
  const regionIndex = censusDataArray[0].indexOf('state');
  censusDataArray = censusDataArray.splice(1); // get rid of header row
  // Check to see if an extra calculation for percentages is needed
  if (checkPercentage(censusDataArray[0])) {
    censusDataArray.forEach((location) => {
      vizDataArray.push({
        id: getLocationId(location, isCountyQuery, regionIndex),
        value: percentToTotal(location[1], location[2])});
    });
  } else {
    censusDataArray.forEach((location) => {
      vizDataArray.push({
        id: getLocationId(location, isCountyQuery, regionIndex),
        value: location[1]});
    });
  }
  return vizDataArray;
}

// percentToTotal takes in the total number of people in a category
// and the percentage and returns the total
function percentToTotal(totalNumber, percentage) {
  return (totalNumber/100) * percentage;
}

// checkPercentage() Takes in the header of a census query and returns
// whether or not the total needs to be calculated using the
// percentToTotal() function
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

// Returns an object containing all of the relevant data in order
// to render the geoJson map of the counties.
function getMapsData(censusDataArray) {
  let countyToPopMap = new Map();
  let populationsList = [];
  Array.prototype.forEach.call(censusDataArray, (county) => {
    if (county[0] !== "NAME") {
      // The current county strings are in a layout like this: 
      // "Contra Costa County, California"
      // and we need to get them like this "Contra Costa"
      let countyAndStateArray = county[0].split(','); 
      // ^^ ["Contra Costa County", "California"]
      let countyArray = countyAndStateArray[0].split(' '); 
      // ^^ ["Contra", "Costa", "County"]
      let countyString = "";
      let i;
      // Get all strings except for the last one
      for (i = 0; i < countyArray.length - 1; i++) {
        countyString += countyArray[i];
        if (i !== countyArray.length - 2) {
          countyString += " ";
        }
      }
      // Map the population to the county
      countyToPopMap[countyString] = county[1];
      populationsList.push(parseInt(county[1]));
      }
    });
  let minAndMax = getMinAndMaxPopulation(populationsList);
  return {map: countyToPopMap, minValue: minAndMax.min, maxValue: minAndMax.max};
}

// Returns an object with the min and max population of the 
// populations returned by the census API. 
function getMinAndMaxPopulation(populationArray) {
  let max = populationArray[0];
  let min = 0;
  let i;
  for (i = 1; i < populationArray.length; i++) {
    if (populationArray[i] > max) {
      max = populationArray[i];
    } else if (populationArray[i] < min) {
      min = populationArray[i];
    }
  }
  return {max: max, min: min};
}

// Takes in mapsData object which has a data structure that maps
// counties to populations, a max population, and a min population. 
// Initializes the geoJson and adds multiple event listeners.
function displayCountyGeoJson(mapsData, stateName) {
  let map = new google.maps.Map(document.getElementById('map'), {
		zoom: states[stateName].zoomLevel,
    center: {lat: states[stateName].lat, lng: states[stateName].lng}
  }); 

  let countyToPopMap = mapsData.map;
  let maxPopulation = mapsData.maxValue;
  let minPopulation = mapsData.minValue;
  let f = chroma.scale(['white', 'blue']).domain([minPopulation, maxPopulation]);
  let geoData = getGeoData(stateName, true);

  map.data.addGeoJson(geoData);
  map.data.forEach(function(feature) {
    map.data.setStyle(feature => {
      return {
        fillColor: f(countyToPopMap[feature.j.name]).toString()
      };
    });
  });

 	let openInfoWindows = [];
  map.data.addListener('mouseover', function(event) {
    map.data.overrideStyle(event.feature, {
      fillColor: "#00ffff"
    });
    let contentString = '<p>' + event.feature.j.name + '</p><p>Population: ' 
      + countyToPopMap[event.feature.j.name];
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

// Functions to toggle between amcharts and maps.
function showGeoJson() {
  const mapElement = document.getElementById('map');
  const amChartsElement = document.getElementById('amCharts');
  amChartsElement.style.display = 'none';
  mapElement.style.display = 'block';
}

function showAmCharts() {
  const mapElement = document.getElementById('map');
  const amChartsElement = document.getElementById('amCharts');
  mapElement.style.display = 'none';
  amChartsElement.style.display = 'block';
}

// Sets up the webpage for a county query. Displays buttons and 
// sets amcharts as the default visible map.
function setStyleForCountyQuery() {
  const buttonsDiv = document.getElementById('buttons');
  buttonsDiv.style.display = 'block';
  const chartsDiv = document.getElementById('amCharts');
  chartsDiv.style.display = 'block';
}

// Sets up the webpage for a state query. Hides buttons and 
// sets amCharts as the only visible map.
function setStyleForStateQuery() {
  const buttonsDiv = document.getElementById('buttons');
  buttonsDiv.style.display = 'none';
  const mapsDiv = document.getElementById('map');
  mapsDiv.style.display = 'none';
  const amChartsDiv = document.getElementById('amCharts');
  amCharts.style.display = 'block';
}

