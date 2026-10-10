const router = require("express").Router();
const { listCategories } = require("../controllers/providerController");

router.get("/", listCategories);

module.exports = router;
