const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const dataFile = path.join(__dirname, 'data.json');

// Multer setup for JPEG uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, 'img_' + Date.now() + '.jpg');
  }
});
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG images are allowed'));
        }
    }
});

// Auth Routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  let data = {};
  if (fs.existsSync(dataFile)) {
    data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  }
  
  // Check Admin
  if (data.admin && username === data.admin.username && password === data.admin.password) {
    return res.json({ success: true, role: 'admin' });
  }
  
  // Check Customer (allow login by phone or name)
  if (data.users) {
    const user = data.users.find(u => 
      (u.phone === username || u.name === username) && u.password === password
    );
    if (user) {
      return res.json({ success: true, role: 'customer', user });
    }
  }
  
  res.status(401).json({ error: 'Invalid username or password' });
});

app.post('/api/auth/register', (req, res) => {
  const { name, phone, address, password } = req.body;
  let data = {};
  if (fs.existsSync(dataFile)) {
    data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  }
  
  if (!data.users) data.users = [];
  
  if (data.users.find(u => u.phone === phone)) {
    return res.status(400).json({ error: 'Phone number already registered' });
  }
  
  const newUser = { name, phone, address, password };
  data.users.push(newUser);
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  
  res.json({ success: true, user: newUser });
});

// Data Routes
app.get('/api/data', (req, res) => {
  if (fs.existsSync(dataFile)) {
    res.json(JSON.parse(fs.readFileSync(dataFile, 'utf8')));
  } else {
    res.json({});
  }
});

app.post('/api/save', (req, res) => {
  let currentData = {};
  if (fs.existsSync(dataFile)) {
    currentData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  }
  
  // Preserve users array so admin doesn't overwrite registered customers
  currentData.admin = req.body.admin || currentData.admin;
  currentData.brand = req.body.brand || currentData.brand;
  currentData.categories = req.body.categories || currentData.categories;
  currentData.foods = req.body.foods || currentData.foods;
  currentData.paymentSettings = req.body.paymentSettings || currentData.paymentSettings;
  currentData.storeSettings = req.body.storeSettings || currentData.storeSettings;

  fs.writeFileSync(dataFile, JSON.stringify(currentData, null, 2));
  res.json({ success: true });
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (req.file) {
    res.json({ url: '/uploads/' + req.file.filename });
  } else {
    res.status(400).json({ error: 'Upload failed or invalid format (only JPEG allowed)' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
