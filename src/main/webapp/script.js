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

const states = {
  'California': {
    number: '06',
    geoData: am4geodata_region_usa_caLow,
  },
  'New Jersey': {
    number: '34',
    geoData: am4geodata_region_usa_njLow,
  },
};

function passQuery() {
  document.getElementById('map-title').innerText = '';
  am4core.disposeAllCharts();
  document.getElementById('result').style.display = 'block';
  const information = document.getElementById('more-info');
  information.innerText = 'Please wait. Loading...';

  const query = new FormData(document.getElementById('query-form'));
  const personType = query.get('person-type');
  const action = query.get('action');

  const locationName = query.get('location');
  const location = document.querySelector(
      '#location option[value=\''+locationName+'\']').dataset.value;

  const isCountyQuery = location !== 'state'
  const region = isCountyQuery ? locationName + ' county' : 'U.S. state';
  const title = 'Population who ' + action +
      ' in each ' + region + ' (' + personType.replace('-', ' ') + ')';
  document.getElementById('map-title').innerText = title;
  
  let fetchUrl = '/query?person-type=' + personType +
    '&action=' + action +
    '&location=' + location;

  if (isCountyQuery) {
    fetchUrl += '&state-number=' + states[locationName].number;
  } else {
    fetchUrl += '&state-number='
  }
  
  fetch(fetchUrl)
    .then((response) => {
      if (response.ok) {
        response.json().then((jsonResponse) => JSON.parse(jsonResponse))
        .then((data) => {
          // data is a 2D array, where the first row is a header row and all
          // subsequent rows are one piece of data (e.g. for a state or county)
          information.innerText = '';

          if(isCountyQuery) {
            displayAmChartsMap(data, locationName);
          } else {
            displayVisualization(data);
          }
        });
      } else {
        console.log(
          `An error occurred: ${response.status}: ${response.statusText}`);
      }
    });
}

function displayAmChartsMap(data, stateName) {
  am4core.useTheme(am4themes_animated);
  const chart = am4core.create('map', am4maps.MapChart);
  chart.height = 550;

  // Create map instance
  chart.geodata = states[stateName].geoData;
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

  const countyData = data.map((value) => {
      return {id: value[2] + value[3], value: value[1]};
  });
  polygonSeries.data = countyData;

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
  polygonTemplate.tooltipText = '{name}: {value}';
  polygonTemplate.nonScalingStroke = true;
  polygonTemplate.strokeWidth = 0.5;

  // Create hover state and set alternative fill color
  const hs = polygonTemplate.states.create('hover');
  hs.properties.fill = am4core.color('#3c5bdc');


  // heat legend behavior
  polygonSeries.mapPolygons.template.events.on('over', function(event) {
    handleHover(event.target);
  });
  polygonSeries.mapPolygons.template.events.on('hit', function(event) {
    handleHover(event.target);
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
    const errorMessage = 'We do not support this visualization yet';
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
    'height': 550,
    'resolution': 'provinces',
    'colorAxis': {colors: ['white', 'blue']},
  };
  const mapElement = document.getElementById('map');
  const chart = new google.visualization.GeoChart(mapElement);
  chart.draw(data, options);
  const mapNote = 'Populations are in thousands';
  document.getElementById('more-info').innerHTML = mapNote;
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

function resizeVisualization() {
  passQuery();
}

window.addEventListener('resize', resizeVisualization);
