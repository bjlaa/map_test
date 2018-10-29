/*
* Global settings
*/

var SETTINGS = {
  isAuthEnabled: false
};

/*
* Components that we'll render dynamically => Authentication
*/
var signupComponent = `
  <div id="signupComponent" class="loginComponent">
    <h1 class="title">Welcome to Wigot!</h1>
    <div class="title2">Sign up to start creating your event:</div>
    <div id="firebaseui-auth-container"></div>
    <div class="alreadySignedup">
      <div class="alreadySignedupText">Already have an account?</div>
      <button onclick="vm.showLogin()">Login in</button>
    </div>
  </div>
`;
var loginComponent = `
  <div id="loginComponent" class="loginComponent">
    <h1 class="title">Welcome back on Wigot!</h1>
    <div class="title2">Log in to access your last event:</div>
    <div id="firebaseui-auth-container"></div>
    <div class="noAccount">
      <div class="noAccountText">Need an account?</div>
      <button onclick="vm.showSignup()">Sign up</button>
    </div>
  </div>
`;
var createEventComponent = `
  <div class="createEvent">
    <h4>Create an event:</h4>
    <h5 class="modalTitle">Name your event:</h5>
    <input class="searchInput form-control" type="text">
    <h5 class="guestList">Invite your friends/family members:</h5>
    <input class="searchInput form-control" type="text">
    <button class="btn btn-primary" @click="createEvent()">Create event</button>
    <button class="btn btn-primary" @click="toggleModal()">Close modal</button>
  </div>
`;

/*
* FirebaseUI config.

var uiConfig = {
  signInSuccessUrl: false,
  signInOptions: [
    // Leave the lines as is for the providers you want to offer your users.
    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
    firebase.auth.FacebookAuthProvider.PROVIDER_ID,
    firebase.auth.TwitterAuthProvider.PROVIDER_ID,
  ],
  // tosUrl and privacyPolicyUrl accept either url string or a callback
  // function.
  // Terms of service url/callback.
  tosUrl: '<your-tos-url>',
  // Privacy policy url/callback.
  privacyPolicyUrl: function() {
    window.location.assign('<your-privacy-policy-url>');
  },
  // Callback
  callbacks: {
    signInSuccessWithAuthResult: function(currentUser, credential, redirectUrl) {
      console.log('Successfully signed in', currentUser, credential, redirectUrl);
      vm.saveUser(currentUser);
    }
  }
};*/ 




/*
* VUEJS 
*/
var vm = new window.Vue({
  el: '#container',
  data: {
    /*
    * Everything relative to the event currently in progress must be stored in this 
    * object. We will save this object in our database and fetch it when a user will
    * access https://wigot.com?id=ID_OF_MY_WIGOT
    */
    currentEvent: {
      title: '',
      pins: [
        { nom: "Le Mazet", score: 0 }
      ],
      guests: []
    },

    map: false,

    tileLayer: false,

    inputPin: '',

    localisation: '',

    // We'll use this variable to display a discreet modal inviting
    // the user to try and give his location again
    isMissingLocation: false,

    // We'll store our DB in here
    db: false,

    // Firebase Auth UI
    authUI: false;

  },

  beforeMount() {
    this.parseURL();
  },

  mounted() {
    this.initMap();
    this.initFirebase();
  },

  methods: {
    /*
    * Determines whether or not to show the landing
    * or to fetch the data
    */
    parseURL() {
      var currentURL = window.location.href;

      var match = currentURL.match(/id=([^&]+)/);

      if (match) {
        // Fetch the event corresponding to the id
      }
    },

    /*
    * Creates an event: here we create the id but we don't save it yet on the database
    */
    createEvent() {
      this.db.collection("events").add({
        title: "My first Wigot"
      })
      .then(function(docRef) {
          console.log("Document written with ID: ", docRef.id);
      })
      .catch(function(error) {
          console.error("Error adding document: ", error);
      });
    },




    /*
    * Firebase part
    */
    initFirebase() {
      // We initialize Firebase
      var config = {
        apiKey: "AIzaSyA3t1HqYqWLx62jVb8mc1ZuQ_l1pm6FBxI",
        authDomain: "wigot-220414.firebaseapp.com",
        databaseURL: "https://wigot-220414.firebaseio.com",
        projectId: "wigot-220414",
        storageBucket: "wigot-220414.appspot.com",
        messagingSenderId: "1057857701694"
      };
      var self = this;
      firebase.initializeApp(config);

      // Here we create a ref to our Firebase DB and store it in the global state
      // Now we can access our database!
      var db = firebase.firestore();
      // Disable deprecated features
      db.settings({
        timestampsInSnapshots: true
      });
      this.db = db;

      // If we enabled authentication in the settings then we show the modal
      // with all the buttons to login or sign up
      if (SETTINGS.isAuthEnabled) {
        this.startAuthentication();
      } else {
        // Otherwise we just get the user's location === DEMO/DEV MODE
        self.getLocation();
      }
    },




    /*
    * Authentication part
    */
    
    startAuthentication() {
      var self = this;
      firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
          console.log('User already connected');
        } else {
          self.showSignup();
        }
      })
    },

    showSignup() {
      document.getElementById('modalWigot').innerHTML = signupComponent;
      this.toggleModal(true);
      // Initialize the FirebaseUI Widget using Firebase.
      if (!this.authUI) {
        this.authUI = new firebaseui.auth.AuthUI(firebase.auth());
      }
      // The start method will wait until the DOM is loaded.
      this.authUI.start('#firebaseui-auth-container', uiConfig);
    },

    showLogin() {
      document.getElementById('modalWigot').innerHTML = loginComponent;
      this.toggleModal(true);
      // Initialize the FirebaseUI Widget using Firebase.
      if (!authUI) {
        authUI = new firebaseui.auth.AuthUI(firebase.auth());
      }
      // The start method will wait until the DOM is loaded.
      authUI.start('#firebaseui-auth-container', uiConfig);
    },



    /*
    * Map part
    */
    initMap(coords) {
      // If we have been able to get the coordinates of the user 
      // we center the map on his location
      if (coords) {
        this.map = L.map('map').setView([coords.lat, coords.long], 15);
      } else {
        this.map = L.map('map').setView([48.53, 2.14], 15);
      }
      
      this.tileLayer = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}',
      {
      maxZoom: 19,
      id: 'mapbox.streets',
      accessToken: 'pk.eyJ1IjoiYmpsYWEiLCJhIjoiY2pubzRmYm1iMGI5czNycTFsYTJpZng5biJ9.hbgbuJ24OKVcx4xELavpoQ',
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>'
      }).addTo(this.map);

      // Add the mouse click event listener
      // Need to pass this inside a function === SCOPE ISSUE
      // use the trick below: store this in a variable (usually "self")
      var self = this;
      var w = window;

      this.map.on('click', function(e) {
        // Get the coordinates from Leaflet
        var latlng = self.map.mouseEventToLatLng(e.originalEvent);
        console.log(latlng.lat + ', ' + latlng.lng);

        self.addPin(latlng.lat, latlng.lng, '');
      });
    },

    // Get current position - called by body.onload
    getLocation() {
      var self = this;
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          // success callback: the user has accepted to give his location
          function (position) {
            console.log('SUCCESS in getLocation(): position ===', position);

            // If the map has already been initialized center it on the user's location
            if (self.map) {
              self.centerMap({ lat: position.coords.latitude, long: position.coords.longitude });
            // Else initialize the map
            } else {
              self.initMap({ lat: position.coords.latitude, long: position.coords.longitude });
            }
          },
          // error callback: the user refused to give his location
          function () {
            // If the map has not already been initialized go ahead and do it
            if(!self.map) {
              self.initMap();
            }
            self.isMissingLocation = true;
          },
        );
      } else {
        console.log('ERROR in initApp(): geolocation is not available on this browser.');
      }
    },

    centerMap(coords) {
      this.map.setView([coords.lat, coords.long], 15);
    },



    /*
    * Pin: all the method relative to the pins
    */

    addPin: function (lat, long, data) {
      var newMarker = new L.marker([lat, long]).addTo(this.map);

      var newPin = {
        name: data.name ? data.name : 'Le Mazet',
        address: data.address ? data.address : '35 rue d\Alsace',
        comment: data.comment ? data.comment : 'Le club PED c\'est super!',
        description: data.description ? data.description : 'Le club PED c\'est super!',
        thumbnail: data.thumbnail ? data.thumbnail : 'URL de la thumbnail', 
        score: 0,
        coords: {
          lat: lat,
          long: long
        }
      };

      this.currentEvent.pins.push(newPin);
    },



    /*
    * Modal part
    */
    toggleModal(value) {
      if (value) {
        this.$refs.modal.classList.add('showModal');
      } else {
        this.$refs.modal.classList.toggle('showModal');
      }
    }
  }
});