-- Users Table
CREATE TABLE Users (
    userId INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    isRegisteredUser BOOLEAN DEFAULT FALSE
);

-- Theatres Table
CREATE TABLE Theatres (
    theatreId INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200)
);

-- Movies Table
CREATE TABLE Movies (
    movieId INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    genre VARCHAR(100),
    duration INT,  -- Duration in minutes
    image VARCHAR(255),
    description TEXT
);

CREATE TABLE Showtimes (
    showtimeId INT AUTO_INCREMENT PRIMARY KEY,
    movieId INT NOT NULL,
    theatreId INT NOT NULL,
    showtimeTime TIME NOT NULL,  -- Only store the time
    showtimeDate DATE NOT NULL,  -- Date of the showtime
    FOREIGN KEY (movieId) REFERENCES Movies(movieId),
    FOREIGN KEY (theatreId) REFERENCES Theatres(theatreId)
);



-- Seats Table
CREATE TABLE Seats (
    seatId INT AUTO_INCREMENT PRIMARY KEY,
    showtimeId INT NOT NULL,
    theatreId INT NOT NULL,  -- To specify the theatre for each seat
    rowNumber VARCHAR(10) NOT NULL,  -- Seat row (e.g., A, B, C, etc.)
    seatNumber INT NOT NULL,  -- Seat number (e.g., 1, 2, 3, etc.)
    isAvailable BOOLEAN DEFAULT TRUE,  -- Whether the seat is available or not
    FOREIGN KEY (showtimeId) REFERENCES Showtimes(showtimeId),
    FOREIGN KEY (theatreId) REFERENCES Theatres(theatreId)
);


-- Tickets Table
CREATE TABLE Tickets (
    ticketId INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    showtimeId INT NOT NULL,
    seatId INT NOT NULL,
    price DOUBLE NOT NULL,
    issueDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    isCancelled BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (userId) REFERENCES Users(userId),
    FOREIGN KEY (showtimeId) REFERENCES Showtimes(showtimeId),
    FOREIGN KEY (seatId) REFERENCES Seats(seatId)
);


-- Announcements Table (Optional)
CREATE TABLE Announcements (
    announcementId INT AUTO_INCREMENT PRIMARY KEY,
    message TEXT NOT NULL,
    creationDate DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sample Data Insertion for Theatres
INSERT INTO Theatres (name, location) VALUES
('Acme Theatre 1', '123 Main Street'),
('Acme Theatre 2', '456 Elm Street');



-- Sample Data Insertion for Announcements
INSERT INTO Announcements (message) VALUES
('AcmePlex will have discounted tickets this weekend!'),
('Registered users can access early bookings for next month\'s releases.'),
('Enjoy a free drink with every ticket purchased this Friday.');
