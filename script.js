const searchButton = document.querySelector("nav .desktop-nav .link-search");
const closeButton = document.querySelector(".search-container .link-close");
const desktopNav = document.querySelector(".desktop-nav");
const searchContainer = document.querySelector(".search-container");
const overlay = document.querySelector(".overlay");

searchButton.addEventListener("click", () => {
    desktopNav.classList.add("hide");
    searchContainer.classList.remove("hide");
    overlay.classList.add("show");
})

closeButton.addEventListener("click", () => {
    desktopNav.classList.remove("hide");
    searchContainer.classList.add("hide");
    overlay.classList.remove("show");
})

overlay.addEventListener("click", () => {
    desktopNav.classList.remove("hide");
    searchContainer.classList.add("hide");
    overlay.classList.remove("show");
})


// Mobile Version

const menuIconContainer = document.querySelector("nav .menu-icon-container");
const navContainer = document.querySelector(".nav-container");

menuIconContainer.addEventListener("click", () => {
    navContainer.classList.toggle("active");
})


const searchBar = document.querySelector(".mobile-search-container .search-bar");
const nav = document.querySelector(".nav-container nav");
const searchInput = document.queqrySelector(".mobile-search-container input");
const cancelBtn = document.querySelector(".mobile-search-container .cancel-btn");

searchInput.addEventListener("click", () => {
    searchBar.classList.add("active");
    nav.classList.add("move-up");
    desktopNav.classList.add("move-down");
})

cancelBtn.addEventListener("click", () => {
    searchBar.classList.remove("active");
    nav.classList.remove("move-up");
    desktopNav.classList.remove("move-down");
})

/* tutorial llink: https://www.youtube.com/watch?v=0wvrlOyGlq0&list=TLPQMDQwMzIwMjP0bz38WWZ-tw&index=4&ab_channel=CodingSnow */

let counter = 1;
setInterval(function () {
	document.getElementById("radio" + counter).checked = true;
	counter++;
	if (counter > 4) {
		counter = 1;
	}
}, 4000);

const API_URL = 'https://script.google.com/macros/s/AKfycbzUfXh1XrzK1YhcbtKi-KbNiJtGbxYz8A7AMhQQKTruL2_CH_T_1m3eYfakFC_wBXQg/exec';

function loadData() {
  fetch(`${API_URL}?action=getEvents`)
    .then(response => response.json())
    .then(data => {
      console.log('Events loaded:', data);
      displayEvents(data);
    })
    .catch(error => console.error('Error loading events:', error));
  
  fetch(`${API_URL}?action=getWorkshops`)
    .then(response => response.json())
    .then(data => {
      console.log('Workshops loaded:', data);
      displayWorkshops(data);
    })
    .catch(error => console.error('Error loading workshops:', error));
}

function displayEvents(events) {
  const container = document.querySelector('.event-box-container');
  container.innerHTML = '';
  events.forEach(event => {
    const eventBox = createEventBox(event, 'event');
    container.appendChild(eventBox);
  });
}

function displayWorkshops(workshops) {
  const container = document.querySelector('.workshop-box-container');
  container.innerHTML = '';
  workshops.forEach(workshop => {
    const workshopBox = createEventBox(workshop, 'workshop');
    container.appendChild(workshopBox);
  });
}

function createEventBox(item, type) {
  const box = document.createElement('div');
  box.className = type === 'event' ? 'event-box' : 'workshop-box';
  box.innerHTML = `
    <img src="${item.imageUrl || 'https://example.com/placeholder.jpg'}" alt="${item.title}">
    <div class="${type}-info">
      <h3>${item.title}</h3>
      <p>Date: ${item.date}</p>
      <p>Time: ${item.time}</p>
      <p>${type === 'event' ? 'Venue' : 'Location'}: ${type === 'event' ? item.venue : item.location}</p>
    </div>
    <button class="book-now-btn">Book Now</button>
  `;
  return box;
}

document.getElementById('add-event-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const data = {
    title: formData.get('event-title'),
    date: formData.get('event-date'),
    time: formData.get('event-time'),
    venue: formData.get('event-venue'),
    imageUrl: formData.get('event-image') || 'https://example.com/placeholder.jpg'
  };
  
  const eventType = formData.get('event-type');
  const action = eventType === 'event' ? 'addEvent' : 'addWorkshop';
  
  fetch(API_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({action: action, ...data}),
  }).then(response => {
    console.log('Add event response:', response);
    return response.text();
  }).then(result => {
    console.log('Add event result:', result);
    loadData(); // Reload data after adding new event
    document.getElementById('add-event-popup').style.display = 'none';
    this.reset();
  }).catch(error => {
    console.error('Error:', error);
  });
});

// Load data when the page loads
document.addEventListener('DOMContentLoaded', loadData);