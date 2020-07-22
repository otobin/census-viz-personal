function passQuery() {
  const query = new FormData(document.getElementById('query-form'));
  const personType = query.get('person-type');
  const location = query.get('location');

  fetch('/query?person-type=' + personType + '&location=' + location)
    .then((response) => {
      if (response.ok) {
        response.json().then((jsonResponse) => JSON.parse(jsonResponse))
        .then((data) => { 
          // data is a 2D array, where the first row is a header row and all
          // subsequent rows are one piece of data (e.g. for a state or county)
          displayVisualization(data);
        });
      }
      else {
        console.log("There was an error");
      }
    });
}
