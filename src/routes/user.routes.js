import { Router } from "express";
import { 
    loginUser, 
    logoutUser, 
    registerUser,
    refreshAccessToken, 
    getCurrentUser, 
    uploadImage, 
    updateAccountDetails,
    addProperty,
    getAllProperties,
    getPropertyType,
    getSubcategories,
    uploadvideo

} from "../controllers/user.controller.js";

import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";



const router = Router()
router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route("/uploadimage").post(upload.array('files',10),uploadImage )
router.route("/uploadvideo").post(upload.array('files',10),uploadvideo )
router.route("/getAllProperties").post(getAllProperties )
router.route("/getPropertyType").post(getPropertyType )
//secured routes
router.route("/logout").post(verifyJWT,  logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/addProperty").post(verifyJWT, addProperty)
router.route("/getSubcategories").get(verifyJWT, getSubcategories)
export default router