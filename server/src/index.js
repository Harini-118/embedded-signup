//index.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Import routes
const whatsappRoutes = require('./routes/whatsapp');

const app = express();

// Updated CORS configuration for production
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', 
    'https://your-netlify-app-name.netlify.app', // Replace with your actual Netlify URL
    /\.netlify\.app$/ // This regex allows all Netlify preview URLs
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Health check endpoint
app.get("/api", (req, res) => {
  res.json({ 
    message: "Hello from Express + MongoDB",
    timestamp: new Date().toISOString(),
    status: "healthy"
  });
});

// Additional health endpoint for connection testing
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    message: "Backend is running on Render",
    environment: process.env.NODE_ENV || 'development'
  });
});

// Use routes
app.use('/api/whatsapp', whatsappRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});