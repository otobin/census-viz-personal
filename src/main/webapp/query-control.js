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

function clearPreviousResult() {
  document.getElementById('map-title').innerText = '';
  document.getElementById('data-table').innerHTML = '';
  am4core.disposeAllCharts();
}

// Get the query the user entered and display the result.
// Breaks down the query and passes it to the backend to be analyzed;
// the backend returns the appropriate data, which is then passed off
// to be reformatted and visualized.
function passQuery() {
  clearPreviousResult();
  document.getElementById('more-info').innerText = 'Please wait. Loading...';
  document.getElementById('result').style.display = 'block';

  const query = new FormData(document.getElementById('query-form'));

  const personTypeInput = query.get('person-type');
  const actionInput = query.get('action');
  const locationInput = query.get('location');
  const year = query.get('year');

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
  title += 'each ' + region + ' (' + 
      personType.replace('-', ' ') + ')'
      + ' in ' + year;
  document.getElementById('map-title').innerText = title;

  const fetchUrl = '/query?person-type=' + personType +
    '&action=' + action +
    '&location=' + location +
    '&year=' + year;

  fetch(fetchUrl)
    .then((response) => {
      if (response.ok) {
        response.json().then((jsonResponse) => JSON.parse(jsonResponse))
        .then((censusDataArray) => {
          // censusDataArray is a 2D array, where the first row is a
          // header row and all subsequent rows are one piece of
          // data (e.g. for a state or county)
          displayVisualization(censusDataArray, description,
            location, isCountyQuery);
          document.getElementById('more-info').innerText = '';
        });
      } else {
        displayError(response.status, response.statusText);
      }
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

// Sort location dropdown alphabetically
function sortStateDropdownList() {
  // Adapted from w3schools
  const list = document.getElementById('location');
  let switching = true;
  let i;
  while (switching) {
    switching = false;
    options = list.getElementsByTagName('option');
    // all states option always first
    for (i = 1; i < (options.length - 1); i++) {
      shouldSwitch = false;
      if (options[i].value.toLowerCase() > options[i + 1].value.toLowerCase()) {
        shouldSwitch = true;
        break;
      }
    }
    if (shouldSwitch) {
      options[i].parentNode.insertBefore(options[i + 1], options[i]);
      switching = true;
    }
  }
}

function createStateDropdownList() {
  const datalist = document.getElementById('location');
  let optionElem = document.createElement('option');
  optionElem.value = 'each U.S. state';
  optionElem.setAttribute('data-value', 'state');
  datalist.appendChild(optionElem);

  for (const state in stateInfo) {
    if (stateInfo.hasOwnProperty(state)) {
      if (state !== '72') { // Skip Puerto Rico
        optionElem = document.createElement('option');
        optionElem.value = stateInfo[state].name;
        optionElem.setAttribute('data-value', state);
        datalist.appendChild(optionElem);
      }
    }
  }
  sortStateDropdownList();
}
