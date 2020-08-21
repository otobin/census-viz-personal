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
  document.getElementById('data-table').innerHTML = '';
  document.getElementById('colors').style.display = 'none';
  document.getElementById('census-link').style.display = 'none';
  document.getElementById('toggle-data-btn').style.display = 'none';
  document.getElementById('map-options').style.display = 'none';
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

// getHistory fetches to the History Servlet and returns a list of
// links of queries that the logged in user has visited before
function putHistory(personType, action, location, year, userId) {
  let fetchUrl = getFetchUrl('history', personType, action, location, year);
  fetchUrl = fetchUrl + '&user-id=' + userId;
  fetch(fetchUrl, {
    method: 'POST',
  });
}

function getHistory() {
  // clear previous results
  const historyContainer = document.getElementById('history');
  historyContainer.innerHTML = '';
  const header = document.createElement('p');
  header.innerText = "Pages you've Viewed";
  historyContainer.appendChild(header);
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
      jsonResponse.forEach((historyElement) => {
        if (historyElement !== null) {
          const location = historyElement.location ===
            'state' ? 'Each U.S. state' :
            stateInfo[historyElement.location].name;
          const historyText = getTitle(historyElement.personType,
            historyElement.location, historyElement.year, location,
            historyElement.action);
          // Create the text node and add link to it
          const historyTextNode = document.createTextNode(historyText);
          const linkElement = document.createElement('a');
          linkElement.href = getHistoryUrl(historyElement);
          linkElement.appendChild(historyTextNode);
          historyContainer.appendChild(linkElement);
          const breakElement = document.createElement('br');
          historyContainer.appendChild(breakElement);
        };
      });
    });
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
  const year = query.get('year');
  const personType = document.querySelector(
    '#person-type option[value=\'' + personTypeInput + '\']').dataset.value;
  const action = document.querySelector(
    '#action option[value=\'' + actionInput + '\']').dataset.value;
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

// Get the query the user entered and display the result.
// Breaks down the query and passes it to the backend to be analyzed;
// the backend returns the appropriate data, which is then passed off
// to be reformatted and visualized.
async function passQuery(personType, action, location, year) {
  clearPreviousResult();
  const locationDropdown = document.querySelector(
    '#location option[data-value=\'' + location + '\']');
  let locationInfo;
  let state;
  if (locationDropdown !== null &&
    !locationDropdown.classList.contains('autocomplete-item')) {
    // User picked a location from the dropdown
    state = locationDropdown.value;
    locationInfo = {stateName: state,
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
    state = locationInfo.stateName;
    location = locationInfo.stateNumber;
  }
  const actionInput = document.querySelector(
    '#action option[data-value=\'' + action + '\']').value;
  const actionToPerson = new Map();
  actionToPerson.set(
        'live', 'Population',
      ).set(
        'work', 'Workers',
      ).set(
        'moved', 'New inhabitants',
      );
  const description =
      `${actionToPerson.get(action)} (${personType.replace('-', ' ')})`;

  const isCountyQuery = location !== 'state';
  const region = isCountyQuery ? state + ' county' : 'U.S. state';
  const title = 'Population who ' + actionInput +
    ' each ' + region + ' (' +
    personType.replace('-', ' ') + ')' +
    ' in ' + year;

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
          getHistory(userId);
        }
        const data = removeErroneousData(JSON.parse(response.data.censusData));
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
      if (item === null || item < 0) {
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

async function setupLocationDropdown() {
  await createStateDropdownList();
  setupAutocompleteLocation();
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

// Set dropdown for datalistId to value
function setDropdownValue(datalistId, value) {
  const inputList = document.getElementById(datalistId + '-list');
  const dropdown = document.querySelector(
    '#' + datalistId + ' option[data-value=\'' + value + '\']');
  if (dropdown !== null ) {
    inputList.value = dropdown.value;
  } else {
    // Value is not in dropdown
    // passQuery maps value to a value in dropdown
    inputList.value = value;
  }
}

// Called on load and on hash change. Check for
// query params in url and call passQuery() if found.
function submitHashQuery() {
  const urlHash = window.location.hash;
  if (urlHash) {
    const params = new URLSearchParams(urlHash.slice(1));
    for (const [param, value] of params) {
      setDropdownValue(param, value);
    }
    const personType = params.get('person-type');
    const action = params.get('action');
    const location = params.get('location');
    const year = params.get('year');
    passQuery(personType, action, location, year);
  }
}

// Listen for if user clicks back
window.addEventListener('hashchange', function() {
  submitHashQuery();
});

// loadAppropriateIcon takes in a boolean buttonPressed. When buttonPressed
// is true, the location settings are set to the opposite of the current
// location settings and the opposite icon is shown. When buttonPressed is
// false, the location settings are not changed and the current icon is shown.
function loadAppropriateIcon(buttonPressed) {
  const locationSettings = localStorage.getItem('locationSettings');
  const locationOffString = 'Your location settings are currently set to off.' +
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
