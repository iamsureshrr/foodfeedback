const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
require('dotenv').config(); // Load environment variables

const app = express();
app.use(express.json());
app.use(cors());

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

// Use a simple hardcoded secret key (for development only)
const SECRET_KEY = 'mySuperSecretKey12345!'; // Replace this with your generated key

// Route to generate a temporary URL
app.get('/generate-temp-url', (req, res) => {
    const tempUrl = `https://foodfeedback.onrender.com/update-feedback`;
    const token = jwt.sign({ tempUrl }, SECRET_KEY, { expiresIn: '5m' }); // Use the hardcoded secret key
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

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
