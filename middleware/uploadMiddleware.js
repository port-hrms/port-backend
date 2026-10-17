// @ts-nocheck


const path   = require("path");
const fs     = require("fs");
const multer = require("multer");

// ─── Storage: where + how to save uploaded files ──────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/resumes");

    // Create folder automatically if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `resume-${uniqueSuffix}.pdf`);
  },
});

// ─── Filter: only allow PDF files ─────────────────────────────
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

// ─── Upload instance ──────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// Named exports for different use cases
// Usage in routes:
//   router.post("/", uploadSingleResume, submitApplication)
const uploadSingleResume = upload.single("resume");

// ─── Image Storage: for announcements ──────────────────────────
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/images");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `image-${uniqueSuffix}${ext}`);
  },
});

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
}).single("image");

module.exports = { uploadSingleResume, uploadImage };

// ─── Employee Documents: PDF / DOC / DOCX ──────────────────────
const ALLOWED_DOC_MIMETYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const docStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "../uploads/employee-docs");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${file.fieldname}-${Date.now()}${ext}`);
    },
});

const docFilter = (req, file, cb) => {
    if (ALLOWED_DOC_MIMETYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF, DOC and DOCX files are allowed"), false);
    }
};

const uploadEmployeeDocs = multer({
    storage: docStorage,
    fileFilter: docFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
}).fields([
    { name: "bankDetails", maxCount: 1 },
    { name: "aadhar",      maxCount: 1 },
    { name: "resume",      maxCount: 1 },
    { name: "offerLetter", maxCount: 1 },
]);

module.exports = { uploadSingleResume, uploadImage, uploadEmployeeDocs };