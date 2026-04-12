
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

// MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Pass1',
    database: 'collegedb'
});

// Connect DB
connection.connect((err) => {
    if (err) {
        console.log(err);
    } else {
        console.log("MySQL Connected ✅");
        
        // Create returned_books table if it doesn't exist
        let createTableQ = `
            CREATE TABLE IF NOT EXISTS returned_books (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT,
                book_id INT,
                issue_date DATE,
                due_date DATE,
                return_date DATE,
                FOREIGN KEY (student_id) REFERENCES student(id),
                FOREIGN KEY (book_id) REFERENCES book(id)
            )
        `;
        connection.query(createTableQ, (err, result) => {
            if (err) {
                console.log("Error creating returned_books table:", err);
            } else {
                console.log("returned_books table ready ✅");
            }
        });
    }
});

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'act12566@gmail.com', // Replace with your email
        pass: 'sgseufsjuxkltrqj' // Replace with your app password
    }
});


//main page
app.get("", (req, res) => {
    res.render("library.ejs");
});

// ✅ GET → show tables
app.get("/r", (req, res) => {
    connection.query('SHOW TABLES', (err, result) => {
        if (err) {
            console.log(err);
            return res.send("Error");
        }

        res.send(result); // only one response
    });
});
app.get("/ry", (req, res) => {
    res.send('server runing succ')
});


// ✅ POST → receive form data
app.get("/studententer", (req, res) => {

    res.render("studententer.ejs")

    // res.send("Data received successfully");
});


//book reg

app.get('/bookreg', (req, res) => {
    res.render("bookenter.ejs");
})
app.post('/book-register', (req, res) => {
    let { title, author, isbn, genre, total_copies, available_copies } = req.body;

    // If available_copies not provided, set to total_copies
    if (!available_copies || available_copies === '') {
        available_copies = total_copies;
    }

    let q = `INSERT INTO book 
(title, author, isbn, genre, total_copies, available_copies) 
VALUES (?, ?, ?, ?, ?, ?)`;
    try {
        connection.query(q, [title, author, isbn, genre, total_copies, available_copies], (err, result) => {
            if (err) throw err;
            // res.send('insert successfully');
            res.render('bookenter.ejs')
        })
    }
    catch {
        res.send('error database');
    }
})





app.patch('/book/register', (req, res) => {
    let q = 'select * from student'
    connection.query(q, (err, result) => {
        console.log(count);
        res.send(result);
    })
    res.send('err')
})




//student table querys


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

// Student edit routes
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

//bookenter data
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

// app.all("/book/issue/data", (req, res) => {
//     res.send('error')
//     // return res.redirect("/book/issues");
// });

// app.all("/bookissue/data", (req, res) => {
//     return res.redirect("/book/issues");
// });

app.post('/student-enter', (req, res) => {
    let { first_name, last_name, Smail, DOB, Snumber, Pnumber, year, Saddress, branch } = req.body;
    const DOR = new Date().toISOString().split("T")[0]; // Auto-set to current date
    let q = `INSERT INTO student 
(first_name,last_name, email, dob,year, student_phone, parent_phone, address, branch, registration_date) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    try {
        connection.query(q, [first_name, last_name, Smail, DOB, year, Snumber, Pnumber, Saddress, branch, DOR], (err, result) => {
            if (err) throw err;
            
            // Send welcome email
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

        })
    }
    catch (err) {
        res.send("error in database");
    }

});





app.get('/book/issues', (req, res) => {

    // 1. Update overdue
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

        // 2. Get notifications with email
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

            // Send emails to overdue students
            notifications.forEach(student => {
                const mailOptions = {
                    from: 'act12566@gmail.com', // Replace with your email
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

            // 3. Get all issue data
            let q3 = "SELECT * FROM book_issue WHERE status != 'returned'";

            connection.query(q3, (err3, result) => {

                if (err3) {
                    console.log(err3);
                    return res.send("Fetch error");
                }

                res.render("book_issue copy.ejs", {
                    users: result,
                    notifications: notifications
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

        console.log(result);
        res.send(result);
    });
});



//book issue table querys
app.get("/bookissue", (req, res) => {
    res.render("bookissue.ejs");
});
app.post("/issue-book", (req, res) => {

    let { student_id, book_id, issue_date, due_date, status } = req.body;

    // First, check if book is available
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

        // Insert into book_issue
        let q = `INSERT INTO book_issue 
(student_id, book_id, issue_date, due_date, status) 
VALUES (?, ?, ?, ?, ?)`;
        connection.query(q, [student_id, book_id, issue_date, due_date, status], (err, result) => {
            if (err) {
                console.log(err);
                return res.send("Database error");
            }

            // Update available_copies
            let updateQ = `UPDATE book SET available_copies = available_copies - 1 WHERE id = ?`;
            connection.query(updateQ, [book_id], (err, result) => {
                if (err) {
                    console.log(err);
                    return res.send("Error updating book count");
                }

                res.redirect('/book/data')
            });
        });
    });
});


// //change the status

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

        let issue = result[0];

        res.render("edit.ejs", { issue });
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

            // ✅ FIXED QUERY
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

                        // ✅ FIXED REDIRECT
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



// Server
app.listen(8080, () => {
    console.log("Server running on http://localhost:8080");
});