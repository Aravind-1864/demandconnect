const router = require("express").Router();
const c = require("../controllers/authController");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/authMiddleware");
const v = require("../validators");

router.post("/register", validate({ body: v.register }), c.register);
router.post("/login", validate({ body: v.login }), c.login);
router.get("/me", protect, c.me);
router.post("/logout", protect, c.logout);

module.exports = router;
