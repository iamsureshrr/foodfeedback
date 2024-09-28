const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

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

// Store temporary link expiry times in memory (for demo purposes)
const temporaryLinks = {};

// Serve static files from the root directory
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Temporary link endpoint
app.get('/temp-link', (req, res) => {
    const tempId = Date.now() + 5 * 60 * 1000; // Expires in 5 minutes
    const temporaryLink = `https://foodfeedback.onrender.com?temp=${tempId}`;

    // Store the temporary link expiry time
    temporaryLinks[tempId] = Date.now() + 5 * 60 * 1000; // Set expiry time

    res.redirect(temporaryLink);
});

// Feedback form route
app.get('/feedback', (req, res) => {
    const tempParam = req.query.temp;
    if (tempParam && temporaryLinks[tempParam]) {
        // Check if the link has expired
        const expiryTime = temporaryLinks[tempParam];
        if (Date.now() > expiryTime) {
            return res.status(403).send('Link has expired. Please scan the QR code again.');
        }
        // Serve the feedback form if not expired
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        return res.status(403).send('Invalid link. Please scan the QR code again.');
    }
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

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
