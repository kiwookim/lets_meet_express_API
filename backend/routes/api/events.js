const express = require("express");
const {
	Event,
	Group,
	Venue,
	User,
	Attendance,
	EventImage,
	Membership,
} = require("../../db/models");
const { requireAuth } = require("../../utils/auth");
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

//Add an Image to a Event based on the Event's id
router.post("/:eventId/images", requireAuth, async (req, res, next) => {
	const eventId = Number(req.params.eventId);
	const specificEvent = await Event.findByPk(eventId);
	const specificGroup = await Group.findOne({
		where: {
			id: specificEvent.groupId,
		},
	});
	const currUserId = req.user.id;
	if (!specificEvent) {
		res.status(404);
		return res.json({
			message: "Event could not be found",
			statusCode: 404,
		});
	}
	//CurrUser must be an attendee
	//if currUSer is in list of attendees list-> authorized
	const attendees = await Attendance.findAll({
		where: {
			eventId: specificEvent.id,
			status: "attending",
		},
	});
	const attendeesPOJO = [];
	for (let attendee of attendees) {
		attendeesPOJO.push(attendee.toJSON());
	}
	const attendeesIds = attendeesPOJO.map((attendee) => attendee.userId);
	console.log("attendeeIds:          ", attendeesIds);
	//CurrUser must be a host
	// if currUserId matches possibleHost id ----> authorized
	const possibleHost = await User.findOne({
		where: {
			id: specificGroup.organizerId,
		},
	});
	const possibleHostId = possibleHost.toJSON().id;
	console.log("possibleHostId:        ", possibleHostId);
	console.log("currUserId:            ", currUserId);
	//CurrUser must be a co-host
	//if currUser is in list of co-host's list -> authorized
	const coHosts = await Membership.findAll({
		where: {
			groupId: specificGroup.id,
			status: "co-host",
		},
	});
	const coHostsPOJO = [];
	for (let member of coHosts) {
		coHostsPOJO.push(member.toJSON());
	}
	const authorizedMemberIds = coHostsPOJO.map((member) => member.userId);
	console.log("authorizedMembers:    ", authorizedMemberIds);

	if (
		authorizedMemberIds.includes(currUserId) ||
		attendeesIds.includes(currUserId) ||
		currUserId === possibleHostId
	) {
		console.log("YES,authorized");
		const { url, preview } = req.body;
		let newImage = await EventImage.create({
			eventId: eventId,
			url,
			preview,
		});
		const newImgPayload = {};
		newImage.toJSON();
		newImgPayload.id = newImage.id;
		newImgPayload.url = newImage.url;
		newImgPayload.preview = newImage.preview;
		return res.json(newImgPayload);
	} else {
		const err = new Error("");
		err.status = 403;
		err.message = "NOT, authorized";
		return next(err);
	}
});
module.exports = router;
