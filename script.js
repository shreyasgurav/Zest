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

const API_URL = 'https://script.google.com/macros/s/AKfycbzHMbq0jn0yNhzL8SAiGjux-phxxlQpQSwCPn9wmCkzLEkVDk2SMCsigCYsVQsY3c2z/exec';

function loadData() {
  fetch(`${API_URL}?action=getEvents`)
    .then(response => response.json())
    .then(displayEvents)
    .catch(error => console.error('Error loading events:', error));
  
  fetch(`${API_URL}?action=getWorkshops`)
    .then(response => response.json())
    .then(displayWorkshops)
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
    <img src="${item.imageUrl}" alt="${item.title}">
    <div class="${type}-info">
      <h3>${item.title}</h3>
      <p>Date: ${item.date}</p>
      <p>Time: ${item.time}</p>
      <p>Venue: ${item.venue}</p>
    </div>
    <button class="book-now-btn">Book Now</button>
  `;
  return box;
}

document.getElementById('add-event-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const data = {
    action: formData.get('event-type') === 'event' ? 'addEvent' : 'addWorkshop',
    title: formData.get('event-title'),
    date: formData.get('event-date'),
    time: formData.get('event-time'),
    venue: formData.get('event-venue'),
    imageUrl: formData.get('event-image')
  };
  
  fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      console.log(result.message);
      loadData(); // Reload data to display the new event/workshop
      document.getElementById('add-event-popup').style.display = 'none';
      this.reset();
    } else {
      console.error('Error:', result.error);
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
});

// Load data when the page loads
document.addEventListener('DOMContentLoaded', loadData);