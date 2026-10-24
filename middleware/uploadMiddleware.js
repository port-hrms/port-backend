// @ts-nocheck


const crypto = require("crypto");
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
    cb(null, `resume-${crypto.randomBytes(16).toString("hex")}.pdf`);
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
    "image/jpeg",
    "image/png",
];

const docStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "../uploads/employee-docs");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        // Unguessable name — never derived from the field name or a timestamp alone
        cb(null, `${crypto.randomBytes(16).toString("hex")}${ext}`);
    },
});

const docFilter = (req, file, cb) => {
    if (ALLOWED_DOC_MIMETYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF, DOC, DOCX, JPG and PNG files are allowed"), false);
    }
};

const employeeDocsUpload = multer({
    storage: docStorage,
    fileFilter: docFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
}).fields([
    { name: "bankDetails", maxCount: 1 },
    { name: "aadhar",      maxCount: 1 },
    { name: "resume",      maxCount: 1 },
    { name: "offerLetter", maxCount: 1 },
]);

// Wraps the multer handler so bad files return a clear 400 instead of a server error
const uploadEmployeeDocs = (req, res, next) => {
    employeeDocsUpload(req, res, (err) => {
        if (!err) return next();
        const message = err.code === "LIMIT_FILE_SIZE"
            ? "Each document must be 10 MB or smaller"
            : err.message || "File upload failed";
        return res.status(400).json({ success: false, message, error: message });
    });
};

// ─── Employee profile photo ─────────────────────────────────────
const AVATAR_MIMETYPES = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "../uploads/avatars");
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${crypto.randomBytes(16).toString("hex")}${AVATAR_MIMETYPES[file.mimetype] || ".jpg"}`);
    },
});
const avatarUpload = multer({
    storage: avatarStorage,
    fileFilter: (req, file, cb) => (AVATAR_MIMETYPES[file.mimetype]
        ? cb(null, true)
        : cb(new Error("Photo must be a JPG, PNG or WebP image"), false)),
    limits: { fileSize: 2 * 1024 * 1024 },
}).single("avatar");

const uploadAvatar = (req, res, next) => {
    avatarUpload(req, res, (err) => {
        if (!err) return next();
        const message = err.code === "LIMIT_FILE_SIZE" ? "Photo must be 2 MB or smaller" : err.message || "Upload failed";
        return res.status(400).json({ success: false, message });
    });
};

module.exports = { uploadSingleResume, uploadImage, uploadEmployeeDocs, uploadAvatar };
