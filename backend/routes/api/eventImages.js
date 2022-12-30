const express = require("express");
const router = express.Router();
const { EventImage } = require("../../db/models");
const { restoreUser, requireAuth } = require("../../utils/auth");

router.delete("/:imageId", requireAuth, async (req, res, next) => {
	console.log("testing");
});
module.exports = router;
