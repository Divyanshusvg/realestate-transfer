import { Router } from "express";
import { getPropertyList } from "../controllers/other.controller.js";
import searchPropertyOnFoursquare from "../utils/fourSquareService.js";

const router = Router()

router.route("/getOtherPropertyList").get(getPropertyList)
router.route("/searchPropertyOnFoursquare").get(searchPropertyOnFoursquare)
export default router