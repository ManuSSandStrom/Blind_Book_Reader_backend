const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/pdf', express.static(path.join(__dirname, 'uploads')));

// Optional: Root Route (to remove "Cannot GET /")
app.get('/', (req, res) => {
  res.send('✅ Blind Book Reader Backend is running!');
});

// File Upload Setup
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Gemini AI Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Upload Book
app.post('/upload', upload.single('file'), (req, res) => {
  const { title, author } = req.body;
  const filePath = req.file.filename;

  let books = [];
  try {
    books = JSON.parse(fs.readFileSync('books.json', 'utf-8'));
  } catch {
    books = [];
  }

  books.push({ title, author, file: filePath });
  fs.writeFileSync('books.json', JSON.stringify(books, null, 2));
  res.json({ message: 'Book uploaded successfully' });
});

// Get All Books
app.get('/books', (req, res) => {
  try {
    const books = JSON.parse(fs.readFileSync('books.json', 'utf-8'));
    res.json(books);
  } catch {
    res.json([]);
  }
});

// Explain Paragraph Using Gemini AI
app.post('/explain', async (req, res) => {
  const { paragraph } = req.body;
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(`Explain this paragraph in simple language:\n\n${paragraph}`);
    const text = await result.response.text();
    res.json({ explanation: text });
  } catch (err) {
    console.error('Gemini error:', err.message);
    res.status(500).json({ error: 'Error generating explanation from Gemini' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
