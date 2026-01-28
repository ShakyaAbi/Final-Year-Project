import multer from "multer";
import path from "path";
import { Request } from "express";

// Configure multer for memory storage (files stored in buffer)
const storage = multer.memoryStorage();

// File filter - only accept CSV files
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedExtensions = [".csv", ".txt"];
  const allowedMimeTypes = [
    "text/csv",
    "text/plain",
    "application/csv",
    "application/vnd.ms-excel",
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  // Validate both extension and MIME type for security
  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(mimeType)) {
    cb(null, true);
  } else {
    cb(new Error("Only CSV files are allowed (invalid file type)"));
  }
};

// Create multer upload instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Export middleware for single file upload
export const uploadCSV = upload.single("file");
