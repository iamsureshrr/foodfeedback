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

app.use(express.static(path.join(__dirname, 'public')));


// Serve the HTML file from root
//app.get('/', (req, res) => {
//    res.sendFile(path.join(__dirname, 'index.html'));
//});

// Serve the QR code generator page
app.get('/qr', (req, res) => {
    res.sendFile(path.join(__dirname, 'qr.html'));
});

// Serve static files from the "images" directory
app.use('/images', express.static(path.join(__dirname, 'images')));

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

// Temporary link endpoint
let tempLinks = {}; // Store temporary links with their expiry timestamps

app.get('/temp-link', (req, res) => {
    const tempId = Date.now(); // Unique identifier
    const expiryTime = Date.now() + 5 * 60 * 1000; // Expires in 5 minutes
    const temporaryLink = `https://foodfeedback.onrender.com/?temp=${tempId}`; // Temporary link

    tempLinks[tempId] = expiryTime; // Store the expiry time
	res.redirect(temporaryLink);
});

// Handle access to the feedback form with expiration logic
app.get('/', (req, res) => {
    const { temp } = req.query;

    if (temp && tempLinks[temp]) {
        // Check if the link has expired
        if (Date.now() > tempLinks[temp]) {
            delete tempLinks[temp]; // Remove expired link
            return res.status(403).send('This link has expired. Please scan the QR code again.'); // Link expired
        }
        // Link is valid, serve the feedback form
        return res.sendFile(path.join(__dirname, 'index.html'));
    }
    // If no valid temp link, redirect to the QR code page
    res.redirect('/qr');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
