const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const c = require("../controllers/aiController");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const v = require("../validators");

// AI calls cost money, so cap them per client.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many AI requests. Please wait a minute." },
});

router.use(protect, authorize("CUSTOMER"), aiLimiter);

router.post("/parse-requirement", validate({ body: v.parseRequirement }), c.parseRequirement);
router.post("/recommendations", validate({ body: v.requestRef }), c.recommendations);
router.post("/packages", validate({ body: v.requestRef }), c.packages);
router.post("/compare-proposals", validate({ body: v.requestRef }), c.compareProposals);

module.exports = router;
