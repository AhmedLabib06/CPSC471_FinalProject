from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from flask import render_template, request
import mysql.connector
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta


app = Flask(__name__, static_folder="../static", template_folder="../templates")
CORS(app)

app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=15)

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return wrapper


# Database connection
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="68386941",  # Use your MySQL password if needed
    database="movie_theater"
)
cursor = db.cursor(dictionary=True)

from flask import Flask, render_template, request, redirect, session, url_for
import mysql.connector

app.secret_key = 'your_secret_key_here'  # required for session

app.config["SESSION_PERMANENT"] = False

from werkzeug.security import check_password_hash

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]

        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Users WHERE email = %s", (email,))
        user = cursor.fetchone()
        cursor.close()

        if user and check_password_hash(user["password"], password):
            session["user_id"] = user["userId"]
            session["user_name"] = user["name"]
            return redirect(url_for("index"))  # Or your homepage route name
        else:
            return render_template("login.html", error="Either the email or the password is incorrect.")

    return render_template("login.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        name = request.form["name"]
        email = request.form["email"]
        password = request.form["password"]
        confirm_password = request.form["confirm_password"]

        if password != confirm_password:
            return render_template("register.html", error="Passwords do not match.")

        hashed_pw = generate_password_hash(password, method='pbkdf2:sha256')

        cursor = db.cursor()
        try:
            cursor.execute("""
                INSERT INTO Users (name, email, password)
                VALUES (%s, %s, %s)
            """, (name, email, hashed_pw))
            db.commit()
        except mysql.connector.IntegrityError:
            return render_template("register.html", error="Email already registered.")
        finally:
            cursor.close()

        return redirect(url_for("login"))

    return render_template("register.html")

# ========= Routes ========= #

@app.route("/")
def index():
    if "user_id" not in session:
        return redirect("/login")
    else:
        return render_template("index.html")


@app.route('/admin.html')
def admin():
    return render_template("admin.html")

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('../static', path)

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route("/terms")
def terms():
    return render_template("terms.html")


# ========= API Endpoints ========= #

# GET: All movies with showtimes
@app.route("/api/movies", methods=["GET"])
def get_movies():
    cursor.execute("""
        SELECT s.showtimeId AS id, m.title, s.showtimeDate, s.showtimeTime, m.image
        FROM showtimes s
        JOIN movies m ON s.movieId = m.movieId
        ORDER BY s.showtimeDate ASC, s.showtimeTime ASC
    """)
    results = cursor.fetchall()

    # Convert date and time to string so they're JSON serializable
    for row in results:
        row["showtimeDate"] = str(row["showtimeDate"])
        row["showtimeTime"] = str(row["showtimeTime"])

    return jsonify(results)


@app.route("/booking.html")
@login_required
def booking_page():
    return render_template("booking.html")



# GET: All seats for a given showtimeId
@app.route("/api/seats/<int:showtime_id>")
def get_seats(showtime_id):
    cursor.execute("""
        SELECT seatId, rowNumber, seatNumber, isAvailable
        FROM seats
        WHERE showtimeId = %s
    """, (showtime_id,))
    seats = cursor.fetchall()
    return jsonify(seats)


# POST: Book selected seats for a showtime
@app.route("/api/book", methods=["POST"])
def book_seats():
    data = request.get_json()
    seat_ids = data.get("seats", [])

    if not seat_ids:
        return jsonify({"error": "No seats selected"}), 400

    # Mark only available seats as booked
    cursor.executemany("""
        UPDATE seats
        SET isAvailable = 0
        WHERE seatId = %s AND isAvailable = 1
    """, [(sid,) for sid in seat_ids])

    affected_rows = cursor.rowcount
    if affected_rows == 0:
        return jsonify({"error": "Selected seats are already booked"}), 409

    db.commit()

    return jsonify({"message": "Booking successful"})

# POST: Add movie + showtime + seats
@app.route("/api/add_showtime", methods=["POST"])
def add_showtime():
    try:
        data = request.json
        title = data["title"]
        showtime_time = data["showtimeTime"]
        show_date = data["showtimeDate"]
        image = data.get("image", "default.jpg")
        genre = data.get("genre")
        duration = data.get("duration")
        description = data.get("description")

        # 1. Check or insert movie
        cursor.execute("SELECT movieId FROM movies WHERE title = %s", (title,))
        movie = cursor.fetchone()
        if movie:
            movie_id = movie["movieId"]
        else:
            cursor.execute(
                "INSERT INTO movies (title, genre, duration, image, description) VALUES (%s, %s, %s, %s, %s)",
                (title, genre, duration, image, description)
            )
            db.commit()
            movie_id = cursor.lastrowid

        # 2. Insert showtime with correct column names
        cursor.execute(
            "INSERT INTO showtimes (movieId, theatreId, showtimeDate, showtimeTime) VALUES (%s, %s, %s, %s)",
            (movie_id, 1, show_date, showtime_time)
        )
        db.commit()
        showtime_id = cursor.lastrowid

        # 3. Add 420 seats (12 rows x 35 seats)
        import string
        for row in list(string.ascii_uppercase[:12]):  # A to L (first 12 uppercase letters)
            for num in range(1, 36):  # 1 to 35
                cursor.execute(
                    "INSERT INTO seats (showtimeId, theatreId, rowNumber, seatNumber, isAvailable) VALUES (%s, %s, %s, %s, TRUE)",
                    (showtime_id, 1, row, num)
                )

        db.commit()

        return jsonify({"status": "showtime added"})

    except Exception as e:
        print("Admin panel error:", e)
        return jsonify({"error": str(e)}), 500
    


# ========= Main ========= #

if __name__ == "__main__":
    app.run(debug=True)
