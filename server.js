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

// Serve static files (HTML, CSS, JS, Images) from the root directory
app.use(express.static(path.join(__dirname)));

// Serve static files from the "images" directory
app.use('/images', express.static(path.join(__dirname, 'images')));

// Serve the feedback form (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve the QR code generator page (qr.html)
app.get('/qr', (req, res) => {
    res.sendFile(path.join(__dirname, 'qr.html'));
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

// Temporary link endpoint (generates a 5-minute temporary link)
const tempLinks = {};
app.get('/temp-link', (req, res) => {
    const tempId = Date.now(); // Unique identifier for the temp link
    const expiryTime = Date.now() + 5 * 60 * 1000; // 5-minute expiry
    const temporaryLink = `https://foodfeedback.onrender.com/?temp=${tempId}`; // Temporary link URL

    // Store the expiry time for this temp link
    tempLinks[tempId] = expiryTime;

    // Redirect to the temporary link
    res.redirect(temporaryLink);
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
