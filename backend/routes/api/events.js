const express = require("express");
const { Event, Group, Venue, User, Attendance } = require("../../db/models");
const router = express.Router();

router.get("/", async (req, res, next) => {
	const payload = [];
	const events = await Event.findAll();
	for (let event of events) {
		event = event.toJSON();
		event.numAttending = await Attendance.count({
			where: {
				eventId: event.id,
				status: "attending",
			},
		});
		console.log(event.numAttending);
	}
	return res.json(events);
});

module.exports = router;
