const router = require("express").Router();
const c = require("../controllers/reviewController");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const v = require("../validators");

router.post("/", protect, authorize("CUSTOMER"), validate({ body: v.reviewCreate }), c.create);
router.patch("/:id/reply", protect, authorize("PROVIDER"), validate({ params: v.idParams, body: v.reviewReply }), c.reply);

module.exports = router;
