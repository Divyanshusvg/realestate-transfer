import { Router } from "express";
import { loginAdmin,
    getLoginAdmin,
    logoutAdmin,
    dashboredAdmin,
    propertyTypeCreate,
    propTypeList,
    userList,userDetails,
    editDelUser,
    filterUsersByVerification,
    updateVerificationStatus,
    updateUser,
    getUserActivity,
    resetPassword,
    getPropertyList,
    editdelProperty,
    subPropertyTypeCreate,
    subPropCategoryTypeList,
    subscription

} from "../controllers/admin/admin.controller.js";

import { isAdmin } from "../middlewares/auth.middleware.js";
const router = Router()



router.route("/").get(isAdmin , dashboredAdmin)
router.route("/login").post(loginAdmin)
router.route("/login").get(getLoginAdmin)
router.route("/logout").get(isAdmin ,logoutAdmin)
router.route("/proptype").post(isAdmin , propertyTypeCreate)
router.route("/mangeProp").get(isAdmin , propTypeList)
router.route("/userlist").get(isAdmin , userList)
router.route('/details').get(isAdmin, userDetails);
router.route('/editdel').post(isAdmin, editDelUser);
router.get('/verify', filterUsersByVerification);
router.post('/updateVerificationStatus', updateVerificationStatus);
router.post('/updateUser',isAdmin,updateUser)     
router.post('/getUserActivity',isAdmin,getUserActivity)     
router.post('/resetPassword',isAdmin,resetPassword);
router.get('/propertyList', isAdmin, getPropertyList);
router.post('/editProperty',isAdmin,editdelProperty);
router.route("/subPropertyTypeCreate").post(isAdmin , subPropertyTypeCreate)
router.route("/subCategory").get(isAdmin , subPropCategoryTypeList)
router.route("/subscription").get(isAdmin , subscription)


export default router