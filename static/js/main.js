document.addEventListener("DOMContentLoaded", function () {
    if (window.location.pathname.includes("admin")) {
      setupAdminPanel();
    } else if (window.location.pathname.includes("booking.html")) {
      setupBookingPage();
    } else if (window.location.pathname.includes("showtimes.html")) {
        loadShowtimes();      
    } else {
      loadMovies();
    }
  });
  
  // =========================
  // Home Page Logic
  // =========================
  
  function loadMovies() {
    fetch("/api/movies")
      .then(res => res.json())
      .then(movies => {
        const container = document.getElementById("movie-list");
        container.innerHTML = "";
  
        const groupedByDate = {};
  
        movies.forEach(movie => {
          const hasValidDate = movie.showtimeDate && movie.showtimeTime;
          const rawDate = hasValidDate ? movie.showtimeDate : "Invalid Date";
  
          if (!groupedByDate[rawDate]) {
            groupedByDate[rawDate] = [];
          }
          groupedByDate[rawDate].push(movie);
        });
  
        Object.entries(groupedByDate).forEach(([rawDate, moviesOnDate]) => {
          // Format the section heading date
          const heading = document.createElement("h2");
          heading.className = "section-title";
          heading.textContent = rawDate !== "Invalid Date"
            ? new Date(`${rawDate}T12:00:00`).toLocaleDateString([], { dateStyle: "full" })
            : "Invalid Date";
          container.appendChild(heading);
  
          const movieGrid = document.createElement("section");
          movieGrid.className = "movie-grid";
  
          moviesOnDate.forEach(movie => {
            const card = document.createElement("div");
            card.classList.add("movie-card");
  
            const formattedTime = movie.showtimeDate && movie.showtimeTime
              ? new Date(`${movie.showtimeDate}T${movie.showtimeTime}`).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short"
                })
              : "N/A";
  
            card.innerHTML = `
              <img src="/static/img/${movie.image || 'default.jpg'}" />
              <div class="movie-info">
                <h3>${movie.title}</h3>
                <p>Showtime: ${formattedTime}</p>
                <a href="/booking.html?showtimeId=${movie.id}" class="book-btn">Book Now</a>
              </div>
            `;
            movieGrid.appendChild(card);
          });
  
          container.appendChild(movieGrid);
        });
      })
      .catch(err => {
        console.error("Failed to load movies:", err);
      });
  }
  

  function switchTab(tabId) {
    const allTabs = document.querySelectorAll(".tab-content");
    const allBtns = document.querySelectorAll(".tab-btn");
  
    allTabs.forEach(tab => tab.classList.remove("active"));
    allBtns.forEach(btn => btn.classList.remove("active"));
  
    document.getElementById(tabId).classList.add("active");
  
    // Use the event safely
    if (event && event.target && event.target.classList.contains('tab-btn')) {
      event.target.classList.add("active");
    }
  }

  function loadShowtimes() {
    fetch("/api/showtimes")
      .then(res => res.json())
      .then(data => {
        const container = document.getElementById("showtimes-container");
        container.innerHTML = "";
  
        const start = new Date("2025-04-24"); // Thursday start
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          return d;
        });
  
        const showsByMovie = {};
  
        data.forEach(show => {
          if (!showsByMovie[show.title]) showsByMovie[show.title] = [];
          showsByMovie[show.title].push(show);
        });
  
        Object.entries(showsByMovie).forEach(([title, shows]) => {
          const section = document.createElement("div");
          section.className = "showtime-block";
  
          const movieInfo = `
            <div class="movie-meta">
              <img src="/static/img/${shows[0].image}" alt="${title}" />
              <div>
                <h3>${title}</h3>
                <p>Genre: ${shows[0].genre}</p>
                <p>Duration: ${shows[0].duration}</p>
              </div>
            </div>`;
  
          const schedule = days.map(day => {
            const dayStr = day.toISOString().split("T")[0];
            const slots = shows
              .filter(s => s.showDate === dayStr)
              .map(s => `<button class="slot">${s.showtimeTime}</button>`)
              .join("") || `<p class="no-slots">No Show</p>`;
  
            return `<div class="day-column">
                <h4>${day.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}</h4>
                ${slots}
              </div>`;
          }).join("");
  
          section.innerHTML = `
            ${movieInfo}
            <div class="week-schedule">${schedule}</div>
          `;
          container.appendChild(section);
        });
      });
  }  
  
  // =========================
  // Admin Panel Logic
  // =========================
  
  function setupAdminPanel() {
    document.getElementById("admin-form").addEventListener("submit", e => {
      e.preventDefault();
  
      const title = document.getElementById("movie-name").value;
      const genre = document.getElementById("genre-input").value;
      const duration = parseInt(document.getElementById("duration-input").value);
      const description = document.getElementById("description-input").value;
      const theatreId = parseInt(document.getElementById("theatre-id").value);
      const showDate = document.getElementById("date-input").value;
      const timeInput = document.getElementById("time-input").value;
      const showtime = timeInput.length === 5 ? `${timeInput}:00` : timeInput;
      const image = document.getElementById("image-name").value;
  
      fetch("/api/add_showtime", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          genre,
          duration,
          description,
          theatreId,
          showtimeDate: showDate,
          showtimeTime: showtime,
          image
        })
      })
        .then(res => res.json())
        .then(data => {
          alert("Movie and Showtime Added");
          document.getElementById("admin-form").reset();
        })
        .catch(err => {
          console.error("Failed to add showtime:", err);
          alert("Could not add showtime.");
        });
    });
  }

  
    
  
  // =========================
  // Booking Page Logic
  // =========================
  
  function setupBookingPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const showtimeId = urlParams.get("showtimeId");
  
    console.log("Fetching seats for showtime:", showtimeId); 
  
    fetch(`/api/seats/${showtimeId}`)
      .then(res => res.json())
      .then(data => {
        console.log("Seat data:", data); 
  
        const container = document.getElementById("seat-container");
        container.innerHTML = "";
  
        const groupedByRow = {};

data.forEach(seat => {
  const label = seat.rowNumber;
  if (!groupedByRow[label]) {
    groupedByRow[label] = [];
  }
  groupedByRow[label].push(seat);
});

Object.keys(groupedByRow).forEach(row => {
  const rowDiv = document.createElement("div");
  rowDiv.classList.add("seat-row");

  groupedByRow[row].forEach(seat => {
    const seatBtn = document.createElement("button");
    seatBtn.classList.add("seat");
    if (!seat.isAvailable) seatBtn.classList.add("booked");

    seatBtn.innerText = `${seat.rowNumber}${seat.seatNumber}`;
    seatBtn.dataset.id = seat.seatId;

    seatBtn.addEventListener("click", () => {
      if (!seatBtn.classList.contains("booked")) {
        seatBtn.classList.toggle("selected");
      }
    });

    rowDiv.appendChild(seatBtn);
  });

  container.appendChild(rowDiv);
});

  
        document.getElementById("book-btn").addEventListener("click", () => {
            const selectedSeats = [...document.querySelectorAll(".seat.selected")].map(
              btn => btn.dataset.id
            );
          
            if (selectedSeats.length === 0) {
              alert("Please select at least one seat.");
              return;
            }
          
            fetch("/api/book", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ seats: selectedSeats })
            })
              .then(res => res.json())
              .then(data => {
                if (data.error) {
                  alert(data.error); 
                } else {
                  alert("Booking Confirmed!");
                  window.location.href = "/";
                }
              });
          });
                   
      });
  }

  
  
  