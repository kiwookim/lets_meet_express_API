const express = require("express");
const { Event, Group, Venue, User } = require("../../db/models");
const router = express.Router();
const { Event } = require("../../db/models");

router.get("/", async (req, res, next) => {
	const events = await Event.findAll();
	events.forEach(async (event) => {
		const group = await event.getGroup();
	});

	return res.json(events);
});

module.exports = router;
