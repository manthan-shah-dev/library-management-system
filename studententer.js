require("dotenv").config();
const mysql = require('mysql2');
const express = require('express');
const app = express();
const path = require("path");
const methodOverride = require('method-override');
const nodemailer = require('nodemailer');

// Middleware
app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: true }));

// Serve static files (CSS, JS, images) from public folder
app.use(express.static('public'));

// CSP header for development (allows localhost requests and inline styles/scripts)
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'");
    next();
});

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

// MySQL connection pool
// NOTE: on Vercel each serverless invocation may spin up its own pool, so keep
// connectionLimit low. If your DB host requires SSL (PlanetScale, Aiven, etc.)
// uncomment the ssl option below.
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    // ssl: { rejectUnauthorized: true }
});

const connection = pool; // callback-style API, matches the rest of the routes below

// Sanity-check the DB connection on startup (won't crash the app if it fails)
connection.getConnection((err, conn) => {
    if (err) {
        console.error("DB Connection Error:", err);
    } else {
        console.log("Database Connected!");
        conn.release();
    }
});

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

//main page
app.get("/", (req, res) => {
    res.render("library.ejs");
});

// ✅ GET → show tables
app.get("/r", (req, res) => {
    connection.query('SHOW TABLES', (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Error");
        }
        res.send(result);
    });
});

app.get("/ry", (req, res) => {
    res.send('server runing succ');
});

app.get("/studententer", (req, res) => {
    res.render("studententer.ejs");
});

// book reg
app.get('/bookreg', (req, res) => {
    res.render("bookenter.ejs");
});

app.post('/book-register', (req, res) => {
    let { title, author, isbn, genre, total_copies, available_copies } = req.body;

    if (!available_copies || available_copies === '') {
        available_copies = total_copies;
    }

    let q = `INSERT INTO book 
(title, author, isbn, genre, total_copies, available_copies) 
VALUES (?, ?, ?, ?, ?, ?)`;

    connection.query(q, [title, author, isbn, genre, total_copies, available_copies], (err, result) => {
        if (err) {
            console.log(err);
            return res.send('error database');
        }
        res.render('bookenter.ejs');
    });
});

app.patch('/book/register', (req, res) => {
    let q = 'select * from student';
    connection.query(q, (err, result) => {
        if (err) {
            console.log(err);
            return res.send('err');
        }
        res.send(result);
    });
});

// student table queries
app.get("/student/data", (req, res) => {
    let q = "SELECT * FROM student";
    connection.query(q, (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Database Error");
        }
        res.render("student.ejs", { users: result });
    });
});

app.get("/student/:id/edit", (req, res) => {
    const { id } = req.params;
    const q = `SELECT * FROM student WHERE id = ?`;

    connection.query(q, [id], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send("DB error");
        }
        if (result.length === 0) return res.status(404).send("Student not found");
        res.render("student_edit.ejs", { student: result[0] });
    });
});

app.patch("/student/:id", (req, res) => {
    const { id } = req.params;
    let { first_name, last_name, email, dob, year, student_phone, parent_phone, address, branch } = req.body;

    if (!first_name || !last_name || !email) {
        return res.status(400).send("Missing required fields");
    }

    const q = `UPDATE student SET 
        first_name = ?, last_name = ?, email = ?, dob = ?, year = ?, 
        student_phone = ?, parent_phone = ?, address = ?, branch = ? 
        WHERE id = ?`;

    connection.query(q, [first_name, last_name, email, dob, year, student_phone, parent_phone, address, branch, id], (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send("DB error");
        }
        res.redirect("/student/data");
    });
});

// book data
app.get("/book/data", (req, res) => {
    let q = "SELECT * FROM book";
    connection.query(q, (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Database Error");
        }
        res.render("book.ejs", { users: result });
    });
});

app.post('/student-enter', (req, res) => {
    let { first_name, last_name, Smail, DOB, Snumber, Pnumber, year, Saddress, branch } = req.body;
    const DOR = new Date().toISOString().split("T")[0];

    let q = `INSERT INTO student 
(first_name,last_name, email, dob,year, student_phone, parent_phone, address, branch, registration_date) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    connection.query(q, [first_name, last_name, Smail, DOB, year, Snumber, Pnumber, Saddress, branch, DOR], (err, result) => {
        if (err) {
            console.log(err);
            return res.send("error in database");
        }

        const mailOptions = {
            from: 'act12566@gmail.com',
            to: Smail,
            subject: 'Welcome to College Library',
            text: `Dear ${first_name} ${last_name},\n\nWelcome to the College Library Management System! Your student registration has been successfully completed.\n\nYou can now borrow books and access library services.\n\nBest regards,\nCollege Library Team`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending welcome email:', error);
            } else {
                console.log('Welcome email sent:', info.response);
            }
        });

        res.render('studententer.ejs');
    });
});

app.get('/book/issues', (req, res) => {
    let q1 = `
        UPDATE book_issue
        SET status = 'overdue'
        WHERE due_date < CURDATE()
        AND status != 'returned'
    `;

    connection.query(q1, (err) => {
        if (err) {
            console.log(err);
            return res.send("Update error");
        }

        let q2 = `
            SELECT 
                student.first_name,
                student.email,
                book.title,
                book_issue.due_date
            FROM book_issue
            JOIN student ON book_issue.student_id = student.id
            JOIN book ON book_issue.book_id = book.id
            WHERE book_issue.status = 'overdue'
        `;

        connection.query(q2, (err2, notifications) => {
            if (err2) notifications = [];

            notifications.forEach(student => {
                const mailOptions = {
                    from: 'act12566@gmail.com',
                    to: student.email,
                    subject: 'Book Due Date Reminder',
                    text: `Dear ${student.first_name},\n\nThis is a reminder that the book "${student.title}" was due on ${student.due_date}. Please return it as soon as possible to avoid any penalties.\n\nThank you,\nLibrary Management System`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log('Error sending email:', error);
                    } else {
                        console.log('Email sent:', info.response);
                    }
                });
            });

            let q3 = "SELECT * FROM book_issue WHERE status != 'returned'";

            connection.query(q3, (err3, result) => {
                if (err3) {
                    console.log(err3);
                    return res.send("Fetch error");
                }

                let msg = req.query.msg || "";

                res.render("book_issue copy.ejs", {
                    users: result,
                    notifications: notifications,
                    msg: msg
                });
            });
        });
    });
});

app.get('/book/returns', (req, res) => {
    let q = `
        SELECT 
            returned_books.*,
            CONCAT(student.first_name, ' ', student.last_name) AS studentName,
            book.title AS bookTitle,
            book.author,
            book.isbn,
            book.genre
        FROM returned_books
        JOIN student ON returned_books.student_id = student.id
        JOIN book ON returned_books.book_id = book.id
        ORDER BY returned_books.return_date DESC
    `;

    connection.query(q, (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Database Error");
        }
        res.render("returned_books.ejs", { returns: result });
    });
});

app.post('/book/register', (req, res) => {
    let q = 'SELECT * FROM student';
    connection.query(q, (err, result) => {
        if (err) {
            console.log(err);
            return res.send('err');
        }
        res.send(result);
    });
});

// book issue table queries
app.get("/bookissue", (req, res) => {
    res.render("bookissue.ejs");
});

app.post("/issue-book", (req, res) => {
    let { student_id, book_id, issue_date, due_date, status } = req.body;

    let checkQ = `SELECT available_copies FROM book WHERE id = ?`;
    connection.query(checkQ, [book_id], (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Database error");
        }
        if (result.length === 0) {
            return res.send("Book not found");
        }
        if (result[0].available_copies <= 0) {
            return res.send("Book not available");
        }

        let q = `INSERT INTO book_issue 
(student_id, book_id, issue_date, due_date, status) 
VALUES (?, ?, ?, ?, ?)`;

        connection.query(q, [student_id, book_id, issue_date, due_date, status], (err, result) => {
            if (err) {
                console.log(err);
                return res.send("Database error");
            }

            let updateQ = `UPDATE book SET available_copies = available_copies - 1 WHERE id = ?`;
            connection.query(updateQ, [book_id], (err, result) => {
                if (err) {
                    console.log(err);
                    return res.send("Error updating book count");
                }

                let q1 = "SELECT CONCAT(first_name, ' ', last_name) AS name, email FROM student WHERE id = ?";
                connection.query(q1, [student_id], (err, result) => {
                    if (err) {
                        console.log(err);
                    } else if (result.length) {
                        let name = result[0].name;
                        let email = result[0].email;

                        let message = `Dear ${name},
\nYour requested book has been successfully issued.

Issue Date: ${issue_date}
Due Date: ${due_date}

Please return the book on or before the ${due_date} to avoid any late fees.

Best regards,
College Library Team`;

                        transporter.sendMail({
                            from: 'act12566@gmail.com',
                            to: email,
                            subject: 'Book Issue Confirmation',
                            text: message
                        }, (err, info) => {
                            if (err) console.log(err);
                            else console.log("Email sent");
                        });
                    }
                });

                res.redirect('/book/data');
            });
        });
    });
});

app.get("/user/:id/edit", (req, res) => {
    let { id } = req.params;

    let q = `
    SELECT 
        book_issue.*,
        CONCAT(student.first_name, ' ', student.last_name) AS studentName,
        book.title AS bookTitle,
        book.author,
        book.isbn,
        book.genre
    FROM book_issue
    JOIN student ON book_issue.student_id = student.id
    JOIN book ON book_issue.book_id = book.id
    WHERE book_issue.id = ?
    `;

    connection.query(q, [id], (err, result) => {
        if (err) {
            console.log(err);
            return res.send("DB error");
        }
        if (result.length === 0) {
            return res.send("No record found");
        }
        res.render("edit.ejs", { issue: result[0] });
    });
});

app.patch("/issue/:id", (req, res) => {
    let { id } = req.params;
    let { status, return_date } = req.body;

    if (status === "returned") {
        return_date = new Date().toISOString().split("T")[0];

        let getIssueQ = `SELECT * FROM book_issue WHERE id = ?`;
        connection.query(getIssueQ, [id], (err, issueResult) => {
            if (err) {
                console.log(err);
                return res.send("DB error");
            }
            if (issueResult.length === 0) {
                return res.send("Issue not found");
            }

            let issue = issueResult[0];

            let insertReturnQ = `
                INSERT INTO returned_books 
                (student_id, book_id, issue_date, due_date, return_date) 
                VALUES (?, ?, ?, ?, ?)
            `;

            connection.query(insertReturnQ, [issue.student_id, issue.book_id, issue.issue_date, issue.due_date, return_date], (err, result) => {
                if (err) {
                    console.log(err);
                    return res.send("Error recording return");
                }

                let deleteIssueQ = `DELETE FROM book_issue WHERE id = ?`;
                connection.query(deleteIssueQ, [id], (err, result) => {
                    if (err) {
                        console.log(err);
                        return res.send("Error removing issue record");
                    }

                    let updateQ = `UPDATE book SET available_copies = available_copies + 1 WHERE id = ?`;
                    connection.query(updateQ, [issue.book_id], (err, result) => {
                        if (err) {
                            console.log(err);
                            return res.send("Error updating book count");
                        }
                        res.redirect("/book/issues");
                    });
                });
            });
        });
    } else {
        let q = `
            UPDATE book_issue 
            SET status = ?, return_date = ?
            WHERE id = ?
        `;

        connection.query(q, [status, return_date, id], (err, result) => {
            if (err) {
                console.log(err);
                return res.send("DB error");
            }
            res.redirect("/book/issues");
        });
    }
});

// Locally: app.listen(8080, () => console.log("Server running on http://localhost:8080"));
// On Vercel the app is exported and Vercel handles invoking it as a serverless function.
module.exports = app;
