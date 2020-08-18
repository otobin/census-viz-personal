// Get signed in user info
function onSignIn(googleUser) {
  const idToken = googleUser.getAuthResponse().id_token;
}

// Sign user out
function signOut() {
  const auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut();
}
