const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');

// Configure AWS S3 Client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Setup Multer-S3 Upload
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_AVATAR_BUCKET,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      // Create a unique file name
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = file.originalname.split('.').pop();
      cb(null, `turfs/${uniqueSuffix}.${extension}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max per image
  },
  fileFilter: (req, file, cb) => {
    // Only accept images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload only images.'), false);
    }
  }
});

module.exports = upload;
