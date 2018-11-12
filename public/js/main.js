/*
* Global settings
*/

var SETTINGS = {
  isAuthEnabled: false,
  shareURL: 'http://localhost:3000?id=',
  cookieNameFirstPart: 'wigot_event_'
};

var markers = [];

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
    <h4>You're a few steps away blabla...</h4>
    <h5 class="guestList">Set your name:</h5>
    <input required id="createEventNameAuthor" class="searchInput form-control" type="text">
    <h5 class="modalTitle">Name your event:</h5>
    <input required id="createEventNameEvent" class="searchInput form-control" type="text">
    <button class="btn btn-light" onclick="vm.toggleModal(false)">Close modal</button>
    <button class="btn btn-primary" onclick="vm.createEvent()">Create event</button>
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

var getUsernameComponent = `
  <div class="getUsername">
    <div class="title">Please choose a name to participate:</div>
    <input required id="usernameInput" type="text" />
    <button class="btn btn-primary" onclick="vm.saveUsername();vm.showWelcomeMessage();">Create event</button>
  </div>
`

var loaderComponent = `
<div class="loader">
  <div class="lds-spinner"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
</div>
`

var pinCreationInfoBoxComponent = `
  <div class="pinCreationInfoBox">
    <div class="pinCreationInfoBoxTitle">Create your pin:</div>
    <form v-on:submit.prevent="createPinFromMap({ name: $ref.nameInputPin, address: $ref.addressInputPin })">
      <div class="nameInput">
        <label for="nameInputPin">
          Name your pin:
        </label>
        <input
          type="text"
          id="nameInputPin"
          ref="nameInputPin"
          defaultValue=""
        />
      </div>
      <div class="addressInput">
        <label for="addressInputPin">
        Add an address:
        </label>
        <input
          type="text"
          id="addressInputPin"
          ref="addressInputPin"
          defaultValue=""
        />
      </div>
    </form>
    <button
      onclick="vm.cancelPinFromMap()"
      class="pinCreationInfoBoxCancel btn btn-light"
    >
      Cancel
    </button>
    <button
      onclick="vm.createPinFromMap({ name: document.getElementById('nameInputPin').value, address: document.getElementById('addressInputPin').value })"
      class="pinCreationInfoBoxSubmit btn btn-primary"
    >
      Create
    </button>
  </div>
`

var pinPopup = function(pin) {
  return `
    <div class="pinPopup">
      <div class="name">
        ${pin.name}
      </div>
      <div class="address">
        ${pin.address}
      </div>
      <button
        class="btn btn-primary"
        onclick="vm.increaseScorePin(false, ${pin.id})"
      >
        Vote
      </button>
    </div>
  `
}

var welcomeComponent = function(eventName) {
  return `
    <div class="welcome">
      <h3>Welcome to ${eventName}!</h3>
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

    appState: 1,

    /*
    * Everything relative to the event currently in progress must be stored in this 
    * object. We will save this object in our database and fetch it when a user will
    * access https://wigot.com?id=ID_OF_MY_WIGOT
    */
    currentEvent: {
      title: '',
      pins: [],
      bestPin: false
    },

    pinsCreated: 0,

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

    searchResults: false,
    isSearchResultsOpen: false

  },

  /*
  * Call this before mount
  */
  beforeMount() {
    this.parseURL();

  },

  mounted() {
    if (this.eventID && !this.currentUser) {
      this.toggleModal(true, getUsernameComponent);
    }

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
      // On verrouille le bouton search => disabled classe utile dès que tu veux verrouiller un élément
      var searchButton = document.getElementById('searchButton');
      searchButton.classList.add('disabled');
      // et on remplace le contenu du bouton par un loader le temps que la requête ait lieu
      searchButton.innerHTML = loaderComponent;

      fetch(/*'http://localhost:7777/searchYelp'*/`https://cors-anywhere.herokuapp.com/https://api.yelp.com/v3/businesses/search?term=${searchTerm}&location=paris`, {
        method: 'POST',
        headers: new Headers({
          'Authorization': 'Bearer iCcyWIWqSEQEq56EGlgg_Qa1kK8R_Mpv8910GXr6Y_iKIXsLw1676ecmJDIBDX-_0lTDl9MUzJIGFoYCWzBQYRpfvgrzCb_pusHv65VwnEMRcMWom4AV-ikLvoHYW3Yx'
        }),/*
        headers: {
          'Content-Type': 'application/json'
        },
        mode: "cors",
        body: JSON.stringify({
          term: searchTerm,
          bearer: 'iCcyWIWqSEQEq56EGlgg_Qa1kK8R_Mpv8910GXr6Y_iKIXsLw1676ecmJDIBDX-_0lTDl9MUzJIGFoYCWzBQYRpfvgrzCb_pusHv65VwnEMRcMWom4AV-ikLvoHYW3Yx'
        })*/
      })
      .then((response) => {
        return response.json()
      })
      .then((responseParsed) => {
        // On crée une array
        var searchResultsFiltered = [];

        // Et on va boucler de 0 à 4 pour ajouter les 5 premiers éléments dans notre array
        for (var i = 0; i <= 4; i++) {
          searchResultsFiltered.push(Object.assign({}, responseParsed.businesses[i]));
        }
        
        this.searchResults = searchResultsFiltered;
        this.isSearchResultsOpen = true;

        // On enleve la classe disabledOpacity
        searchButton.classList.remove('disabled');
        // et on remet notre texte
        searchButton.innerHTML = 'Search';
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
      var self = this;
      if (match) {
        // Switch to share mode: le mec a partagé son event
        this.appState = this.appStates.sharing;

        // Store the ID in the state
        this.eventID = match[1];
        var cookie = this.getCookie(`${SETTINGS.cookieNameFirstPart}${this.eventID}`);
        
        if (cookie && cookie.user) {
          this.currentUser = cookie.user.name;
          this.pinsCreated = cookie.user.pinsCreated;
        }
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
      var db = firebase.database();
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
    * Generate ID
    * from: https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
    */
    generateUUID() { // Public Domain/MIT
        var d = Date.now();
        if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
            d += performance.now(); //use high-precision timer if available
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    },

    /*
    * Creates an event: here we create the id but we don't save it yet on the database
    */
    toggleCreateEvent() {
      this.toggleModal(true, createEventComponent);
    },

    createEvent() {
      // Here we add this.currentEvent to the events collection in our database
      var self = this;

      var eventName = document.getElementById('createEventNameEvent').value;
      var eventAuthor = document.getElementById('createEventNameAuthor').value;

      this.currentEvent.name = eventName;

      // Create a custom id
      var newEventId = this.generateUUID();

      // Save on Firebase
      this.db.ref('/events/' + newEventId).set(this.currentEvent)
      .then(() => {
        console.log('SUCCESS in createEvent: event created.');
        // Add the id to current event and update the event saved in DB
        self.currentEvent.id = newEventId;
        self.updateEvent();

        // Create the cookie
        self.setCookie(
          `${SETTINGS.cookieNameFirstPart}${newEventId}`,
          { user: {
              name: eventAuthor,
              pinsCreated: this.pinsCreated
            }
          },
          100
        );

        self.toggleModal(true, eventCreatedComponent(newEventId));
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
      this.db.ref('/events/' + id)
      .once('value')
      .then(function(snapshot) {
        var eventFromDB = snapshot.val();

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

    /*
    * Update Event
    */
    updateEvent() {
      var updates = {};

      updates['/events/' + this.currentEvent.id] = this.currentEvent;

      this.db.ref().update(updates);
    },

    updateEventFromDB(event) {
      var self = this;
      // Update this.currentEvent
      this.currentEvent = event;
      // Add the pins
      if (event.pins && event.pins.length > 0) {
        event.pins.forEach(function(pin) {
          self.addPin(pin.coords.lat, pin.coords.long, pin);
        });        
      } else {
        this.currentEvent.pins = [];
      }
    },

    saveUsername() {
      var username = document.getElementById('usernameInput').value;

      // Create the cookie
      this.setCookie(
        `${SETTINGS.cookieNameFirstPart}${this.eventID}`,
        { user: {
            name: username,
            pinsCreated: this.pinsCreated
          }
        },
        100
      );
    },

    showWelcomeMessage() {
      this.toggleModal(true, welcomeComponent(this.currentEvent.name));

      var self = this;
      setTimeout(() => {
        self.toggleModal(false);
      }, 2000)
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
      
      this.tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', //'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}',
      {
      maxZoom: 19,
      // id: 'mapbox.streets',
      // accessToken: 'pk.eyJ1IjoiYmpsYWEiLCJhIjoiY2pubzRmYm1iMGI5czNycTFsYTJpZng5biJ9.hbgbuJ24OKVcx4xELavpoQ',
      // styles: 'mapbox://styles/bjlaa/cjo7a5k5y1quq2snz10gxwkgu',
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>'
      }).addTo(this.map);

      // Add the mouse click event listener
      // Need to pass this inside a function === SCOPE ISSUE
      // use the trick below: store this in a variable (usually "self")
      var self = this;

      
      this.map.on('click', function(e) {
        // Return if a marker is already in creation
        if (self.markerInCreation) {
          self.cancelPinFromMap();
          self.markerInCreation = false;
        }
        // Get the coordinates from Leaflet
        var latlng = self.map.mouseEventToLatLng(e.originalEvent);

        self.addPinFromMap({ coordinates: { latitude: latlng.lat, longitude: latlng.lng  } });
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
      // Centers on one point only
      if (coords) {
        this.map.setView([coords.lat, coords.long], 15);
      } else {
        // Center on several points
        var arrayOfLatLongsMarkers = [];
        this.currentEvent.pins.forEach((pin) => {
          arrayOfLatLongsMarkers.push([pin.coords.lat, pin.coords.lng]);
        });

        this.map.fitBounds(arrayOfLatLongsMarkers);
      }
    },



    /*
    * Pin: all the method relative to the pins
    */
    addPinFromMap(data) {
      // Restriction: max 3 pins when creating event
      if (this.appState === this.appStates.wigotCreation && this.pinsCreated >= 3) {
        alert('Max pins quota reached!');
        return
      }

      // Restriction: max 1 pin when not creating event
      if (this.appState ===  this.appStates.sharing && this.pinsCreated >= 1) {
        alert('Max pins quota reached!');
        return
      }

      var lat = data.coordinates.latitude.toString();
      var lng = data.coordinates.longitude.toString();

      var newMarker = new L.marker([lat, lng], { riseOnHover: true }).addTo(this.map);

      newMarker.bindPopup(pinCreationInfoBoxComponent).openPopup();

      this.markerInCreation = newMarker;
    },

    createPinFromMap(data) {
      this.addPin(data, this.markerInCreation);

      // To close the popup
      // this.map.closePopup();
    },

    cancelPinFromMap() {
      if (this.markerInCreation) {
        this.map.removeLayer(this.markerInCreation);
      }
    },

    addPin: function (data, markerInCreation) {
      // Restriction: max 3 pins when creating event
      if (this.appState === this.appStates.wigotCreation && this.pinsCreated >= 3) {
        alert('Max pins quota reached!');
        return
      }
      console.log(this.pinsCreated, this.appState ===  this.appStates.sharing)
      // Restriction: max 1 pin when not creating event
      if (this.appState ===  this.appStates.sharing && this.pinsCreated >= 1) {
        alert('Max pins quota reached!');
        return
      }
      var newMarker;
      var lat;
      var lng;
      if (markerInCreation) {
        newMarker = markerInCreation;
        lat = newMarker._latlng.lat;
        lng = newMarker._latlng.lng;
      } else {
        lat = data.coordinates.latitude.toString();
        lng = data.coordinates.longitude.toString();

        newMarker = new L.marker([lat, lng]).addTo(this.map);      
      }

      this.markerInCreation = false;
      

      // On ferme la liste mais on garde les résultats
      this.isSearchResultsOpen = false;

      // Ici on sauvegarde une reférence vers le marker pour pouvoir le supprimer plus tard
      markers.push(newMarker);

      /*
      newMarker.on('click', function(e) {
        var popup = L.popup()
         .setLatLng(e.latlng) 
         .setContent(pinCreationInfoBoxComponent)
         .openOn(map);
      })*/

      var newPin = {
        id: newMarker._leaflet_id,
        score: 0,
        coords: {
          lat: lat,
          lng: lng
        }
      };

      if (data && data.name) {
        newPin.name = data.name;
      }

      if (data && data.location) {
        newPin.address = data.location.address1;
        newPin.city = data.location.city;    
      }
      if (data && data.address) {
        newPin.address = data.address;
      }
      if (data && data.image_url) {
        newPin.image = data.location.image_url
      }

      // Bind new popup content and show it
      var newContent = pinPopup(newPin);
      newMarker.bindPopup(newContent).openPopup();

      this.currentEvent.pins.push(newPin);
      this.pinsCreated += 1;
      this.centerMap();

      console.log(this.currentEvent)

      if (this.appState === this.appStates.sharing) {
        this.updateEvent();
      }
    },

    /*
    * Vote pour un pin
    */
    increaseScorePin(index, pinId) {
      if (index !== false) {
        this.currentEvent.pins[index].score += 1;       
      } else if (pinId) {
        var indexPin;

        this.currentEvent.pins.forEach((pin, index) => {
          if (pin.id === pinId) {
            indexPin = index;
          }
        });

        this.currentEvent.pins[indexPin].score += 1;
      }

      this.setBestPin();

      if (this.appState === this.appStates.sharing) {
        this.updateEvent();
      }
    },

    /* 
    * Pour le moment ne supprime pas encore le pin correspondant sur la map
    */ 
    deletePin: function (index) {
      this.map.removeLayer(markers[index]);
      this.currentEvent.pins.splice(index, 1);
      markers.splice(index, 1);

      this.setBestPin();

      if (this.appState === this.appStates.sharing) {
        this.updateEvent();
      }
    },

    /*
    * Détermine le meilleur pins === celui avec le plus haut score
    */
    setBestPin() {
      // Pas de pins créé
      if (this.currentEvent.pins.length <= 0) {
        return
      }

      var pinScores = [];

      this.currentEvent.pins.forEach((pin) => {
        pinScores.push(pin.score);
      });

      var indexBestPin = pinScores.indexOf(Math.max(...pinScores));

      this.currentEvent.bestPin = Object.assign({}, this.currentEvent.pins[indexBestPin]);
      console.log(this.currentEvent.bestPin)
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
    },

    /*
    * Search
    */
    toggleSearchList(value) {
      this.isSearchResultsOpen = value;
    },


    /*
    * Cookies
    */
    // from: https://stackoverflow.com/questions/14573223/set-cookie-and-get-cookie-with-javascript
    // and: https://stackoverflow.com/questions/11344531/pure-javascript-store-object-in-cookie
    /*
      Example:

      setCookie('ppkcookie', 'testcookie', 7);

      var x = getCookie('ppkcookie');
      if (x) {
        [do something with x]
      }
    */
    setCookie(name, value, days) {
      console.log(name)
      var expires = "";
      if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
      }
      document.cookie = name + "=" + (JSON.stringify(value) || "")  + expires + "; path=/";
    },

    getCookie(name) {
     var result = document.cookie.match(new RegExp(name + '=([^;]+)'));
     result && (result = JSON.parse(result[1]));
     return result;
    },

    eraseCookie(name) {   
      document.cookie = name+'=; Max-Age=-99999999;';  
    }
  }
});