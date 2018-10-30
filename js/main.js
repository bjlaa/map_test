/*
* Global settings
*/

var SETTINGS = {
  isAuthEnabled: false,
  shareURL: 'http://localhost:3000?id='
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

var eventCreatedComponent = function(id) {
return `
  <div class="eventCreated">
    <h4>Damn! your WIGOT is created.</h4>
    <p>Copy/paste the link below to your friend in order to blabla</p>
    <p>${SETTINGS.shareURL}${id}</p>
  </div>
`  
}


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
    * The state of the app: 
    * 1 - there is no ID passed in the URL we launch the app in creation mode
    * 2 - there is an ID passed we hide the button create wigot as the event is
    * already stored in our DB
    */
    appStates: {
      wigotCreation: 1,
      sharing: 2
    },

    appState: 2,

    /*
    * Everything relative to the event currently in progress must be stored in this 
    * object. We will save this object in our database and fetch it when a user will
    * access https://wigot.com?id=ID_OF_MY_WIGOT
    */
    currentEvent: {
      title: '',
      pins: []
    },

    isCreatingWigot: false,

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
    authUI: false,

    searchResults: false

  },

  /*
  * Call this before mount
  */
  beforeMount() {
    this.parseURL();
  },

  mounted() {
    this.initFirebase();
    this.initMap();


    var self = this;
    this.$refs.modalBackground.addEventListener('click', function() {
      self.toggleModal(false);
    });
  },

  methods: {
    /*
    * 
    */
    searchYelpAPI(searchTerm) {
      fetch(`https://cors-anywhere.herokuapp.com/https://api.yelp.com/v3/businesses/search?term=${searchTerm}&location=paris`, {
        method: 'GET',
        headers: new Headers({
          'Authorization': 'Bearer iCcyWIWqSEQEq56EGlgg_Qa1kK8R_Mpv8910GXr6Y_iKIXsLw1676ecmJDIBDX-_0lTDl9MUzJIGFoYCWzBQYRpfvgrzCb_pusHv65VwnEMRcMWom4AV-ikLvoHYW3Yx'
        })
      })
      .then((response) => {
        return response.json()
      })
      .then((responseParsed) => {
        this.searchResults = Object.assign({}, responseParsed.businesses);
        console.log('this.searchResults', this.searchResults);
      })
      .catch((error) => {
        console.log('ERROR in main.js - searchYelpAPI()', error);
      });
    },
    /*
    * Determines whether or not to show the landing
    * or to fetch the data
    */
    parseURL() {
      var currentURL = window.location.href;

      var match = currentURL.match(/id=([^&]+)/);

      if (match) {
        // Store the ID in the state
        this.eventID = match[1];
      } else {
        // If no ID is passed in the URL then we are in create mode
        // we show the create button: the idea is not to create an entry in the database 
        // each time a dude visits the app but only after he is sure he wants to create a wigot
        this.appState = this.appStates.wigotCreation;
      }
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

      if (this.eventID) {
        this.fetchEvent(this.eventID);
      }

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
    * Creates an event: here we create the id but we don't save it yet on the database
    */
    createEvent() {
      // Here we add this.currentEvent to the events collection in our database
      var self = this;
      this.db.collection("events").add(this.currentEvent)
      .then(function(docRef) {
          console.log("Document written with ID: ", docRef.id);
          self.toggleModal(true, eventCreatedComponent(docRef.id))
      })
      .catch(function(error) {
          console.error("Error adding document: ", error);
      });
    },

    /*
    * Fetch event from the DB using the ID provided in the URL
    */
    fetchEvent(id) {
      var self = this;
      this.db.collection('events').doc(id)
      .get()
      .then(function(doc) {
        var eventFromDB = doc.data();
        console.log('SUCCESS in main.js - fetchEvent(): doc.data() ===', eventFromDB);

        // We update the currentEvent object with our fetched data
        self.updateEventFromDB(eventFromDB);
      })
      .catch(function(error) {
        console.log('ERROR in main.js - couldn\'t fetch event.', error);
        // We couldn't retrieve the event (doesn't exist or wrong id)
        // so we 
        self.appState = this.appStates.wigotCreation;
      })
    },

    updateEventFromDB(event) {
      var self = this;
      // Update this.currentEvent
      this.currentEvent = event;
      // Add the pins
      event.pins.forEach(function(pin) {
        self.addPin(pin.coords.lat, pin.coords.long, pin);
      });
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
    toggleModal(value, component) {
      if (value) {
        this.$refs.modal.innerHTML = component;
        this.$refs.modalContainer.classList.add('showModal');
      } else {
        this.$refs.modal.innerHTML = '';
        this.$refs.modalContainer.classList.toggle('showModal');
      }
    }
  }
});