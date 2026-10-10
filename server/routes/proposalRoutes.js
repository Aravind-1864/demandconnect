const router = require("express").Router();
const c = require("../controllers/proposalController");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const v = require("../validators");

router.use(protect);

router.post("/", authorize("PROVIDER"), validate({ body: v.proposalCreate }), c.create);
router.get("/mine", authorize("PROVIDER"), c.mine);
router.patch("/:id/accept", authorize("CUSTOMER"), validate({ params: v.idParams }), c.accept);
router.patch("/:id/reject", authorize("CUSTOMER"), validate({ params: v.idParams }), c.reject);
router.patch("/:id/withdraw", authorize("PROVIDER"), validate({ params: v.idParams }), c.withdraw);

module.exports = router;
