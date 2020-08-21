// Get signed in user info
function onSignIn(googleUser) {
  const idToken = googleUser.getAuthResponse().id_token;
  setSignInButton(true);
  if (document.getElementById('history').innerHTML === '') {
    getHistory(getUserId());
  }
}

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
  const auth2 = gapi.auth2;
  if (typeof auth2 === 'undefined') {
    return false; 
  } else {
    const auth2 = gapi.auth2.getAuthInstance();
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
      gapi.signin2.render('sign-in-btn', {
        'onsuccess': onSignIn,
      });
      displayLoginStatus();
    }).then(() => {
      if (getLoginStatus()) {
        getHistory(getUserId());
      }
    });
  });
}

function getUserId() {
  if (getLoginStatus()) {
    const auth2 = gapi.auth2.getAuthInstance();
    return auth2.currentUser.le.wc.id_token
  }
}
