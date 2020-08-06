// Return geoJson for a given location. Load the geodata file if not already
// loaded for the location.
async function getGeoData(location, isCountyQuery) {
  if (isCountyQuery) {
    const abbrev = stateInfo[location].ISO.replace(/US-/, '').toLowerCase();
    if (!stateInfo[location].geoJsonLoaded) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        document.body.appendChild(script);
        script.onload = resolve;
        script.onerror = reject;
        script.async = true;
        script.src =
        `https://www.amcharts.com/lib/4/geodata/region/usa/${abbrev}Low.js`;
      });
      stateInfo[location].geoJsonLoaded = true;
    }
    return window['am4geodata_region_usa_' + abbrev + 'Low'];
  } else {
    return am4geodata_usaLow;
  }
}

let amChartsData;
let globalDescription;
let globalGeoData;
// Display amCharts and geoJson visulizations for given data.
async function displayVisualization(censusDataArray, description,
  location, isCountyQuery) {
  // set global variables
  document.getElementById('colors').style.display = 'block';
  globalGeoData = await getGeoData(location, isCountyQuery);
  setStyle(isCountyQuery);
  amChartsData = createDataArray(censusDataArray, isCountyQuery);
  globalDescription = description;
  drawTable(amChartsData, isCountyQuery);
  if (isCountyQuery) {
      const mapsData = getMapsData(censusDataArray);
      displayAmChartsMap(amChartsData, globalDescription, globalGeoData, '#3c5bdc');
      displayCountyGeoJson(mapsData, location);
  } else {
      displayAmChartsMap(amChartsData, description, globalGeoData, '#3c5bdc');
  }
  document.getElementById('more-info').innerText = '';
}

// Create and display amcharts map using data and geoData.
function displayAmChartsMap(data, description, geoData, color) {
  am4core.useTheme(am4themes_animated);
  const chart = am4core.create('am-charts', am4maps.MapChart);
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
    min: am4core.color(color).brighten(1),
    max: am4core.color(color).brighten(-0.3),
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
  hs.properties.fill = am4core.color(color);

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

// Get the location id used by amCharts geoJson file for a given location.
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
  censusDataArray = censusDataArray.slice(1); // get rid of header row
  // Check to see if an extra calculation for percentages is needed
  if (checkPercentage(censusDataArray[0], isCountyQuery)) {
    censusDataArray.forEach((location) => {
      vizDataArray.push({
        id: getLocationId(location, isCountyQuery, regionIndex),
        name: location[0],
        value: percentToTotal(location[1], location[2])});
    });
  } else {
    censusDataArray.forEach((location) => {
      vizDataArray.push({
        id: getLocationId(location, isCountyQuery, regionIndex),
        name: location[0],
        value: location[1]});
    });
  }
  return vizDataArray;
}

// percentToTotal takes in the total number of people in a category
// and the percentage and returns the total
function percentToTotal(totalNumber, percentage) {
  return Math.round((totalNumber/100) * percentage);
}

// checkPercentage() Takes in the header of a census query and returns
// whether or not the total needs to be calculated using the
// percentToTotal() function
function checkPercentage(headerColumn, isCountyQuery) {
  // Queries that are percentages will have two columns of numbers instead
  // of one, where one is a total number and one is a number between 0 and 100
  // (which represents the percentage of the total).
  // County queries always have one more column (to list both county and state)
  if ((!isCountyQuery && headerColumn.length !== 4) ||
      (isCountyQuery && headerColumn.length !== 5)) {
    return false;
  }
  const firstNum = Number(headerColumn[1]);
  const secondNum = Number(headerColumn[2]);
  return !(isNaN(firstNum) || isNaN(secondNum)) &&
      ((firstNum > 100 && secondNum >= 0 && secondNum <= 100) ||
      (secondNum > 100 && firstNum >= 0 && firstNum <= 100));
}

// Returns an object containing all of the relevant data in order
// to render the geoJson map of the counties.
function getMapsData(censusDataArray) {
  const countyToPopMap = new Map();
  const populationsList = [];
  // Get rid of the header
  const censusArray = censusDataArray.slice(1);
  censusArray.forEach( (county) => {
    // The current county strings are in a layout like this:
    // "Contra Costa County, California"
    // and we need to get them like this "Contra Costa"
    const countyAndStateArray = county[0].split(',');
    // ^^ ["Contra Costa County", "California"]
    const countyArray = countyAndStateArray[0].split(' ');
    // ^^ ["Contra", "Costa", "County"]
    let countyString = '';
    let i;
    // Get all strings except for the last one
    for (i = 0; i < countyArray.length - 1; i++) {
      countyString += countyArray[i];
      if (i !== countyArray.length - 2) {
        countyString += ' ';
      }
    }
    // Map the population to the county
    countyToPopMap[countyString] = county[1];
    populationsList.push(parseInt(county[1]));
    });
  const minAndMax = getMinAndMaxPopulation(populationsList);
  mapData = {map: countyToPopMap,
    minValue: minAndMax.min, maxValue: minAndMax.max};
  return mapData;
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

let map;
// Takes in mapsData object which has a data structure that maps
// counties to populations, a max population, and a min population.
// Initializes the geoJson and adds multiple event listeners.
async function displayCountyGeoJson(mapsData, stateNumber) {
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: stateInfo[stateNumber].zoomLevel,
    center: {lat: stateInfo[stateNumber].lat, lng: stateInfo[stateNumber].lng},
  });

  countyToPopMap = mapsData.map;
  const maxPopulation = mapsData.maxValue;
  const minPopulation = mapsData.minValue;
  const colorScale = chroma.scale(['white', 'blue']).domain([minPopulation,
    maxPopulation]);
  const geoData = await getGeoData(stateNumber, true);
  
  map.data.addGeoJson(geoData);
  map.data.forEach(function(feature) {
    map.data.setStyle((feature) => {
      return {
        fillColor: colorScale(countyToPopMap[feature.j.name]).toString(),
      };
    });
  });

  const openInfoWindows = [];
  map.data.addListener('mouseover', function(event) {
    map.data.overrideStyle(event.feature, {
      fillColor: '#00ffff',
    });
    const contentString = '<p>' + event.feature.j.name +
    '<p>Population: ' + countyToPopMap[event.feature.j.name];
    const infoWindow = new google.maps.InfoWindow({
      content: contentString,
      maxWidth: 100,
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
function toggle(divToShow, divToHide) {
  const visibleElement = document.getElementById(divToShow);
  const hiddenElement = document.getElementById(divToHide);
  hiddenElement.style.display = 'none';
  visibleElement.style.display = 'block';
}

// Sets up the webpage for the appropriate query.
function setStyle(isCountyQuery) {
  if (isCountyQuery) {
    const buttonsDiv = document.getElementById('buttons');
    buttonsDiv.style.display = 'block';
  } else {
    const buttonsDiv = document.getElementById('buttons');
    buttonsDiv.style.display = 'none';
  }
  const chartsDiv = document.getElementById('am-charts');
  chartsDiv.style.display = 'block';
  const mapsDiv = document.getElementById('map');
  mapsDiv.style.display = 'none';
}

function changeColor(colorParam) {
  if (typeof map !== 'undefined') {
    const colorScale = chroma.scale(['white', colorParam.value]).domain([mapData.minValue,
      mapData.maxValue]);
    map.data.forEach(function(feature) {
      map.data.setStyle((feature) => {
        return {
          fillColor: colorScale(mapData.map[feature.j.name]).toString(),
        };
      });
    });
  }
  displayAmChartsMap(amChartsData, globalDescription, globalGeoData, colorParam.value);
}

// Draw data table using Visualization API
function drawTable(dataArray, isCountyQuery) {
  google.charts.load('current', {'packages': ['table']});
  google.charts.setOnLoadCallback(() => {
    const data = new google.visualization.DataTable();
    const nameHeader = isCountyQuery ? 'County' : 'State';
    data.addColumn('string', nameHeader);
    data.addColumn('number', 'Population');
    dataArray.forEach((elem) => {
      data.addRow([elem.name, parseInt(elem.value)]);
    });
    const table = new google.visualization.Table(
        document.getElementById('data-table'));
    table.draw(data, {
      width: '30%', 
      height: '100%',
      cssClassNames: {headerRow: 'data-table-header'},});
  });
}

// Show/hide the raw data table.
function toggleDataTable() {
  const dataTable = document.getElementById('data-table');
  if (window.getComputedStyle(dataTable)
      .getPropertyValue('display') === 'none') {
    dataTable.style.display = 'inline';
    document.getElementById('toggle-data-btn').innerText = 'Hide raw data';
  } else {
    dataTable.style.display = 'none';
    document.getElementById('toggle-data-btn').innerText = 'Display raw data';
  }

  const chartsDiv = document.getElementById('am-charts');
  chartsDiv.style.display = 'block';
  const mapsDiv = document.getElementById('map');
  mapsDiv.style.display = 'none';
}

// Display link to data.census.gov table for the table the displayed
// data is from.
function displayLinkToCensusTable(tableLink) {
  const linkElem = document.getElementById('census-link');
  linkElem.style.display = 'block';
  linkElem.setAttribute('href', tableLink);
}
