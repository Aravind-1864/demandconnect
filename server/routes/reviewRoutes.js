const router = require("express").Router();
const c = require("../controllers/reviewController");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const v = require("../validators");

router.post("/", protect, authorize("CUSTOMER"), validate({ body: v.reviewCreate }), c.create);

module.exports = router;
