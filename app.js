const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const db = require("./mysql"); // Ensure mysql.js is configured correctly
const fs = require("fs");
const multer = require("multer");
const session = require("express-session");
const PDFDocument = require('pdfkit');

const app = express();

app.use(
  session({
    secret: "a45A7ZMpVby14qNkWxlSwYGaSUv1d64x",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 60 * 60 * 1000, // 1 hour session expiration
    },
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

function isAuthenticated(req, res, next) {
  if (req.session.loggedin) {
    next();
  } else {
    res.redirect("/login");
  }
}

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// Session check
app.get("/checkSession", (req, res) => {
  if (req.session && req.session.loggedin) {
    res.json({ loggedin: true, user: req.session.teacher });
  } else {
    res.json({ loggedin: false });
  }
});

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/login");
    }
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

// Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "1440shamsusabo@gmail.com", // Your Gmail address
    pass: "xgxw lgas frhh ugiq", // App password
  },
});

// Contact form submission route
app.post("/send-message", (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const mailOptions = {
    from: `"${name}" <${email}>`,
    to: "1440shamsusabo@gmail.com",
    subject: `New Contact Form Submission from ${name}`,
    text: `You have a new message from your website contact form:

Name: ${name}
Email: ${email}
Message: ${message}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({ error: "Failed to send your message. Please try again later." });
    }
    console.log("Email sent: " + info.response);
    return res.status(200).json({ message: "Your message has been sent successfully!" });
  });
});

// Donation route
app.post("/donate", (req, res) => {
  const { donorName, donorEmail, donorPhone, amount, country, state, reference } = req.body;

  if (!donorName || !amount || !country || !state || !reference) {
    return res.status(400).json({ message: "All required fields must be filled." });
  }

  const emailToStore = donorEmail && donorEmail.trim() !== "" ? donorEmail : null;
  const phoneToStore = donorPhone && donorPhone.trim() !== "" ? donorPhone : null;

  const query = `
    INSERT INTO donations (donor_name, donor_email, donor_phone, amount, country, state, reference, date_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`;

  db.query(query, [donorName, emailToStore, phoneToStore, amount, country, state, reference], (err, result) => {
    if (err) {
      console.error("Error inserting donation:", err);
      return res.status(500).json({ message: "Donation processing failed. Please try again." });
    }
    res.status(200).json({ message: "Donation successful. Thank you for your generosity!" });
  });
});

// Admin login route
app.post("/admin_login", (req, res) => {
  const { username, password } = req.body;

  if (username === 'Admin' && password === 'Admin') {
    req.session.isAdminLoggedIn = true;
    return res.status(200).send('Logged in');
  } else {
    return res.status(401).send('Invalid credentials');
  }
});

// Middleware to check if admin is logged in
function authMiddleware(req, res, next) {
  if (req.session.isAdminLoggedIn) {
    return next();
  }
  return res.status(401).send('You must log in first');
}

// Admin dashboard route (Protected)
app.get("/monitor", authMiddleware, (req, res) => {
  res.sendFile(__dirname + '/admin_dashboard.html'); // Send the Admin Dashboard HTML
});

// Check if admin is logged in (for checking session state)
app.get("/check-admin-login", (req, res) => {
  if (req.session.isAdminLoggedIn) {
    return res.status(200).send('Logged in');
  }
  return res.status(401).send('Not authenticated');
});

// Admin logout route
app.post("/adminLogout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Logout failed');
    }
    return res.status(200).send('Logged out');
  });
});

// Fetch Donations Report (Protected Route)
app.get("/fetch-donations", authMiddleware, (req, res) => {
  let { startDate, endDate, sortBy } = req.query;
  let query = "SELECT * FROM donations WHERE 1";
  let queryParams = [];

  if (startDate && endDate) {
    query += " AND date_time BETWEEN ? AND ?";
    queryParams.push(startDate, endDate);
  }

  if (sortBy) {
    query += ` ORDER BY ${sortBy}`;
  }

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error("Error fetching donations:", err);
      return res.status(500).json({ message: "Error fetching donations" });
    }

    if (req.query.download === 'true') {
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=donations-report.pdf');
      doc.pipe(res);

      // Add Circular Logo at the Top (Properly Positioned)
      const logoPath = path.join(__dirname, 'sekure_logo.jfif');
      if (fs.existsSync(logoPath)) {
        doc.save();
        doc.circle(doc.page.width / 2, 70, 50).clip();
        doc.image(logoPath, doc.page.width / 2 - 50, 20, { width: 100, height: 100 });
        doc.restore();
      }

      doc.moveDown(6);
      doc.fontSize(18).text('Donations Report', { align: 'center', underline: true });
      doc.moveDown(2);

      // Table Header
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.2);
      let startY = doc.y;

      doc.fontSize(12).fillColor('black')
        .text('S/N', 50, startY, { width: 50, align: 'left' })
        .text('Donor Name', 120, startY, { width: 180, align: 'left' })
        .text('Date', 310, startY, { width: 150, align: 'left' })
        .text('Amount', 470, startY, { width: 80, align: 'left' });

      doc.moveDown(0.2);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Table Data
      results.forEach((donation, index) => {
        const formattedDate = new Date(donation.date_time).toLocaleString('en-GB', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: false
        });

        let rowY = doc.y;
        let backgroundColor = index % 2 === 0 ? '#f0f0f0' : 'white';
        doc.rect(50, rowY - 2, 500, 20).fill(backgroundColor).fillColor('black');

        doc.text((index + 1).toString(), 50, rowY, { width: 50, align: 'left' })
          .text(donation.donor_name, 120, rowY, { width: 180, align: 'left' })
          .text(formattedDate, 310, rowY, { width: 150, align: 'left' })
          .text(donation.amount.toString(), 470, rowY, { width: 80, align: 'left' });

        doc.moveDown(0.5);
      });

      // Signature Section
      doc.moveDown(3);
      doc.text('_________________________', 50, doc.y, { align: 'left' });
      doc.text('Secretary Signature', 50, doc.y, { align: 'left' });

      doc.end();
      return;
    }

    res.json(results);
  });
});

// Admin Logout (Redirect to Login Page)
app.get("/admin-logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin_login.html");
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
