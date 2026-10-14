const router = require("express").Router();
const c = require("../controllers/requestController");
const proposals = require("../controllers/proposalController");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const v = require("../validators");

router.use(protect);

router.post("/", authorize("CUSTOMER"), validate({ body: v.requestCreate }), c.create);
router.get("/mine", authorize("CUSTOMER"), c.mine);
router.get("/open", authorize("PROVIDER"), validate({ query: v.openRequestsQuery }), c.open);

router.get("/:id", validate({ params: v.idParams }), c.getById);
router.patch("/:id", authorize("CUSTOMER"), validate({ params: v.idParams, body: v.requestUpdate }), c.update);
router.delete("/:id", authorize("CUSTOMER"), validate({ params: v.idParams }), c.cancel);
router.patch("/:id/plan", authorize("CUSTOMER"), validate({ params: v.idParams, body: v.requestPlan }), c.updatePlan);
router.post("/:id/invite", authorize("CUSTOMER"), validate({ params: v.idParams, body: v.requestInvite }), c.invite);
router.get("/:id/proposals", authorize("CUSTOMER", "ADMIN"), validate({ params: v.idParams }), proposals.listForRequest);

module.exports = router;
