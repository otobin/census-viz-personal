function passQuery() {
  const mapContainer = document.getElementById('map')
  mapContainer.innerText = 'Please wait. Loading...'
  const query = new FormData(document.getElementById('query-form'));
  const personType = query.get('person-type');
  const action = query.get('action');
  const location = query.get('location');

  fetch('/query?person-type=' + personType 
      + '&action=' + action 
      + '&location=' + location)
    .then((response) => {
      if (response.ok) {
        response.json().then((jsonResponse) => JSON.parse(jsonResponse))
        .then((data) => {
          // data is a 2D array, where the first row is a header row and all
          // subsequent rows are one piece of data (e.g. for a state or county)
          mapContainer.innerText = '';
          displayVisualization(data);
        });
      } else {
        console.log(
          `An error occurred: ${response.status}: ${response.statusText}`);
      }
    });
}
