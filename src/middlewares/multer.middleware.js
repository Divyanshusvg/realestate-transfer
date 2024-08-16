import multer from "multer";
import path from 'path'
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./src/public/temp");
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1e6); // Generate a random number between 0 and 999999
    const uniqueSuffix = `${timestamp}-${randomNum}${path.extname(file.originalname)}`;
    cb(null, uniqueSuffix);
  }
});

  
export const upload = multer({ 
    storage, 
    limits: { fileSize: 10 * 1024 * 1024 },
})