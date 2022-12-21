const express = require("express");
const router = express.Router();
const { Group } = require("../../db/models");

router.get("/", async (req, res, next) => {
	const allGroups = await Group.findAll();
	const results = [];
	//get previewImage from JOIN table -- previewImage(URL) if true
	//get numOfMembers from JOIN table -- aggregate(count())
	return res.json({
		Groups: allGroups,
	});
});

module.exports = router;
