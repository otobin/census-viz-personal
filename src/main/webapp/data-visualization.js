// Return geoJson for a given location. Load the geodata file if not already
// loaded for the location.
async function getGeoData(locationInfo, isCountyQuery) {
  if (isCountyQuery) {
    const abbrev =
      stateInfo[locationInfo.stateNumber]
        .ISO.replace(/US-/, '').toLowerCase();
    if (!stateInfo[locationInfo.stateNumber].geoJsonLoaded) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        document.body.appendChild(script);
        script.onload = resolve;
        script.onerror = reject;
        script.async = true;
        script.src =
          `https://www.amcharts.com/lib/4/geodata/region/usa/${abbrev}Low.js`;
      });
      stateInfo[locationInfo.stateNumber].geoJsonLoaded = true;
    }
    return window['am4geodata_region_usa_' + abbrev + 'Low'];
  } else {
    return am4geodata_usaLow;
  }
}

// Create dropdown menu of coutnies in queried state
// for yearly population change in county chart.
function createCountyDropdown(geoDataFeatures) {
  const datalist = document.getElementById('county');
  geoDataFeatures = geoDataFeatures.reverse(); // Make dropdown alphabetical
  datalist.innerHTML = '';
  for (let i = 0; i < geoDataFeatures.length; i++) {
    const optionElem = document.createElement('option');
    optionElem.value = geoDataFeatures[i].properties.name;
    // Get the last 3 numbers in the 5 digit county ID, which is the county
    // number used by the Census API. (First 2 are state number)
    optionElem.setAttribute('data-value', geoDataFeatures[i].id.slice(2, 5));
    datalist.appendChild(optionElem);
  }
}

// Display amCharts and geoJson visulizations for given data.
async function displayVisualization(censusDataArray, description, title,
  locationInfo, isCountyQuery) {
  const color = getColor();
  document.getElementById('year-slider').style.display = 'block';
  document.getElementById('top-buttons').style.display = 'block';
  const geoData = await getGeoData(locationInfo, isCountyQuery);

  // Put all necessary data in the cache
  localStorage.setItem('geoData', JSON.stringify(geoData));
  localStorage.setItem('location', JSON.stringify(locationInfo));
  localStorage.setItem('description', description);
  localStorage.setItem('title', title);
  setStyle(isCountyQuery);
  const amChartsData = createDataArray(censusDataArray, isCountyQuery);
  localStorage.setItem('amChartsData', JSON.stringify(amChartsData));
  drawTable(amChartsData, description, isCountyQuery);

  if (isCountyQuery) {
    const mapsData = getMapsData(censusDataArray);
    localStorage.setItem(
      'mapsData',
      JSON.stringify(mapsData));
    displayAmChartsMap(
      amChartsData, locationInfo, description, title, geoData, color);
    displayCountyGeoJson(mapsData, description, locationInfo, geoData, color);
    createCountyDropdown(geoData.features);
  } else {
    displayAmChartsMap(
      amChartsData, locationInfo, description, title, geoData, color);
  }
  document.getElementById('more-info').innerText = '';
}

// Create and display amcharts map using data and geoData.
function displayAmChartsMap(
  data, locationInfo, description, title, geoData, color) {
  am4core.useTheme(am4themes_animated);
  const chart = am4core.create('am-charts', am4maps.MapChart);
  chart.height = 550;
  chart.zoomControl = new am4maps.ZoomControl();
  // only allow zooming with buttons
  chart.mouseWheelBehavior = 'none';
  chart.geodata = geoData;
  // Add button to zoom out
  const home = chart.chartContainer.createChild(am4core.Button);
  home.label.text = 'Reset zoom level';
  home.align = 'right';
  home.events.on('hit', function(ev) {
    chart.goHome();
  });

  // Title for graph
  const mapTitle = chart.titles.create();
  mapTitle.text = title;
  mapTitle.fontSize = 25;
  mapTitle.marginBottom = 60;
  mapTitle.paddingBottom = 60;

  // Allow export
  chart.exporting.menu = new am4core.ExportMenu();
  chart.exporting.menu.align = 'left';
  chart.exporting.menu.verticalAlign = 'top';
  chart.exporting.filePrefix = title;
  chart.exporting.adapter.add('data', function(data) {
    data.data = [];
    for (let i = 0; i < polygonSeries.data.length; i++) {
      const row = polygonSeries.data[i];
      data.data.push({
        id: row.id,
        name: row.name,
        value: row.value,
      });
    }
    return data;
  });
  chart.exporting.menu.items = [
    {
      'label': 'Download',
      'menu': [
        {
          'label': 'Image',
          'menu': [
            {'type': 'png', 'label': 'PNG'},
            {'type': 'jpg', 'label': 'JPG'},
            {'type': 'svg', 'label': 'SVG'},
            {'type': 'pdf', 'label': 'PDF'},
          ],
        }, {
          'label': 'Data',
          'menu': [
            {'type': 'json', 'label': 'JSON'},
            {'type': 'csv', 'label': 'CSV'},
            {'type': 'xlsx', 'label': 'XLSX'},
            {'type': 'html', 'label': 'HTML'},
            {'type': 'pdfdata', 'label': 'PDF'},
          ],
        }, {
          'label': 'Print', 'type': 'print',
        },
      ],
    },
  ];

  const isCountyQuery = data[0].id.indexOf('US') === -1;
  // Albers projection for state level, Mercator for county level
  if (isCountyQuery) {
    chart.projection = new am4maps.projections.Mercator();
  } else {
    chart.projection = new am4maps.projections.AlbersUsa();
  }
  const polygonSeries = chart.series.push(new am4maps.MapPolygonSeries());
  const moveDown = 50;
  polygonSeries.dy = moveDown; // shift map down to make room for title

  // Set min/max fill color for each area
  polygonSeries.heatRules.push({
    property: 'fill',
    target: polygonSeries.mapPolygons.template,
    min: am4core.color(color).brighten(1),
    max: am4core.color(color).brighten(-0.7),
    logarithmic: true,
  });

  addTooltipText(data, geoData.features, description);
  polygonSeries.useGeodata = true;
  polygonSeries.data = data;

  if (isCountyQuery &&
    stateInfo[locationInfo.stateNumber].name !== locationInfo.originalName) {
    // User searched for a specific point; put a marker there
    // Add an image layer to the map
    const imageSeries = chart.series.push(new am4maps.MapImageSeries());
    const imageTemplate = imageSeries.mapImages.template;
    imageTemplate.propertyFields.longitude = 'longitude';
    imageTemplate.propertyFields.latitude = 'latitude';
    imageTemplate.nonScaling = true;

    // Add a marker to the image layer
    const marker = imageTemplate.createChild(am4plugins_bullets.PointedCircle);
    marker.fill = am4core.color('#ea4335');
    marker.pointerLength = 23;
    marker.pointerBaseWidth = 12;
    marker.stroke = am4core.color('black');
    marker.strokeWidth = 2;
    marker.radius = 14;
    marker.dy = moveDown;
    marker.tooltipText = locationInfo.originalName;

    // Add shadow to the marker (for appearance)
    const shadow = imageTemplate.createChild(am4core.Circle);
    shadow.radius = 5;
    shadow.fill = am4core.color('#811411');
    shadow.zIndex = 1;
    shadow.dy = -36 + moveDown;

    // One location listing for the marker, one for the shadow (same location)
    imageSeries.data =
      [{'latitude': locationInfo.lat, 'longitude': locationInfo.lng},
      {'latitude': locationInfo.lat, 'longitude': locationInfo.lng}];
  }

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
  polygonTemplate.tooltipText = '{name}\n{tooltipText}';
  polygonTemplate.nonScalingStroke = true;
  polygonTemplate.strokeWidth = 0.5;

  // Create hover state and set alternative fill color
  const hs = polygonTemplate.states.create('hover');
  hs.properties.fill = am4core.color(color);

  // heat legend behavior
  polygonSeries.mapPolygons.template.events.on('over', function(event) {
    handleHover(event.target);
  });

  const allStatesMapOnHit = (event) => {
    chart.zoomToMapObject(event.target);
    const locationName = event.target.dataItem.dataContext.locationName;
    const locationNumber = document.querySelector(
      '#location option[value=\'' + locationName + '\']').dataset.value;
    setDropdownValue('location', locationNumber);
    submitQuery();
  };

  const countyMapOnHit = (event) => {
    chart.zoomToMapObject(event.target);
  };

  polygonTemplate.events.on('hit',
    isCountyQuery ? countyMapOnHit : allStatesMapOnHit);

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

// Add tooltip used for amCharts map to data
function addTooltipText(data, geoDataFeatures, description) {
  geoDataFeatures.forEach((location) => {
    const index = data.findIndex((elem) => elem.id === location.id);
    if (index !== -1) {
      data[index].tooltipText =
        `${description}: ${parseInt(data[index].value).toLocaleString()}`;
    } else {
      data.push({
        id: location.id,
        tooltipText: 'Data not available',
      });
    }
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
  censusDataArray.forEach((location) => {
    vizDataArray.push({
      id: getLocationId(location, isCountyQuery, regionIndex),
      locationName: location[0],
      value: location[1],
    });
  });
  return vizDataArray;
}

// Returns an object containing all of the relevant data in order
// to render the geoJson map of the counties.
function getMapsData(censusDataArray) {
  const countyToPopMap = new Map();
  const populationsList = [];
  // Get rid of the header
  const censusArray = censusDataArray.slice(1);
  censusArray.forEach((county) => {
    // The current county strings are in a layout like this:
    // "Contra Costa County, California"
    // and we need to get them like this "Contra Costa"
    const countyAndStateArray = county[0].split(',');
    // ^^ ["Contra Costa County", "California"]
    // Trim space and region suffix
    const countyRegex = new RegExp('( County| City and Borough|' +
        ' Borough| Municipality| Census Area| city| City| Parish)$');
    let countyString = countyAndStateArray[0].replace(countyRegex, '');
    if (countyString === 'District of Columbia') { // Handle D.C. name mismatch
      countyString = 'Washington, District of Columbia';
    }
    // Map the population to the county
    countyToPopMap[countyString] = county[1];
    populationsList.push(parseInt(county[1]));
  });
  const minAndMax = getMinAndMaxPopulation(populationsList);
  mapData = {
    map: countyToPopMap,
    minValue: minAndMax.min, maxValue: minAndMax.max,
  };
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


// Takes in mapsData object which has a data structure that maps
// counties to populations, a max population, and a min population.
// Initializes the geoJson and adds multiple event listeners.
async function displayCountyGeoJson(mapsData, description,
  locationInfo, geoData, color) {
  const state = stateInfo[locationInfo.stateNumber];
  const map = new google.maps.Map(document.getElementById('map'), {
    zoom: state.zoomLevel, center: {lat: state.lat, lng: state.lng},
  });

  if (state.name !== locationInfo.originalName) {
    // user searched for a specific point; put a marker there
    const marker = new google.maps.Marker({
      map: map,
      position: {lat: locationInfo.lat, lng: locationInfo.lng}, map: map,
    });
    const infowindow = new google.maps.InfoWindow({
      content: `<p>${locationInfo.originalName}<p>`,
    });
    marker.addListener('mouseover', () => {
      infowindow.open(map, marker);
    });
    marker.addListener('mouseout', () => {
      infowindow.close();
    });
  }

  const countyToPopMap = mapsData.map;
  const maxPopulation = mapsData.maxValue;
  const minPopulation = mapsData.minValue;
  const minColor = chroma(color).brighten(2);
  const maxColor = chroma(color).darken(2);
  const colorScale = chroma.scale([minColor, maxColor]).domain([minPopulation,
    maxPopulation]);

  map.data.addGeoJson(geoData);
  map.data.forEach(function(feature) {
    map.data.setStyle((feature) => {
      return {
        fillColor: colorScale(
          countyToPopMap[feature.j.name.replace('Saint', 'St.')]).toString(),
        fillOpacity: 0.5,
      };
    });
  });

  const openInfoWindows = [];
  map.data.addListener('mouseover', function(event) {
    map.data.overrideStyle(event.feature, {
      fillColor: maxColor,
    });
    let contentString;
    if (countyToPopMap[event.feature.j.name.replace('Saint', 'St.')] !==
      undefined) {
      contentString = '<p>' + event.feature.j.name +
        '<p>' + description + ': ' +
        parseInt(
          countyToPopMap[event.feature.j.name.replace('Saint', 'St.')])
          .toLocaleString();
    } else {
      contentString = '<p>' + event.feature.j.name +
        '<p>Data not available';
    }
    const infoWindow = new google.maps.InfoWindow({
      content: contentString,
      maxWidth: 100,
    });
    infoWindow.setPosition(event.latLng);
    infoWindow.open(map);
    openInfoWindows.push(infoWindow);
  }, {passive: true});
  map.data.addListener('mouseout', function(event) {
    map.data.revertStyle();
    let i;
    for (i = 0; i < openInfoWindows.length; i++) {
      openInfoWindows[i].close();
    }
  }, {passive: true});
}

// Toggle between amcharts and maps.
function toggleMap() {
  const checkbox = document.getElementById('map-toggle');
  if (checkbox.checked) {
    document.getElementById('edit-title-container').style.visibility = 'hidden';
    document.getElementById('am-charts').style.display = 'none';
    document.getElementById('map').style.display = 'block';
    document.getElementById('map-toggle-msg').innerText = 'Disable map overlay';
  } else {
    document.getElementById('edit-title-container').style.visibility =
        'visible';
    document.getElementById('map').style.display = 'none';
    document.getElementById('am-charts').style.display = 'block';
    document.getElementById('map-toggle-msg').innerText = 'Enable map overlay';
  }
}

// Sets up the webpage for the appropriate query.
function setStyle(isCountyQuery) {
  document.getElementById('toggle-data-btn').style.display = 'inline-block';
  const mapOptions = document.getElementById('map-options');
  const chartsDiv = document.getElementById('am-charts');
  const mapsDiv = document.getElementById('map');
  if (isCountyQuery) {
    mapOptions.style.display = 'inline';
    if (!document.getElementById('map-toggle').checked) {
      chartsDiv.style.display = 'block';
      mapsDiv.style.display = 'none';
    } else {
      mapsDiv.style.display = 'block';
      chartsDiv.style.display = 'none';
    }
  } else {
    mapOptions.style.display = 'none';
    chartsDiv.style.display = 'block';
    mapsDiv.style.display = 'none';
  }
}

// Changes the color of the current visualizations on the page.
function changeColor(colorParam) {
  const color = colorParam.value;
  document.getElementById('set-color-label').style.backgroundColor = color;
  localStorage.setItem('color', color);
  setButtonColor();

  // Get variables out of cache
  const cacheMapsData = JSON.parse(localStorage.getItem('mapsData'));
  const cacheGeoData = JSON.parse(localStorage.getItem('geoData'));
  const cacheAmCharts = JSON.parse(localStorage.getItem('amChartsData'));
  const cacheLocation = JSON.parse(localStorage.getItem('location'));
  const cacheDescription = localStorage.getItem('description');
  const cacheTitle = localStorage.getItem('title');
  // map is undefined on a state query, so check to be sure that
  // it is undefined before calling displayCountyGeoJson.
  am4core.disposeAllCharts();
  if (cacheLocation !== 'state') {
    displayCountyGeoJson(cacheMapsData, cacheDescription, cacheLocation,
      cacheGeoData, color);
    const yearStateData = JSON.parse(localStorage.getItem('yearStateData'));
    displayYearlyChart('yearly-total-chart', yearStateData, 
      cacheDescription, cacheLocation.stateNumber);
    if (document.getElementById('yearly-county-chart').style.display !== 'none') {
      const yearCountyData = JSON.parse(localStorage.getItem('yearCountyData'));
      const yearCounty = localStorage.getItem('yearCounty');
      displayYearlyChart('yearly-county-chart', yearCountyData,
        cacheDescription, yearCounty);
    }
  }
  displayAmChartsMap(cacheAmCharts, cacheLocation, cacheDescription, cacheTitle,
    cacheGeoData, color);
}

// Draw data table using Visualization API
function drawTable(dataArray, description, isCountyQuery) {
  // For some reason data array was changing, between here and
  // the for each loop used to populate the data table,
  // so I made a copy
  const dataArrayCopy = dataArray.slice();
  google.charts.load('current', {'packages': ['table']});
  google.charts.setOnLoadCallback(() => {
    const data = new google.visualization.DataTable();
    const nameHeader = isCountyQuery ? 'County' : 'State';
    data.addColumn('string', nameHeader);
    data.addColumn('number', description);
    dataArrayCopy.forEach((elem) => {
      data.addRow([elem.locationName, parseInt(elem.value)]);
    });
    const table = new google.visualization.Table(
      document.getElementById('data-table'));
    table.draw(data, {
      width: '30%',
      height: '100%',
      cssClassNames: {headerRow: 'data-table-header'},
    });
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
}

function displayYearlyChart(chartId, data, description, location) {
  const chart = am4core.create(chartId, am4charts.XYChart);
  chart.data = data;
  const dateAxis = chart.xAxes.push(new am4charts.DateAxis());
  dateAxis.dataFields.category = 'year';
  dateAxis.title.text = 'Year';
  dateAxis.gridIntervals.setAll([
    {timeUnit: 'year', count: 1},
  ]);
  const valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
  valueAxis.title.text = description;
  const series = chart.series.push(new am4charts.LineSeries());
  series.dataFields.valueY = 'value';
  series.dataFields.dateX = 'year';
  series.tooltip.getFillFromObject = true;
  series.tooltipText = '{valueY}';
  series.strokeWidth = 3;

  const color = getColor();
  series.stroke = am4core.color(color);
  series.yAxis = valueAxis;

  const bullet = series.bullets.push(new am4charts.CircleBullet());
  bullet.stroke = am4core.color('#fff');
  bullet.fill = am4core.color(color);
  bullet.strokeWidth = 4;
  bullet.tooltipText = '{valueY}';
  bullet.circle.radius = 8;

  const mapTitle = chart.titles.create();
  let title;
  const state = stateInfo[location];
  if (state != null) {
    title = `${description} in ${state.name} by year`;
  } else {
    title = `${description} in ${location} by year`;
  }
  mapTitle.text = title;
  document.getElementById(chartId).style.display = 'block';
}

// Create yearly state total population growth chart for the submitted query
async function createYearlyStateTotalChart(
  personType, action, location, description) {
  document.getElementById('year-data-header').style.display = 'block';
  document.getElementById('county-form').style.display = 'block';
  const personTypeNoun = document.querySelector(
    '#person-type option[data-value=\'' + personType + '\']').value;
  const actionVerb = document.querySelector(
    '#action option[data-value=\'' + action + '\']').value;
  document.getElementById('county-query-label').innerText =
    `How many ${personTypeNoun} ${actionVerb}`;
  const loadingMsg = document.getElementById('yearly-total-chart-loading-msg');
  loadingMsg.innerText = 'Yearly state data chart loading...';
  const data = [];
  for (let year = 2010; year <= 2018; year++) {
    await fetch(getFetchUrl('query', personType, action, location, year) +
      '&state-total=true')
      .then((response) => response.json().then((jsonResponse) => ({
        data: jsonResponse,
        success: response.ok,
        status: response.status,
      })))
      .then((response) => {
        if (response.success) {
          const censusData = removeErroneousData(
            JSON.parse(response.data.censusData));
          data.push({
            'year': year.toString(),
            'value': parseInt(censusData[1][1]),
          });
        }
      });
  }
  if (data.length === 0) {
    document.getElementById('yearly-total-chart').style.display = 'none';
    loadingMsg.innerText = 'No data available for selected state';
  } else {
    localStorage.setItem('yearStateData', JSON.stringify(data));
    displayYearlyChart('yearly-total-chart', data, description, location);
    loadingMsg.innerText = '';
  }
}

// Create yearly county population growth chart for the submitted query
async function createYearlyCountyChart() {
  const loadingMsg = document.getElementById('yearly-county-chart-loading-msg');
  loadingMsg.innerText = 'Yearly county data chart loading...';
  const countyForm = new FormData(document.getElementById('county-form'));
  const county = countyForm.get('county');
  const countyDropdown = document.querySelector(
    '#county option[value=\'' + county + '\']');
  let countyNumber;
  if (countyDropdown != null) {
    countyNumber = countyDropdown.dataset.value;
  } else {
    document.getElementById('yearly-county-chart').style.display = 'none';
    loadingMsg.innerText =
      'Input must be a county name in the dropdown list';
    return;
  }
  const data = [];
  const query = getQueryFromHash(window.location.hash);
  const description = getDescription(query.action, query.personType);
  const locationInfo = await getLocationInfo(query.location);
  const stateNumber = locationInfo.stateNumber;
  for (let year = 2010; year <= 2018; year++) {
    await fetch(getFetchUrl('query', query.personType, query.action,
      stateNumber, year) +
      '&county=' + countyNumber)
      .then((response) => response.json().then((jsonResponse) => ({
        data: jsonResponse,
        success: response.ok,
        status: response.status,
      })))
      .then((response) => {
        if (response.success) {
          const censusData = removeErroneousData(
            JSON.parse(response.data.censusData));
          data.push({
            'year': year.toString(),
            'value': parseInt(censusData[1][1]),
          });
        }
      });
  }
  if (data.length === 0) {
    document.getElementById('yearly-county-chart').style.display = 'none';
    loadingMsg.innerText = 'No data available for selected county';
  } else {
    localStorage.setItem('yearCountyData', JSON.stringify(data));
    localStorage.setItem('yearCounty', county);
    displayYearlyChart('yearly-county-chart', data, description, county);
    loadingMsg.innerText = '';
  }
}

// Display link to data.census.gov table for the table the displayed
// data is from.
function displayLinkToCensusTable(tableLink) {
  const linkElem = document.getElementById('census-link');
  linkElem.style.display = 'block';
  linkElem.setAttribute('href', tableLink);
}
