// Load environment variables
require('dotenv').config();

// Initialize express and middleware
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(express.json());
app.use(cors({
    origin: 'https://karigarsaathi.zenifex.in'
}));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Firebase Admin SDK
const firebaseAdmin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount)
});
const db = firebaseAdmin.firestore();

// Initialize Gemini API
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define API routes
const apiRouter = express.Router();

// Register a new user
apiRouter.post('/register', async (req, res) => {
  const { name, mobile, city, pin, role } = req.body;
  
  // Implement user registration logic using Firebase Authentication
  // and Firestore to save user data.
  try {
    const userRef = db.collection('users').doc();
    await userRef.set({
      name,
      mobile,
      city,
      pin, // In a real app, hash the PIN on the client or server
      role,
      createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
    });
    res.status(201).json({ status: 'success', message: 'User registered successfully!' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Registration failed.', error: error.message });
  }
});

// Login a user
apiRouter.post('/login', async (req, res) => {
  const { mobile, pin } = req.body;

  // Implement user login logic by querying Firestore and
  // checking the PIN. Return the user data if successful.
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('mobile', '==', mobile).get();
    
    if (snapshot.empty) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }
    
    let user;
    snapshot.forEach(doc => {
      user = doc.data();
    });

    if (user.pin !== pin) { // This is for prototyping. Use hashed passwords in production.
      return res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
    }

    res.status(200).json({ status: 'success', message: 'Login successful!', user });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Login failed.', error: error.message });
  }
});

// Gemini API endpoint
apiRouter.post('/gemini-chat', async (req, res) => {
  const { prompt } = req.body;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    res.json({ status: 'success', text });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Gemini API call failed.', error: error.message });
  }
});

// server.js

// Mount the API router
app.use(apiRouter);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

