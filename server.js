require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth.routes');
const ownerRoutes = require('./src/routes/owner.routes');
const adminRoutes = require('./src/routes/admin.routes');
const publicRoutes = require('./src/routes/public.routes');
const uploadRoutes = require('./src/routes/upload.routes');

const app = express();

app.use(cors());
app.use(express.json());

// --- ROUTES ---

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Mount modular routes
app.use('/', publicRoutes);
app.use('/auth', authRoutes);
app.use('/owner', ownerRoutes);
app.use('/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
