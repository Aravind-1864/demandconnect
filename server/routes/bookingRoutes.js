const router = require("express").Router();
const c = require("../controllers/bookingController");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const v = require("../validators");

router.use(protect);

router.get("/mine", authorize("CUSTOMER", "PROVIDER"), c.mine);
router.get("/:id", validate({ params: v.idParams }), c.getById);
router.patch(
  "/:id/status",
  authorize("CUSTOMER", "PROVIDER"),
  validate({ params: v.idParams, body: v.bookingStatus }),
  c.updateStatus
);

module.exports = router;
