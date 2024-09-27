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
mongoose.connect('mongodb+srv://iamsureshrr:iamsureshrr@cluster0.nm9jd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
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
    const tempUrl = `https://foodfeedback.onrender.com/update-feedback`;
    const token = jwt.sign({ tempUrl }, SECRET_KEY, { expiresIn: '5m' }); // Use the secret key
    res.json({ tempUrl: `${tempUrl}?token=${token}` });
});

// Route to generate the QR code
app.get('/generate-permanent-qr', async (req, res) => {
    const permanentURL = `https://foodfeedback.onrender.com/generate-temp-url`;
    try {
        const qrCodeURL = await QRCode.toDataURL(permanentURL);
        res.json({ qrCodeURL });
    } catch (error) {
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

        // If token is valid, find the feedback by email or return an error
        const email = decoded.tempUrl.split('email=')[1]; // Assuming you encode email in the token
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
        <h2 class="text-center">Generate Feedback QR Code</h2>
        <button id="generateQR" class="btn btn-primary">Generate QR Code</button>
        <div id="qrCodeContainer" class="text-center mt-4"></div>

        <!-- Loading Message -->
        <div id="loadingMessage" class="text-info">Please wait, loading...</div>

        <!-- Modal for Thank You Popup -->
        <div class="modal fade" id="thankYouModal" tabindex="-1" aria-labelledby="thankYouModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="thankYouModalLabel">Thank You!</h5>
                    </div>
                    <div class="modal-body" id="modalBody">
                        <!-- Thank you message will go here -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('generateQR').addEventListener('click', async () => {
            const response = await fetch('/generate-permanent-qr');
            const data = await response.json();
            document.getElementById('qrCodeContainer').innerHTML = `<img src="${data.qrCodeURL}" alt="QR Code">`;
        });
    </script>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>

        `);
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
