const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
require('dotenv').config(); // Load environment variables
const helmet = require('helmet'); // Import helmet for security headers

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet()); // Use helmet for security

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.log('MongoDB Connection Error:', err));

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
    name: String,
    email: String,
    rating: String,
    comments: String,
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

// Serve static files from the 'public' folder
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API to handle form submission
app.post('/submit-feedback', async (req, res) => {
    try {
        const { name, email, rating, comments } = req.body;

        // Check if feedback has already been submitted with this email
        const existingFeedback = await Feedback.findOne({ email });
        if (existingFeedback) {
            return res.json({ success: false, error: 'already_submitted' });
        }

        // Save new feedback in MongoDB
        const feedback = new Feedback({ name, email, rating, comments });
        await feedback.save();

        // Respond with success and user's name
        res.json({ success: true, name });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error saving feedback' });
    }
});

// Route to generate a temporary URL
const SECRET_KEY = process.env.SECRET_KEY; // Get the secret key from environment variables
app.get('/generate-temp-url', (req, res) => {
    const email = req.query.email; // Assuming you are passing the email when generating the temp URL
    const tempUrl = `https://foodfeedback.onrender.com/update-feedback?email=${email}`;
    const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '5m' }); // Include email in the token payload
    res.json({ tempUrl: `${tempUrl}&token=${token}` });
});

// Route to generate the QR code
app.get('/generate-permanent-qr', async (req, res) => {
    const permanentURL = `https://foodfeedback.onrender.com/generate-temp-url?email=example@example.com`; // Replace with actual email
    console.log('Generating QR Code for URL:', permanentURL); // Debug log
    try {
        const qrCodeURL = await QRCode.toDataURL(permanentURL);
        console.log('QR Code generated successfully'); // Debug log
        res.json({ qrCodeURL });
    } catch (error) {
        console.error('Error generating QR code:', error); // Debug log
        res.status(500).json({ error: 'Failed to generate QR code.' });
    }
});

// Route to update feedback
app.get('/update-feedback', async (req, res) => {
    const token = req.query.token;

    // Verify the token
    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        // If token is valid, find the feedback by email
        const email = decoded.email; // Get email from token payload
        const feedback = await Feedback.findOne({ email });

        if (!feedback) {
            return res.status(404).send('Feedback not found');
        }

        // Render your index.html with pre-filled data
        res.send(`
            <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Food Feedback Form</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        /* Center the modal */
        .modal-dialog-centered {
            display: flex;
            justify-content: center;
            align-items: center;
        }
        /* Ensure the modal does not block interactions with the form */
        body.modal-open {
            overflow: auto !important;
        }
        /* Optional: Style the thank you message */
        .modal-body {
            text-align: center;
            font-size: 1.5rem;
        }
        
        /* Loading message style */
        #loadingMessage {
            display: none;
            text-align: center;
            font-size: 1.2rem;
            margin-top: 20px;
        }
    </style>
</head>
<body>

    <div class="container mt-5">
        <h2 class="text-center">Update Feedback</h2>
        <form id="feedbackForm">
            <div class="mb-3">
                <label for="name" class="form-label">Name</label>
                <input type="text" class="form-control" id="name" value="${feedback.name}" required>
            </div>
            <div class="mb-3">
                <label for="email" class="form-label">Email</label>
                <input type="email" class="form-control" id="email" value="${feedback.email}" required readonly>
            </div>
            <div class="mb-3">
                <label for="rating" class="form-label">Rating</label>
                <input type="text" class="form-control" id="rating" value="${feedback.rating}" required>
            </div>
            <div class="mb-3">
                <label for="comments" class="form-label">Comments</label>
                <textarea class="form-control" id="comments" required>${feedback.comments}</textarea>
            </div>
            <button type="submit" class="btn btn-primary">Update Feedback</button>
        </form>
    </div>

    <script>
        document.getElementById('feedbackForm').addEventListener('submit', async (event) => {
            event.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const rating = document.getElementById('rating').value;
            const comments = document.getElementById('comments').value;

            const response = await fetch('/submit-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, rating, comments }),
            });

            const data = await response.json();
            if (data.success) {
                document.getElementById('modalBody').innerText = \`Thank you, \${data.name}, for your feedback!\`;
                $('#thankYouModal').modal('show'); // Show modal using Bootstrap
            } else if (data.error === 'already_submitted') {
                alert('Feedback already submitted for this email.');
            } else {
                alert('Error submitting feedback.');
            }
        });
    </script>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
        `);
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
