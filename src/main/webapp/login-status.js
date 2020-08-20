// Get signed in user info
function onSignIn(googleUser) {
  const profile = googleUser.getBasicProfile();
  const idToken = googleUser.getAuthResponse().id_token;
  console.log('Name: ' + profile.getName());
  console.log('Image URL: ' + profile.getImageUrl());
  console.log('Email: ' + profile.getEmail());
}

// Sign user out
function signOut() {
  const auth2 = gapi.auth2.getAuthInstance();
  auth2.signOut();
}

// Returns whether a user is currently signed in 
function isUserSignedIn() {
  const auth2 = gapi.auth2.getAuthInstance();
  return auth2.isSignedIn.get();
}


function getUserId() {
  const auth2 = gapi.auth2.getAuthInstance();
  if (isUserSignedIn()) {
    var profile = auth2.currentUser.get().getBasicProfile();
    return profile.getId();
  }
}