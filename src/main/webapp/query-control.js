// Tell browser where to find service worker file,
// so the service worker script can run in background.
// We're using this service worker to intercept fetch requests.
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js');
  }
}

// Returns the color to set the value to based on whether
// there is an existing color in the cache
function getColor() {
  let color = localStorage.getItem('color');
  if (color !== null) {
    document.getElementById('set-color').value = color;
    document.getElementById('set-color-label').style.backgroundColor = color;
  } else {
    color = '#0071bd';
    document.getElementById('set-color').value = color;
    localStorage.setItem('color', color);
    document.getElementById('set-color-label').style.backgroundColor = color;
  }
  return color;
}

function clearPreviousResult() {
  const divsToHide = [
    'colors', 'edit-title', 'year-slider', 'census-link', 'toggle-data-btn',
    'map-options', 'yearly-total-chart', 'yearly-county-chart', 'county-form',
    'year-data-header',
  ];
  divsToHide.forEach((id) => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById('data-table').innerHTML = '';
  document.getElementById('county-list').value = 'Select a county';
  document.getElementById('yearly-county-chart-loading-msg').innerText = '';
  am4core.disposeAllCharts();
  document.getElementById('more-info').innerText = 'Please wait. Loading...';
  document.getElementById('result').style.display = 'block';
}

function getFetchUrl(servlet, personType, action, location, year) {
  return '/' + servlet + '?person-type=' + personType +
    '&action=' + action +
    '&location=' + location +
    '&year=' + year;
}

function getTitle(personType, location, year, locationInput, actionInput) {
  // Change the actionInput to be gramatically correct
  const gramaticallyCorrectAction = new Map();
  gramaticallyCorrectAction.set(
    'live', 'lived in',
  ).set(
    'work', 'worked in',
  ).set(
    'moved', 'moved to',
  );
  let action;
  if (gramaticallyCorrectAction.has(actionInput)) {
    action = gramaticallyCorrectAction.get(actionInput);
  } else {
    action = actionInput;
  }
  const isCountyQuery = location !== 'state';
  const region = isCountyQuery ? locationInput + ' county' : 'U.S. state';
  const title = 'Population who ' + action +
    ' each ' + region + ' (' +
    personType.replace('-', ' ') + ')' +
    ' in ' + year;
  return title;
}

// putHistory puts the fields of the current query into the
function putHistory(personType, action, location, year, userId) {
  let fetchUrl = getFetchUrl('history', personType, action, location, year);
  fetchUrl = fetchUrl + '&user-id=' + userId;
  fetch(fetchUrl, {
    method: 'POST',
  });
}

function createSlide(title, url, location) {
  const historyItem = document.createElement('li');
  historyItem.className = 'splide__slide';
  const link = document.createElement('a');
  link.href = url;
  const titleNode = document.createTextNode(title);
  const imgWrapper = document.createElement('div');
  imgWrapper.className = 'img-wrapper';
  const isCountyQuery = location !== 'state';
  const zoom = isCountyQuery ? stateInfo[location].zoomLevel - 2 : 2;
  const center = isCountyQuery ?
      `${stateInfo[location].lat},${stateInfo[location].lng}` : 'United+States';
  const image = document.createElement('img');
  image.alt = isCountyQuery ?
      `Small ${stateInfo[location].name} map` : 'Small U.S. map';
  image.src = `https://maps.googleapis.com/maps/api/staticmap?center=${center}
      &style=feature:administrative.locality|element:labels|visibility:off
      &style=feature:road|visibility:off&zoom=${zoom}&size=200x200
      &key=AIzaSyB5cba6r-suEYL-0E_nRQfXDtT4XW0WxbQ`;
  imgWrapper.appendChild(image);
  link.appendChild(imgWrapper);
  link.appendChild(titleNode);
  historyItem.appendChild(link);
  return historyItem;
}

function resetHistoryList() {
  const historyDiv = document.getElementById('history-list');
  historyDiv.innerHTML = '';
}

function toggleUserInfo(shouldShow) {
  const historyDiv = document.getElementById('history');
  const recommendationsDiv = document.getElementById('recommendations');
  if (shouldShow) {
    historyDiv.style.display = 'block';
    recommendationsDiv.style.display = 'block';
  } else {
    historyDiv.style.display = 'none';
    recommendationsDiv.style.display = 'none';
  }
}

function resetRecommendationList() {
  const recommendationDiv = document.getElementById('recommendation-list');
  recommendationDiv.innerHTML = '';
}

function getHistory() {
  resetHistoryList();
  const historyList = document.getElementById('history-list');
  const fetchUrl = '/history?user-id=' + getUserId();
  fetch(fetchUrl).then(function(response) {
    if (!response.ok) {
      return;
    } else {
      return response.json();
    }
  })
    .then(function(jsonResponse) {
      // iterate through list of history elements returned by
      // the history servlet and create title elements using
      // the attributes.
      toggleUserInfo(jsonResponse.length > 0);
      jsonResponse.reverse(); // latest query first
      jsonResponse.forEach((historyElement) => {
        if (historyElement === null) return;
        addHistoryToPage(historyElement, historyList);
      });
      new Splide('#splide1', {
        gap: 20,
        fixedWidth: 230,
        padding: 20,
        pagination: false,
      }).mount();
    });
}

function getRecommendations() {
  resetRecommendationList();
  const recommendationList = document.getElementById('recommendation-list');
  const fetchUrl = '/recommendations?user-id=' + getUserId();
  fetch(fetchUrl).then(function(response) {
    if (!response.ok) {
      return;
    } else {
      return response.json();
    }
  })
    .then(function(jsonResponse) {
      // iterate through list of recommendations
      jsonResponse.forEach((historyElement) => {
        if (historyElement === null) return;
        addHistoryToPage(historyElement, recommendationList);
      });
      // Check to see if arrows are necessary depending on the width
      // of the window
      if (window.innerWidth > 1250) {
        new Splide('#splide2', {
          gap: 20,
          fixedWidth: 230,
          padding: 20,
          pagination: false,
          arrows: false,
        }).mount();
      } else {
        new Splide('#splide2', {
          gap: 20,
          fixedWidth: 230,
          padding: 20,
          pagination: false,
        }).mount();
      }
    });
}

function addHistoryToPage(historyElement, historyList) {
  const location = historyElement.location ===
    'state' ? 'Each U.S. state' :
    stateInfo[historyElement.location].name;
  const historyText = getTitle(historyElement.personType,
    historyElement.location, historyElement.year, location,
    historyElement.action);
  historyList.appendChild(
    createSlide(
      historyText, getHistoryUrl(historyElement), historyElement.location));
}

// Given a history element, return the appropriate url
function getHistoryUrl(historyElement) {
  // get the fetchUrl for history and then replace the '/history?' with
  // '/#/ in order to get the hash url
  let fetchUrl = getFetchUrl('history', historyElement.personType,
    historyElement.action, historyElement.location, historyElement.year);
  fetchUrl = fetchUrl.replace('/history?', '/#');
  const host = window.location.origin;
  const url = host + fetchUrl;
  return url;
}

// Change hash to match dropdown inputs. Triggers onhashchange listener
// that calls passQuery()
function submitQuery() {
  const query = new FormData(document.getElementById('query-form'));
  const personTypeInput = query.get('person-type');
  const actionInput = query.get('action');
  const locationInput = query.get('location').replace(/'/g, '');
  const yearInput = query.get('year');

  const personType = document.querySelector(
    '#person-type option[value=\'' + personTypeInput + '\']').dataset.value;
  const action = document.querySelector(
    '#action option[value=\'' + actionInput + '\']').dataset.value;
  const year = document.querySelector(
    '#year option[value=\'' + yearInput + '\']').dataset.value;
  const locationDropdown = document.querySelector(
    '#location option[value=\'' + locationInput + '\']');
  let location;
  if (locationDropdown != null) {
    location = locationDropdown.dataset.value;
  } else {
    location = locationInput;
  }
  const fetchUrl = getFetchUrl('query', personType, action, location, year);
  window.location.hash = `#${fetchUrl.replace('/query?', '')}`;
}

function getDescription(action, personType) {
  const actionToPerson = new Map();
  actionToPerson.set(
    'live', 'Population',
  ).set(
    'work', 'Workers',
  ).set(
    'moved', 'New inhabitants',
  );
  return `${actionToPerson.get(action)} (${personType.replace('-', ' ')})`;
}

async function getLocationInfo(location) {
  const locationDropdown = document.querySelector(
    '#location option[data-value=\'' + location + '\']');
  if (locationDropdown !== null &&
    !locationDropdown.classList.contains('autocomplete-item')) {
    // User picked a location from the dropdown
    const state = locationDropdown.value;
    return {
      stateName: locationDropdown.value,
      stateNumber: location,
      originalName: state,
      // Either the center of the state,
      // or the (slightly shifted for UX) center of the US
      lat: location in stateInfo ? stateInfo[location].lat : 40.5,
      lng: location in stateInfo ? stateInfo[location].lng : -96.5,
    };
  } else { // Have to manually find which state the location is in
    locationInfo = await findStateOfLocation(location);
    if (locationInfo === undefined) {
      return; // error was thrown inside findStateOfLocation()
    }
    return locationInfo;
  }
}

// Get the query the user entered and display the result.
// Breaks down the query and passes it to the backend to be analyzed;
// the backend returns the appropriate data, which is then passed off
// to be reformatted and visualized.
async function passQuery(personType, action, location, year, title) {
  clearPreviousResult();
  const locationInfo = await getLocationInfo(location);
  const state = locationInfo.stateName;
  location = locationInfo.stateNumber;
  const actionInput = document.querySelector(
    '#action option[data-value=\'' + action + '\']').value;
  const description = getDescription(action, personType);
  const isCountyQuery = location !== 'state';
  if (title === '') { // no user-chosen title available
      title = getTitle(personType, location, year, state, actionInput);
  }
  localStorage.setItem('title', title);

  const fetchUrl = getFetchUrl('query', personType, action, location, year);
  fetch(fetchUrl)
    .then((response) => response.json().then((jsonResponse) => ({
      data: jsonResponse,
      success: response.ok,
      status: response.status,
    })))
    .then((response) => {
      if (response.success) {
        // data is a 2D array, where the first row is a
        // header row and all subsequent rows are one piece of
        // data (e.g. for a state or county)
        if (getLoginStatus()) {
          const userId = getUserId();
          putHistory(personType, action, location, year, userId);
          getHistory();
          getRecommendations();
        }
        const data = removeErroneousData(JSON.parse(response.data.censusData));
        if (isCountyQuery) {
          createYearlyStateTotalChart(
            personType, action, location, description);
        }
        displayVisualization(
          data, description, title, locationInfo, isCountyQuery);
        displayLinkToCensusTable(response.data.tableLink);
        document.getElementById('more-info').innerText = '';
      } else {
        displayError(response.status, response.data.errorMessage);
      }
    })
    .catch((error) => {
      console.log(error);
    });
}

// Remove incorrect data returned by the census API
// such as Puerto Rico data and negative numbers
function removeErroneousData(dataArray) {
  dataArray.forEach((elem, index) => {
    // Using splice, directly modifies array
    elem.forEach((item) => {
      if (item === null || item < 0 || item === 'Puerto Rico') {
        dataArray.splice(index, 1);
      }
    });
  });
  return dataArray;
}

// Check that the input being written to a datalist can match one of its options
// Note: assumes that the input list has id equal to the datalist's id + '-list'
function validateInput(dataListId) {
  const datalist = document.getElementById(dataListId);
  const inputlist = document.getElementById(dataListId + '-list');
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
  const inputlist = document.getElementById(dataListId + '-list');
  storedVal = inputlist.value;
  inputlist.value = '';
}

// If a field is empty, replace it with the value it had directly prior to
// being emptied. Since this function is called on focus out, it will always
// be called directly after storeValueAndEmpty, which is called on focus in.
// Therefore, the most recently stored value will always be the one we want.
function replaceValueIfEmpty(dataListId) {
  const inputlist = document.getElementById(dataListId + '-list');
  const typedSoFar = inputlist.value;
  if (typedSoFar === '') {
    inputlist.value = storedVal;
  }
}

// Show the div that allows for AmCharts map title editing
function showEditTitle() {
  document.getElementById('edit-title').style.display = 'inline';
  const currentTitle = localStorage.getItem('title');
  if (currentTitle !== undefined) {
    document.getElementById('edit-title-text').value = currentTitle;
  }
}

// Update the title in the AmCharts map
function editTitle() {
  const title = document.getElementById('edit-title-text').value;
  submitHashQuery(title);
  return false;
}

// Change the year of data being visualized
function changeYear(yearParam) {
  document.getElementById('year-list').value = yearParam.value;
  submitQuery();
}

// Return an array of state number and name sorted alphabetically.
// Excludes Puerto Rico.
function getSortedStateInfoArray() {
  const stateInfoArray = [];
  // Put stateInfo into sorted array
  for (const state in stateInfo) {
    if (stateInfo.hasOwnProperty(state)) { // Skip Puerto Rico
      if (state !== '72') {
        stateInfoArray.push({number: state, name: stateInfo[state].name});
      }
    }
  }
  stateInfoArray.sort((a, b) => {
    if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
    if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
    return 0;
  });
  return stateInfoArray;
}

async function setupQuery() {
  await createStateDropdownList();
  setupAutocompleteLocation();
  setupYearSlider();
  setButtonColor();
}

// Append all locations to the location dropdown element.
async function createStateDropdownList() {
  const defaultLocation = await getUserState();
  document.getElementById('location-list').value = defaultLocation;
  const datalist = document.getElementById('location');
  let optionElem = document.createElement('option');
  optionElem.value = 'each U.S. state';
  optionElem.setAttribute('data-value', 'state');
  datalist.appendChild(optionElem);
  const stateInfoArray = getSortedStateInfoArray();
  stateInfoArray.forEach((value) => {
    optionElem = document.createElement('option');
    optionElem.value = value.name;
    optionElem.setAttribute('data-value', value.number);
    datalist.appendChild(optionElem);
  });
  // This would be called in HTML onload
  // but will not work until createStateDropdownList is done
  submitHashQuery();
}

// Set up an autocomplete dropdown, attached to the main location input
// and states dropdown, to suggest places to users as they type
function setupAutocompleteLocation() {
  const autocompleteInput = document.getElementById('location-list');
  const autocompleteResults = document.getElementById('location');
  const service = new google.maps.places.AutocompleteService();
  const defaultLocationOptions = autocompleteResults.innerHTML; // all states

  function displaySuggestions(predictions, status) {
    if (predictions === null) { // No predictions generated for this location
      return;
    }
    // Each time we display suggestions, show only the top 5, and then the
    // normal state dropdown afterwards
    predictions.splice(5);
    const resultsHtml = [];
    predictions.forEach(function(prediction) {
      resultsHtml.push(
        '<option class="autocomplete-item" value="' +
        prediction.description + '" data-value="' +
        prediction.description +
        '"></option>');
    });
    autocompleteResults.innerHTML =
      resultsHtml.join('') + defaultLocationOptions;
  };

  // When the input box changes (due to typing), get what has been typed and
  // send it to the autocomplete service, which then calls displaySuggestions
  // on the predictions it generated
  autocompleteInput.addEventListener('input', debounce(function() {
    const value = this.value;
    value.replace('"', '\\"').replace(/^\s+|\s+$/g, ''); // Trim whitespace
    service.getPlacePredictions({
      'input': value,
      'types': ['(regions)'], // no businesses, just cities counties etc.
      'componentRestrictions': {'country': 'us'}, // USA only
    }, displaySuggestions);
  }, 175)); // wait this many ms to send request so they don't overload
}

// Takes in a function and returns the same function, but with a slowdown on
// execution: it will only run at most once every waitTime milliseconds.
function debounce(func, waitTime) {
  let timeout;

  return function executedFunction() {
    const context = this;
    const args = arguments;
    const later = () => {
      clearTimeout(timeout);
      // give the function access to all the variables in this context
      func.apply(context, ...args);
    };

    // set and clearTimeout are built-in methods; set executes a function after
    // a certain amount of time, and clear "deletes" the set timer so that the
    // function will not be executed
    clearTimeout(timeout);
    timeout = setTimeout(later, waitTime);
  };
}

function setupYearSlider() {
  const slider = document.getElementById('set-year');
  const text = document.getElementById('year-slider-text');
  text.innerText = 'Change the year: ' + slider.value; // default value

  slider.oninput = function() {
    text.innerText = 'Change the year: ' + this.value; // update as user slides
  };
}

function setButtonColor() {
  const color = getColor();
  let chromaColor = chroma(color);
  if (chromaColor.luminance() > 0.3) {
    chromaColor = chromaColor.luminance(0.3);
  }
  document.documentElement.style.setProperty(
      '--button-color', chromaColor.hex());
}

// Set dropdown for datalistId to value
function setDropdownValue(datalistId, value) {
  const inputList = document.getElementById(datalistId + '-list');
  const dropdown = document.querySelector(
    '#' + datalistId + ' option[data-value=\'' + value + '\']');
  if (dropdown !== null) {
    inputList.value = dropdown.value;
  } else {
    // Value is not in dropdown
    // passQuery maps value to a value in dropdown
    inputList.value = value;
  }
}

function getQueryFromHash(urlHash) {
  const params = new URLSearchParams(urlHash.slice(1));
  for (const [param, value] of params) {
    setDropdownValue(param, value);
  }
  return {
    'personType': params.get('person-type'),
    'action': params.get('action'),
    'location': params.get('location'),
    'year': params.get('year'),
  };
}

// Called on load and on hash change. Check for
// query params in url and call passQuery() if found.
function submitHashQuery(title='') {
  const urlHash = window.location.hash;
  if (urlHash) {
    const query = getQueryFromHash(urlHash);
    passQuery(
      query.personType, query.action, query.location, query.year, title);
  }
}

// Listen for if user clicks back
window.addEventListener('hashchange', function() {
  submitHashQuery();
  location.reload();
  window.scrollTo(0, 0);
});

// loadAppropriateIcon takes in a boolean buttonPressed. When buttonPressed
// is true, the location settings are set to the opposite of the current
// location settings and the opposite icon is shown. When buttonPressed is
// false, the location settings are not changed and the current icon is shown.
function loadAppropriateIcon(buttonPressed) {
  const locationSettings = localStorage.getItem('locationSettings');
  const locationOffString = 'Your location settings are currently off.' +
    ' Click here to change your location settings.';
  const locationOnString = 'Your location settings are currently on.' +
    ' Click here to change your location settings.';
  if (((locationSettings === null || locationSettings === 'off') &&
    (buttonPressed === false)) || (locationSettings === 'on' &&
      buttonPressed === true)) {
    // The user is turning their location off or it was already off and
    //  needs to be reloaded on page refresh
    localStorage.setItem('locationSettings', 'off');
    document.getElementById('location-on-icon').style.display = 'none';
    document.getElementById('location-off-icon').style.display = 'inline';
    document.getElementById('location-id-text').innerText = locationOffString;
  } else if (((locationSettings === null || locationSettings === 'off') &&
    (buttonPressed === true)) || (locationSettings === 'on' &&
      buttonPressed === false)) {
    // The user is turning their location on or it was already on and needs to
    // be reloaded on page refresh
    localStorage.setItem('locationSettings', 'on');
    document.getElementById('location-off-icon').style.display = 'none';
    document.getElementById('location-on-icon').style.display = 'inline';
    document.getElementById('location-id-text').innerText = locationOnString;
  }
}
