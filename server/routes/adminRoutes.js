const router = require("express").Router();
const c = require("../controllers/adminController");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const v = require("../validators");

router.use(protect, authorize("ADMIN"));

router.get("/stats", c.stats);
router.get("/users", c.listUsers);
router.patch("/users/:id", validate({ params: v.idParams, body: v.adminUserUpdate }), c.setUserActive);
router.get("/providers", c.listProviders);
router.patch("/providers/:id/verify", validate({ params: v.idParams, body: v.adminVerify }), c.setProviderVerified);
router.get("/categories", c.listCategories);
router.post("/categories", validate({ body: v.categoryCreate }), c.createCategory);
router.patch("/categories/:id", validate({ params: v.idParams, body: v.categoryUpdate }), c.updateCategory);

module.exports = router;
