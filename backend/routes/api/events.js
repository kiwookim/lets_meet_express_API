const express = require("express");
const router = express.Router();
const { Event } = require("../../db/models");

router.get("/", async (req, res) => {
	const allevents = await Event.findAll({});
	for (let event of allevents) {
		event.toJSON();
		console.log(event.id);
	}
	return res.json(allevents);
});

module.exports = router;
