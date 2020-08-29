// Sign user out
function signOut() {
  const auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut().then(() => {
    setSignInButton(false);
    location.reload();
  });
}

// Get whether user is signed in
function getLoginStatus() {
  let auth2 = gapi.auth2;
  if (typeof auth2 === 'undefined') {
    return false;
  } else {
    auth2 = gapi.auth2.getAuthInstance();
    return auth2.isSignedIn.get();
  }
}

// Set whether to show Sign In or Sign Out button
function setSignInButton(isSignedIn) {
  if (isSignedIn) {
    document.getElementById('sign-in-btn').style.display = 'none';
    document.getElementById('sign-out-btn').style.display = 'flex';
  } else {
    document.getElementById('sign-in-btn').style.display = 'inline';
    document.getElementById('sign-out-btn').style.display = 'none';
  }
}

// Display corrent login status
function displayLoginStatus() {
  setSignInButton(getLoginStatus());
}

// Load login mechanism and display status
function loginInit() {
  gapi.load('auth2', () => {
    gapi.auth2.init({
      client_id: '156213329836-pnoe2errhb8gr29aplgo0klfkjrfeknf' +
          '.apps.googleusercontent.com',
    }).then(() => {
      gapi.signin2.render('sign-in-btn');
      displayLoginStatus();
      toggleUserInfo(false);
    }).then(() => {
      if (getLoginStatus()) {
        getHistory();
        getRecommendations();
      }
    });
  });
}

function getUserId() {
  const auth2 = gapi.auth2.getAuthInstance();
  if (getLoginStatus()) {
    const profile = auth2.currentUser.get().getBasicProfile();
    return profile.getId();
  }
}
