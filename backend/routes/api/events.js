const express = require("express");
const {
	Event,
	Group,
	Venue,
	User,
	Attendance,
	EventImage,
} = require("../../db/models");
const router = express.Router();

router.get("/", async (req, res, next) => {
	const payload = [];
	const events = await Event.findAll({
		attributes: {
			exclude: ["description", "capacity", "price", "createdAt", "updatedAt"],
		},
	});
	for (let event of events) {
		event = event.toJSON();
		event.numAttending = await Attendance.count({
			where: {
				eventId: event.id,
				status: "attending",
			},
		});
		let url = await EventImage.findAll({
			where: {
				eventId: event.id,
				preview: true,
			},
			attributes: ["url"],
		});
		const lastPreviewImg = url[url.length - 1];
		if (url.length) {
			event.previewImage = lastPreviewImg.url;
		} else {
			event.previewImage = "No Preview Image Available";
		}
		const associatedGroup = await Group.findOne({
			where: {
				id: event.groupId,
			},
			attributes: ["id", "name", "city", "state"],
		});
		event.Group = associatedGroup;
		//Venue
		const associatedVenue = await Venue.findOne({
			where: {
				id: event.venueId,
			},
			attributes: ["id", "city", "state"],
		});
		if (associatedVenue) {
			event.Venue = associatedVenue;
		} else {
			event.Venue = null;
		}

		payload.push(event);
	}
	return res.json({
		Events: payload,
	});
});
router.get("/:eventId", async (req, res, next) => {
	const eventId = req.params.eventId;
	let specificEvent = await Event.findOne({
		where: {
			id: eventId,
		},
		attributes: { exclude: ["createdAt", "updatedAt"] },
	});
	// event cannot be found
	if (!specificEvent) {
		const err = new Error("");
		(err.message = "Event could not be found"), (err.status = 404);
		return next(err);
	}
	const numOfAttendees = await Attendance.count({
		where: {
			eventId: eventId,
			status: "attending",
		},
	});
	const associatedGroup = await Group.findOne({
		where: {
			id: specificEvent.groupId,
		},
		attributes: ["id", "name", "private", "city", "state"],
	});
	const associatedVenue = await Venue.findOne({
		where: {
			id: specificEvent.venueId,
		},
		attributes: ["id", "address", "city", "state", "lat", "lng"],
	});
	const eventImages = await EventImage.findAll({
		where: {
			eventId: eventId,
		},
		attributes: { exclude: ["createdAt", "updatedAt", "eventId"] },
	});
	specificEvent = specificEvent.toJSON();
	specificEvent.numAttending = numOfAttendees;
	specificEvent.Group = associatedGroup;
	specificEvent.Venue = associatedVenue;
	specificEvent.EventImages = eventImages;
	return res.json(specificEvent);
});

module.exports = router;
