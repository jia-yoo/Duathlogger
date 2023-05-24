'use strict';

///////////loading messege or spinner when getting api &&&&& add active class name while disabling everything else


// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAllBtn = document.querySelector('.delete-all-btn');
const showAllBtn = document.querySelector('.show-all-btn');
const sortBtn = document.querySelector('.sort-btn');
const logo = document.querySelector('.logo');
const deleteConfirmation = document.querySelector('.delete-confirmation');
const deleteConfirmationDropdown = document.querySelector(
  '.delete-confirmation-dropdown'
);
const deleteConfirmationDropdownContainer = document.querySelector(
  '.delete-confirmation-dropdown-container'
);
const workouts = document.querySelector('.workouts');

const menuContainer = document.querySelector('.menu-container');
const sortDropdown = document.querySelector('.sort-dropdown');
const sidebar = document.querySelector('.sidebar');
const dropdown = document.querySelectorAll('.dropdown');
const sortOptions = document.querySelector('#sort-options');
const spinner = document.getElementById('loader');
const editForm = document.querySelector('.form-edit');
const editCancelBtn = document.querySelector('.form-edit-cancel__btn');

const editInputType = document.querySelector('.form-edit__input--type');
const editInputDistance = document.querySelector('.form-edit__input--distance');
const editInputDuration = document.querySelector('.form-edit__input--duration');
const editInputCadence = document.querySelector('.form-edit__input--cadence');
const editInputElevation = document.querySelector(
  '.form-edit__input--elevation'
);
const loadingMessage = document.querySelector('.loading-message');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration, weatherInfo, locationInfo) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
    this.weatherInfo = weatherInfo;
    this.locationInfo = locationInfo;
  }
  _setDescription() {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    this.description = `${this.constructor.name} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence, weatherInfo, locationInfo) {
    super(coords, distance, duration, weatherInfo, locationInfo);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(
    coords,
    distance,
    duration,
    elevationGain,
    weatherInfo,
    locationInfo
  ) {
    super(coords, distance, duration, weatherInfo, locationInfo);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = (this.distance / (this.duration / 60)).toFixed(1);

    return this.speed;
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #workoutMarkers = [];
  #mapZoomLevel = 15;
  #curWorkoutEl;
  #curWorkout;


  constructor() {
    this.renderSpinner(spinner);

    this._getPosition();

    this._getLocalStorage();

    form.addEventListener('submit', this.handleFormSubmit.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);
    // editInputType.addEventListener('change', this._toggleEditElevationField);

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    logo.addEventListener('click', this._moveToCurrentLocation.bind(this));
    menuContainer.addEventListener('click', this.handleMenuClicks.bind(this));
    workouts.addEventListener('click', this.handleDropdownClicks.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('could not get your location');
        }
      );
    }
  }
  async _getWeatherInfo(lat, lng) {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`
    );
    const data = await res.json();

    const weatherCode = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      56: 'Light Freezing Drizzle',
      57: 'Dense Freezing Drizzle',
      61: 'Slight Rain',
      63: 'Moderate Rain',
      65: 'Heavy Rain',
      66: 'Light Freezing Rain',
      67: 'Heavy Freezing Rain',
      71: 'Slight Snow fall',
      73: 'Moderate Snow fall',
      75: 'Heavy Snow fall',
      77: 'Snow grains',
      80: 'Slight Rain showers',
      81: 'Moderate Rain showers',
      82: 'Violent Rain showers',
      85: 'Slight Snow showers',
      86: 'Heavy Snow showers',
      95: 'Slight or Moderate Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail',
    };

    const temp = data.current_weather.temperature;
    const code = data.current_weather.weathercode;
    return [temp, weatherCode[code]];
  }
  async _getLocationInfo(lat, lng) {
    const res = await fetch(
      ` https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=7093d6d7ae1e441ea224a1d6f2216b4d`
    );

    const data = await res.json();

    return data;
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Render initial marker and popup
   
    const marker = L.marker(coords).addTo(this.#map);
    marker
      .bindPopup(
        L.popup({
          minWidth: 240,
          autoClose: false,
          className: 'initial-popup',
        }).setContent(
          `This is your <strong>current position</strong>.<br> Click on the map to add a workout`
        )
      )
      .openPopup();

    this.#map.on('click', this._renderInitPopup.bind(this));
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));
  }

  _renderInitPopup(mapE) {
    this.#mapEvent = mapE;
    const { lat, lng } = this.#mapEvent.latlng;

    const initPopup = L.popup(
      [lat, lng],
      { content: '<p> ✍️ Add your workout here!</p>' },
      { autoClose: true }
    ).openOn(this.#map);
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  _toggleElevationField(e) {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _toggleEditElevationField(e) {
    editInputCadence.closest('.form-edit__row').classList.toggle('form-edit__row--hidden');
    editInputElevation.closest('.form-edit__row').classList.toggle('form-edit__row--hidden');
  }

  handleFormSubmit(e) {
    e.preventDefault();
    //render loading message with spinner

    loadingMessage.classList.remove('hidden');
    this._newWorkout(e);
  }

  async _newWorkout(e) {
    let workout;
    const validInputs = (...inputs) => inputs.every(input => isFinite(input));
    const allPositive = (...inputs) => inputs.every(input => input > 0);

    e.preventDefault();

    //get data from form

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;

    //get weather info
    const weather = await this._getWeatherInfo(lat, lng);
    const weatherInfo = [weather[0], weather[1]];

    //get location info
    const location = await this._getLocationInfo(lat, lng);

    const locationInfo = {
      city: location.features[0].properties.city,
      region: location.features[0].properties.address_line1,
      county: location.features[0].properties.county,
      country: location.features[0].properties.country,
    };

    //if workout running, create running object

    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Running(
        [lat, lng],
        distance,
        duration,
        cadence,
        weatherInfo,
        locationInfo
      );
    }

    //if workout cycling, create cycling object

    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Cycling(
        [lat, lng],
        distance,
        duration,
        elevation,
        weatherInfo,
        locationInfo
      );
    }

    //add new object to workout array
    this.#workouts.push(workout);

    //render workout on map as marker
    this._renderWorkoutMarker(workout);

    //render workout on list
    this._renderWorkout(workout);

    //hide form and clear input fields
    this._hideForm();
    //set it in local storage
    this._setLocalStorage();
  }

  _editWorkout(workout, editInputValue) {
    const validInputs = (...inputs) => inputs.every(input => isFinite(input));
    const allPositive = (...inputs) => inputs.every(input => input > 0);

    //get data from form

    const type = editInputValue[0];
    const distance = +editInputValue[1];
    const duration = +editInputValue[2];
    const description = workout.description.replace(
      workout.description.split(' ')[0],
      `${type.split('')[0].toUpperCase() + type.slice(1)}`
    );

    //if workout running, create running object

    if (type === 'running') {
      const cadence = +editInputValue[3];
      const pace = duration / distance;

      // const description = workout.description[0]
      if (
        !validInputs(...editInputValue.slice(1)) ||
        !allPositive(...editInputValue.slice(1))
      )
        return alert('Inputs have to be positive numbers');

      workout.type = type;
      workout.distance = distance;
      workout.duration = duration;
      workout.cadence = cadence;
      workout.description = description;
      workout.pace = pace;
    }

    //if workout cycling, create cycling object

    if (type === 'cycling') {
      const elevation = +editInputValue[3];
      const speed = (distance / (duration / 60)).toFixed(1);
      if (
        !validInputs(...editInputValue.slice(1)) ||
        !allPositive(...editInputValue.slice(1))
      )
        return alert('Inputs have to be positive numbers');

      workout.type = type;
      workout.distance = distance;
      workout.duration = duration;
      workout.elevationGain = elevation;
      workout.description = description;
      workout.speed = speed;
    }

    //urender newworkout and remove the old workout

    this._renderEditedWorkout(workout);
    this.#curWorkoutEl.remove();
    //hide form

    //set it in local storage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {


    const marker = L.marker(workout.coords).addTo(this.#map);

    const popup = L.popup({
      maxWidth: 250,
      minWidth: 100,
      autoClose: false,
      closeOnClick: false,
      className: `${workout.type}-popup`,
    }).setContent(
      `${workout.type === 'running' ? '🏃‍♂️' : ' 🚴‍♀️'} ${workout.description}`
    );

    marker.bindPopup(popup).openPopup();
    this.#workoutMarkers.push(marker);
  }

  _renderWorkout(workout) {
    //checking location info

    const check = function () {
      if (workout.locationInfo.city) return workout.locationInfo.city;
      if (!workout.locationInfo.city && workout.locationInfo.county)
        return workout.locationInfo.city;
      if (!workout.locationInfo.city && !workout.locationInfo.county)
        return workout.locationInfo.region;
    };

    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
           
        <div class="location">
        <span class="location-info">📌${check()}, ${
      workout.locationInfo.country
    }</span>
        <span class="weather-info"> ⛅${workout.weatherInfo[0]} ℃, ${
      workout.weatherInfo[1]
    } </span>
        </div>
        
          <div class="dropbtn">&#8942;</div>
          
            <div class="dropdown hidden">
              <ul class="dropdown-content">
                <li class="dropdown-edit">🖊️ Edit workout </li>
                <li class="dropdown-delete">🗑️ Delete workout </li>
              </ul>
          </div>


       <h2 class="workout__title">${workout.description}</h2>
       
                    
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : ' 🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          `;

    if (workout.type === 'running') {
      html += `         
      <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;
    }
    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);
    //hide loading message
    loadingMessage.classList.add('hidden');
  }

  _renderEditedWorkout(workout) {
    //checking location info

    const check = function () {
      if (workout.locationInfo.city) return workout.locationInfo.city;
      if (!workout.locationInfo.city && workout.locationInfo.county)
        return workout.locationInfo.city;
      if (!workout.locationInfo.city && !workout.locationInfo.county)
        return workout.locationInfo.region;
    };

    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
           
        <div class="location">
        <span class="location-info">📌${check()}, ${
      workout.locationInfo.country
    }</span>
        <span class="weather-info"> ⛅${workout.weatherInfo[0]} ℃, ${
      workout.weatherInfo[1]
    } </span>
        </div>
        
          <div class="dropbtn">&#8942;</div>
          
            <div class="dropdown hidden">
              <ul class="dropdown-content">
                <li class="dropdown-edit">🖊️ Edit workout </li>
                <li class="dropdown-delete">🗑️ Delete workout </li>
              </ul>
          </div>


       <h2 class="workout__title">${workout.description}</h2>
       
                    
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : ' 🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          `;

    if (workout.type === 'running') {
      html += `         
      <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;
    }
    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    }

    this.#curWorkoutEl.insertAdjacentHTML('afterend', html);
  }

  handleClose(elementArr) {
    elementArr.forEach(el => el.classList.add('hidden'));
  }

  toggleHidden(element) {
    element.classList.toggle('hidden');
  }

  handleMenuClicks(e) {
    const allWorkoutEl = workouts.querySelectorAll('.workout');
    const arr = [deleteAllBtn, showAllBtn, ...allWorkoutEl, sortBtn];
    if (!this.#workouts.length) return;
    //show sort-dropdown on sort button click
    if (e.target.closest('.sort-btn')) {
      //disble all the btns except sort btn

      this.handleDisabledEl(arr.slice(0, -1));

      this._showSortDropdown(arr);
    }

    //handle clicks on deleteAll btn
    if (e.target.closest('.delete-all-btn')) {
      //disble all the btns except delete all btn
      this.handleDisabledEl(arr.slice(1));
      this._showConfirmation(arr);
    }

    //handle clicks on showAll btn
    if (e.target.closest('.show-all-btn')) {
      this.showAll();
    }
  }

  handleDropdownClicks(e) {
    const workoutEl = e.target.closest('.workout');
    const allWorkoutEl = workouts.querySelectorAll('.workout');
    const arr = [deleteAllBtn, showAllBtn, sortBtn, ...allWorkoutEl];
    //show dropdown on three dots click
    if (e.target.closest('.dropbtn')) {
      workoutEl.querySelector('.dropdown').classList.remove('hidden');

      const id = +workoutEl.dataset.id;
      this.#curWorkoutEl = document.querySelector(`[data-id="${id}"]`);

      this.handleDisabledEl(arr.filter(el => +el.dataset?.id !== id));
    }

    //handle clicks on delete workout btn
    if (e.target.closest('.dropdown-delete')) {
      this.handleDropdownDelete(e);

      //disabling all the btns
      this.handleDisabledEl(arr);
    }

    //1)delete the workout when okay is clicked
    if (e.target.closest('.delete-confirmation-dropdown-ok-btn')) {
      //enabling all the btns
      this.handleEnabledEl(arr);
      this._deleteWorkout(this.#curWorkoutEl);
      deleteConfirmationDropdown.classList.add('hidden');
    }

    //2)handle when no is clicked
    if (e.target.closest('.delete-confirmation-dropdown-cancel-btn')) {
      //enabling all the btns
      this.handleEnabledEl(arr);
      deleteConfirmationDropdown.classList.add('hidden');
      this.#curWorkoutEl.style.opacity = 1;
      this.handleClose([this.#curWorkoutEl.querySelector('.dropdown')]);
    }

    //handle clicks on edit workout btn

    if (e.target.closest('.dropdown-edit')) {
      this.handleDropdownEdit(e);
      //disabling all the btns
      this.handleDisabledEl(arr);
    }

    //1) handle submit click
    if (e.target.closest('.form-edit-save__btn')) {
      const editInputValue = [
        editInputType.value,
        editInputDistance.value,
        editInputDuration.value,
        editInputType.value === 'running'
          ? editInputCadence.value
          : editInputElevation.value,
      ];

      this._editWorkout(this.#curWorkout, editInputValue);

      //enabling all the btns
      this.handleEnabledEl(arr);

      //hide form
      editForm.classList.add('hidden');
    }

    //2)) handle cancel click
    if (e.target.closest('.form-edit-cancel__btn')) {
      editForm.classList.add('hidden');
      this.#curWorkoutEl.style.opacity = 1;
      this.handleClose([this.#curWorkoutEl.querySelector('.dropdown')]);
      //enabling all the btns
      this.handleEnabledEl(arr);
    }
  }

  _deleteWorkout(workoutEl) {
    //delete workout from the list (UI)
    workoutEl.remove();

    //find marks of the workoutEl
    const workoutElCoordsToRemove = this.#workouts.find(
      workout => workout.id === workoutEl.dataset.id
    ).coords;

    const markerIndex = this.#workoutMarkers.findIndex(marker => {
      return (
        marker._latlng.lat === workoutElCoordsToRemove[0] &&
        marker._latlng.lng === workoutElCoordsToRemove[1]
      );
    });

    //delete workout markers (UI)
    this.#map.removeLayer(this.#workoutMarkers[markerIndex]);

    //delete workout from the #workout array
    const workoutIndex = this.#workouts.findIndex(
      workout => workout.id === workoutEl.dataset.id
    );
    this.#workouts.splice(workoutIndex, 1);

    //delete workoutMarks from the #workoutMarks array
    this.#workoutMarkers.splice(markerIndex, 1);

    //update localStorage or reset it if there are no more workouts
    if (this.#workouts.length !== 0) {
      this._setLocalStorage(); // Will overwrite the previous 'workout' item
    } else {
      localStorage.removeItem('workouts');

      // Also, if we delete the last workout, the map should be positioned on user's initial coords
      this._moveToCurrentLocation();
    }
  }

  _showSortDropdown(arr) {
    if (!this.#workouts.length) return;

    sortDropdown.classList.remove('hidden');

    //handle clicks on sort by sort options
    sortDropdown.addEventListener('click', e => {
      if (e.target.closest('.sort-dropdown-by-duration')) {
        this.sortWorkout('duration');
        this.handleClose([sortDropdown]);
        //enable all the btns
        this.handleEnabledEl(arr);
      }
      if (e.target.closest('.sort-dropdown-by-date')) {
        this.sortWorkout('date');
        this.handleClose([sortDropdown]);
        //enable all the btns
        this.handleEnabledEl(arr);
      }
      if (e.target.closest('.sort-dropdown-by-distance')) {
        this.sortWorkout('distance');
        this.handleClose([sortDropdown]);
        //enable all the btns
        this.handleEnabledEl(arr);
      }
    });
  }
  sortWorkout(option = 'date') {
    //change the sort out name on UI
    sortOptions.textContent = option;
    //empty the workout container except the form on UI
    document.querySelectorAll('.workout').forEach(workout => workout.remove());
    //sorting the #workouts by option and displaying on UI
    this.#workouts
      .slice()
      .sort(function (a, b) {
        return a[option] - b[option];
      })
      .forEach(workout => this._renderWorkout(workout));
  }

  handleDropdownDelete(e) {
    const workoutEl = e.target.closest('.workout');
    //0)) get current workout element based on id and bounding of current workout
    const id = +workoutEl.dataset.id;
    this.#curWorkoutEl = document.querySelector(`[data-id="${id}"]`);
    const bounding = this.#curWorkoutEl.getBoundingClientRect();

    //1)hide the current workoutEl and show confirmation message
    this.#curWorkoutEl.style.opacity = 0;
    deleteConfirmationDropdown.classList.remove('hidden');
 
    deleteConfirmationDropdown.style.top = bounding.top + 'px';
  
    deleteConfirmationDropdown.style.left = bounding.left + 'px';
  }

  handleDropdownEdit(e) {
    const workoutEl = e.target.closest('.workout');

    //0)) get current workout element based on id and bounding of current workout
    const id = workoutEl.dataset.id;
    this.#curWorkoutEl = document.querySelector(`[data-id="${+id}"]`);

    const bounding = this.#curWorkoutEl.getBoundingClientRect();
    this.#curWorkout = this.#workouts.filter(workout => workout.id === id)[0];

    //hide the current workoutEl from the list
    this.#curWorkoutEl.style.opacity = 0;

    //show edit form with the same figures in the inputs


    //0)) check current workout type
    if (this.#curWorkout.type === 'running') {
      editInputCadence
        .closest('.form-edit__row')
        .classList.remove('form-edit__row--hidden');
      editInputElevation
        .closest('.form-edit__row')
        .classList.add('form-edit__row--hidden');
      //1))show edit form based on the workout bounding
      editForm.classList.remove('hidden');
      editForm.style.top = bounding.top + 'px';
      editForm.style.left = bounding.left + 'px';

      //2) brings the old input value
      editInputType.value = this.#curWorkout.type;
      editInputDuration.value = this.#curWorkout.duration;
      editInputDistance.value = this.#curWorkout.distance;
      editInputCadence.value = this.#curWorkout.cadence;
    }
    if (this.#curWorkout.type === 'cycling') {
      //1))show edit form based on the workout bounding
      editInputCadence
        .closest('.form-edit__row')
        .classList.add('form-edit__row--hidden');
      editInputElevation
        .closest('.form-edit__row')
        .classList.remove('form-edit__row--hidden');
      editForm.classList.remove('hidden');
      editForm.style.top = bounding.top + 'px';
      editForm.style.left = bounding.left + 'px';

      //2) brings the old input value
      editInputType.value = this.#curWorkout.type;
      editInputDuration.value = this.#curWorkout.duration;
      editInputDistance.value = this.#curWorkout.distance;
      editInputElevation.value = this.#curWorkout.elevationGain;
    }

    editInputType.addEventListener('change', this._toggleEditElevationField)  
  }

  _moveToCurrentLocation() {
 
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude, longitude } = position.coords;

      const coords = [latitude, longitude];
      console.log(this.#workouts);
      this.#map.setView(coords, this.#mapZoomLevel, {
        animate: true,
        pan: { duration: 1 },
      });
    });
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    });
  }
  _showConfirmation(arr) {
    if (!this.#workouts.length) return;

    deleteConfirmation.classList.remove('hidden');

    deleteConfirmation.addEventListener('click', e => {
      //close confirmation if cancel is pressed
      if (e.target.closest('.delete-confirmation-cancel-btn')) {
        deleteConfirmation.classList.add('hidden');
        //enable all the btns
        this.handleEnabledEl(arr);
      }

      //delete all if ok is pressed

      if (e.target.closest('.delete-confirmation-ok-btn')) {
        deleteConfirmation.classList.add('hidden');
        this._deleteAll();
        //enable all the btns
        this.handleEnabledEl(arr);
      }
    });
  }

  _deleteAll() {
    //delete workout list(UI)
    document.querySelectorAll('.workout').forEach(workout => {
      workout.remove();
    });
    //delete workout markers (UI)
    this.#workoutMarkers.forEach(marker => marker.remove());

    //clear workout array

    this.#workouts = [];

    //clear marker array
    this.#workoutMarkers = [];

    // Reset local Storage
    localStorage.removeItem('workouts');
  }

  showAll() {
    const group = L.featureGroup(this.#workoutMarkers);
    this.#map.fitBounds(
      group.getBounds({
        animate: true,
        pan: { duration: 1 },
      })
    );
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
  renderSpinner(parentEl) {
    parentEl.style.display = 'none';
  }

  handleDisabledEl(arr) {
    arr.forEach(parentEl => parentEl.setAttribute('id', 'disabled'));
    document.getElementById('map').setAttribute('disabled', 'true')
    this.handleClose([form])
    workouts.style.overflow = 'hidden';
  }
  handleEnabledEl(arr) {
    arr.forEach(parentEl => parentEl.removeAttribute('id'));
    document.getElementById('map').setAttribute('disabled', 'false')
    workouts.style.overflow = 'scroll';
  }
}

const app = new App();
