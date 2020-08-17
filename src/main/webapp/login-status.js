// Check if user is logged in a display login status.
async function getLoginStatus() {
  const response = await fetch('/login');
  const loginStatus = await response.json();
  return loginStatus;
}

// Set HTML content according to whether user is logged in.
function displayLoginStatus(loginStatus) {
  const loginStatusElement = document.getElementById('login-status');

  if (loginStatus.loggedIn) {
    loginStatusElement.innerHTML =
        `<a href=${loginStatus.logoutUrl}>Log out</a>`;
  } else {
    loginStatusElement.innerHTML =
        `<a href=${loginStatus.loginUrl}>Log in</a>`;
  }
}

// Fetch login status and set HTML content accordingly.
async function getAndDisplayLoginStatus() {
  const loginStatus = await getLoginStatus();
  displayLoginStatus(loginStatus);
}
