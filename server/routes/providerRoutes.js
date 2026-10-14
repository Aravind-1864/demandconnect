const router = require("express").Router();
const c = require("../controllers/providerController");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const v = require("../validators");

// Public directory (Manual Mode browsing does not require an account).
router.get("/", validate({ query: v.providerQuery }), c.search);

// Static paths must be declared before "/:id".
router.get("/batch", validate({ query: v.batchQuery }), c.batch);
router.get("/me", protect, authorize("PROVIDER"), c.getMine);
router.get("/me/stats", protect, authorize("PROVIDER"), c.stats);
router.get("/me/calendar", protect, authorize("PROVIDER"), c.calendar);
router.post("/verification", protect, authorize("PROVIDER"), validate({ body: v.verificationSubmit }), c.submitVerification);
router.post("/profile", protect, authorize("PROVIDER"), validate({ body: v.providerProfileCreate }), c.createProfile);
router.patch("/profile", protect, authorize("PROVIDER"), validate({ body: v.providerProfileUpdate }), c.updateProfile);

router.get("/:id", validate({ params: v.idParams }), c.getById);
router.get("/:id/reviews", validate({ params: v.idParams }), c.listReviews);

module.exports = router;
