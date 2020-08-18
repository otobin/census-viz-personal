// Get signed in user info
function onSignIn(googleUser) {
  const profile = googleUser.getBasicProfile();
  const id_token = googleUser.getAuthResponse().id_token;
  console.log('Name: ' + profile.getName());
  console.log('Image URL: ' + profile.getImageUrl());
  console.log('Email: ' + profile.getEmail());
}

// Sign user out
function signOut() {
  const auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut();
}
