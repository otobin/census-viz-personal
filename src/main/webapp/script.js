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
          // data is a 2D array, where the first row is a header row and all
          // subsequent rows are one piece of data (e.g. for a state or county)
          const data = createDataArray(censusDataArray, isCountyQuery);
          displayAmChartsMap(data, description, location, isCountyQuery);
          document.getElementById('more-info').innerText = '';
        });
      } else {
        displayError(response.status, response.statusText);
      }
    });
}

function displayAmChartsMap(data, description, location, isCountyQuery) {
  am4core.useTheme(am4themes_animated);
  const chart = am4core.create('map', am4maps.MapChart);
  chart.height = 550;
  chart.zoomControl = new am4maps.ZoomControl();
  // only allow zooming with buttons
  chart.mouseWheelBehavior = 'none';

  // Create map instance
  if (isCountyQuery) {
    chart.geodata = location ===
        '06' ? am4geodata_region_usa_caLow : am4geodata_region_usa_njLow;
  } else {
    chart.geodata = am4geodata_usaLow;
  }

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
  document.getElementById('more-info').innerText =
      `Error ${status}: ${statusText}`;
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
// and reformats it into a data table for the visualization API.
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
