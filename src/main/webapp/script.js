function passQuery() {
    const query = new FormData(document.getElementById('query-form'));
    const personType = query.get('person-type');
    const location = query.get('location');

    fetch('/query?person-type=' + personType + '&location=' + location)
        .then((response) => response.json())
        .then((data) => { 
            callOliviaFunction(data);
        });
}