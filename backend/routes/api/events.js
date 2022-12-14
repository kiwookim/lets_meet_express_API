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
const { Op } = require("sequelize");

router.get("/", async (req, res, next) => {
	//query filters
	const pagination = {};
	const whereClause = {};
	const queryValidationErrors = {};
	let { page, size, name, type, startDate } = req.query;
	//body error handling here
	if (page && page < 1)
		queryValidationErrors.page = "Page must be greater than or equal to 1";
	if (size && size < 1)
		queryValidationErrors.size = "Size must be greater than or equal to 1";
	if (name) {
		const integers = "0123456789";
		for (let char of name) {
			if (integers.includes(char)) {
				queryValidationErrors.name = "Name must be a string";
			}
		}
	}
	if (type) {
		const choices = ["In person", "Online"];
		if (!choices.includes(type)) {
			queryValidationErrors.type = "Type must be 'Online' or 'In person'";
		}
	}
	if (startDate) {
		const inputDate = new Date(startDate).getTime();
		// console.log(inputDate);
		const formattedDate = startDate.split(" ")[0].split("-");
		// console.log(formattedDate);
		if (
			formattedDate.length < 3 ||
			isNaN(inputDate) ||
			formattedDate.includes("")
		) {
			queryValidationErrors.startDate = "Start date must be a valid datetime";
		}
	}
	if (Object.keys(queryValidationErrors).length) {
		res.status(400);
		return res.json({
			message: "Validation Error",
			statusCode: 400,
			errors: queryValidationErrors,
		});
	}
	//whereCluase
	if (name) {
		whereClause.name = { [Op.substring]: name };
	}
	if (type) {
		whereClause.type = type;
	}
	if (startDate) {
		whereClause.startDate = { [Op.substring]: startDate };
	}

	//default page and size values
	if (!page) {
		page = 1;
	} else {
		if (page > 10) {
			page = 10;
		}
	}
	if (!size) {
		size = 20;
	} else {
		if (size > 20) {
			size = 20;
		}
	}
	page = Number(page);
	size = Number(size);
	console.log("PAGE", page);
	console.log("SIZE", size);
	pagination.limit = size;
	pagination.offset = size * (page - 1);
	console.log("PAGINATION:     ", pagination);
	console.log("Where CLAUSE:   ", whereClause);

	//actual resultPayloads
	const payload = [];
	const events = await Event.findAll({
		attributes: {
			exclude: ["description", "capacity", "price", "createdAt", "updatedAt"],
		},
		where: whereClause,
		...pagination,
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
//Get details of an Event specified by its id
router.get("/:eventId", async (req, res, next) => {
	const eventId = Number(req.params.eventId);
	let specificEvent = await Event.findOne({
		where: {
			id: eventId,
		},
		attributes: { exclude: ["createdAt", "updatedAt"] },
	});
	// event cannot be found
	if (!specificEvent) {
		res.status(404);
		return res.json({
			message: "Event couldn't be found",
			statusCode: 404,
		});
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
	const currUserId = req.user.id;
	if (!specificEvent) {
		res.status(404);
		return res.json({
			message: "Event could not be found",
			statusCode: 404,
		});
	}
	const specificGroup = await Group.findOne({
		where: {
			id: specificEvent.groupId,
		},
	});
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
		res.status(403);
		return res.json({
			message: "Forbidden",
			statusCode: 403,
		});
	}
});
//Delete an Event specified by its id
router.delete("/:eventId", requireAuth, async (req, res, next) => {
	const currUserId = req.user.id;
	const eventId = Number(req.params.eventId);
	const specificEvent = await Event.findByPk(eventId);
	if (!specificEvent) {
		res.status(404);
		return res.json({
			message: "Event could not be found",
			statusCode: 404,
		});
	}
	const specificGroup = await Group.findOne({
		where: {
			id: specificEvent.groupId,
		},
	});
	//REQUIRE authorization
	//must be organizer of the group OR cohost
	//currUserId === specificGroup.organizerId ---> organizer
	console.log("groupOrganizer:        ", specificGroup.organizerId);
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
		currUserId === specificGroup.organizerId ||
		authorizedMemberIds.includes(currUserId)
	) {
		await specificEvent.destroy();
		return res.json({
			message: "Successfully deleted",
		});
	} else {
		res.status(403);
		return res.json({ message: "Forbidden", statusCode: 403 });
	}
});

//Edit an Event specified by its id
router.put("/:eventId", requireAuth, async (req, res, next) => {
	const currUserId = req.user.id;
	const eventId = Number(req.params.eventId);
	const specificEvent = await Event.findOne({
		where: {
			id: eventId,
		},
		attributes: { exclude: ["updatedAt", "createdAt"] },
	});
	if (!specificEvent) {
		res.status(404);
		return res.json({
			message: "Event could not be found",
			statusCode: 404,
		});
	}
	const specificGroup = await Group.findOne({
		where: {
			id: specificEvent.groupId,
		},
	});
	//REQUIRE authorization
	//must be organizer of the group OR cohost
	//currUserId === specificGroup.organizerId ---> organizer
	console.log("groupOrganizer:        ", specificGroup.organizerId);
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

	//Event Body Validation
	const {
		venueId,
		name,
		type,
		capacity,
		price,
		description,
		startDate,
		endDate,
	} = req.body;
	const validationErrors = {};
	const foundVenue = await Venue.findByPk(venueId);
	const eventType = ["In person", "Online"];

	if (venueId) {
		if (!foundVenue) {
			res.status(404);
			return res.json({
				message: "Venue couldn't be found",
				statusCode: 404,
			});
		}
	}
	if (name.length < 5)
		validationErrors.name = "Name must be at least 5 characters";
	if (!eventType.includes(type))
		validationErrors.type = "Type must be Online or In person";
	if (typeof capacity !== "number")
		validationErrors.capacity = "Capacity must be an integer";
	if (typeof price !== "number" || price < 0)
		validationErrors.price = "Price is invalid";
	if (description.length === 0)
		validationErrors.description = "Description is required";
	// FINISH startDate and endDate
	const eventStartDate = startDate.split(" ")[0].split("-");
	const eventStartTime = startDate.split(" ")[1].split(":");
	const eventEndDate = endDate.split(" ")[0].split("-");
	const eventEndTime = endDate.split(" ")[1].split(":");
	const [sYear, sMonth, sDay] = eventStartDate;
	const [sHour, sMin, sSec] = eventStartTime;
	const [eYear, eMonth, eDay] = eventEndDate;
	const [eHour, eMin, eSec] = eventEndTime;
	const getStartDate = new Date(
		sYear,
		sMonth - 1,
		sDay,
		sHour,
		sMin,
		sSec
	).getTime();
	const getEndDate = new Date(
		eYear,
		eMonth - 1,
		eDay,
		eHour,
		eMin,
		eSec
	).getTime();
	const getCurrDate = new Date().getTime();
	if (getStartDate < getCurrDate)
		validationErrors.startDate = "Start date must be in the future";
	if (getStartDate > getEndDate)
		validationErrors.endDate = "End date is less than start date";
	if (Object.keys(validationErrors).length) {
		res.status(400);
		return res.json({
			message: "Validation Error",
			statusCode: 404,
			errors: {
				...validationErrors,
			},
		});
	}
	// end of event validation

	if (
		currUserId === specificGroup.organizerId ||
		authorizedMemberIds.includes(currUserId)
	) {
		const resultPayload = {};
		let updatedEvent = await specificEvent.update({
			venueId,
			name,
			type,
			capacity,
			price,
			description,
			startDate,
			endDate,
		});
		updatedEvent = updatedEvent.toJSON();
		for (let key in updatedEvent) {
			if (key !== "updatedAt") {
				resultPayload[key] = updatedEvent[key];
			}
		}
		return res.json(resultPayload);
	} else {
		res.status(403);
		return res.json({ message: "Forbidden", statusCode: 403 });
	}
});

// Get all Attendees of an Event specified by its id
router.get("/:eventId/attendees", async (req, res, next) => {
	const eventId = Number(req.params.eventId);
	const currUserId = req.user ? req.user.id : null;
	const specificEvent = await Event.findByPk(eventId);
	//Error response: Couldn't find an Event with the specified id
	if (!specificEvent) {
		res.status(404);
		return res.json({
			message: "Event couldn't be found",
			statusCode: 404,
		});
	}
	const specificGroup = await Group.findOne({
		where: {
			id: specificEvent.groupId,
		},
	});
	// findout if cohost
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
	// console.log("authorizedMembers:    ", authorizedMemberIds);

	let allAttendances = await Attendance.findAll({
		where: {
			eventId: specificEvent.id,
		},
	});
	const allAttendancesPOJO = [];
	for (let attendance of allAttendances) {
		allAttendancesPOJO.push(attendance.toJSON());
	}
	// console.log("allAttendancesPOJO", allAttendancesPOJO);

	const usersInfoPOJO = [];
	for (let attendance of allAttendancesPOJO) {
		// const userId = attendance.userId;
		const allUserInfos = await User.findAll({
			where: {
				id: attendance.userId,
			},
			attributes: ["id", "firstName", "lastName"],
		});
		for (let user of allUserInfos) {
			user = user.toJSON();
			//AUTHORIZATION
			//cohost or organizer -----> show all status including(pending);
			if (
				currUserId === specificGroup.organizerId ||
				authorizedMemberIds.includes(currUserId)
			) {
				console.log("I am organizer or co-host");
				console.log("currUserId:  ", currUserId);
				user.Attendance = { status: attendance.status };
				usersInfoPOJO.push(user);
			} else {
				//if not----> don't show (pending)
				console.log("do not show add pending attendees to resultPayload");
				console.log("currUserId:  ", currUserId);
				console.log("STATUS", attendance.status);
				if (attendance.status !== "pending") {
					user.Attendance = { status: attendance.status };
					usersInfoPOJO.push(user);
				}
			}
		}
	}
	return res.json({
		Attendees: usersInfoPOJO,
	});
});

//Request to Attend an Event based on the Event's id
router.post("/:eventId/attendance", requireAuth, async (req, res, next) => {
	const eventId = Number(req.params.eventId);
	const currUserId = req.user.id;
	const specificEvent = await Event.findByPk(eventId);
	if (!specificEvent) {
		res.status(404);
		return res.json({
			message: "Event couldn't be found",
			statusCode: 404,
		});
	}

	//AUTHORIZATION: currUser must be member of the group
	const specificGroup = await Group.findOne({
		where: {
			id: specificEvent.groupId,
		},
	});
	const allMembers = await Membership.findAll({
		where: {
			groupId: specificGroup.id,
			status: "member",
		},
	});
	const allMembersPOJO = [];
	for (let member of allMembers) {
		allMembersPOJO.push(member.toJSON());
	}
	// findout if cohost
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
	const coHostsIDs = coHostsPOJO.map((member) => member.userId);
	console.log("cohosts:       ", coHostsIDs);

	console.log("ALL MEMBERS    ", allMembersPOJO);
	console.log("CURRENT USER ID", currUserId);
	const allMembersIDs = allMembersPOJO.map((member) => member.userId);
	console.log("ALL MEMBERS IDs: ", allMembersIDs);
	console.log("ORGANIZER ID:   ", specificGroup.organizerId);

	//              : You are already host of the event
	if (
		currUserId === specificGroup.organizerId ||
		coHostsIDs.includes(currUserId)
	) {
		res.status(404);
		return res.json({
			message: "User is already a host status",
			statusCode: 400,
		});
	}
	const currUserAttendance = await Attendance.findOne({
		where: {
			eventId: specificEvent.id,
			userId: currUserId,
		},
	});
	if (currUserAttendance) {
		//Error response: Current User already has a pending attendance for the event
		if (currUserAttendance.status === "pending") {
			res.status(400);
			return res.json({
				message: "Attendance has already been requested",
				statusCode: 400,
			});
		}
		//Error response: Current User is already an accepted attendee of the event
		if (currUserAttendance.status === "attending") {
			res.status(400);
			return res.json({
				message: "User is already an attendee of the event",
				statusCode: 400,
			});
		}
	}

	if (allMembersIDs.includes(currUserId)) {
		console.log("I am a member and I can request attendance");
		const resultPayload = {};
		const requestAttendance = await Attendance.create({
			eventId: eventId,
			userId: currUserId,
			status: "pending",
		});
		resultPayload.userId = requestAttendance.userId;
		resultPayload.eventId = requestAttendance.eventId;
		resultPayload.status = requestAttendance.status;
		return res.json(resultPayload);
	} else {
		// not a member of the Group
		const err = new Error("");
		err.status = 403;
		err.message = "Not Authorized: you are not a member of the group";
		return next(err);
	}
});

// Change the status of an attendance for an event specified by id
router.put("/:eventId/attendance", requireAuth, async (req, res, next) => {
	const eventId = Number(req.params.eventId);
	const currUserId = req.user.id;
	const { userId, status } = req.body;
	const specificEvent = await Event.findByPk(eventId);
	//Error response: Couldn't find an Event with the specified id
	if (!specificEvent) {
		res.status(404);
		return res.json({
			message: "Event couldn't be found",
			statusCode: 404,
		});
	}
	const specificGroup = await Group.findOne({
		where: {
			id: specificEvent.groupId,
		},
	});
	const specificAttendance = await Attendance.findOne({
		where: {
			eventId: eventId,
			userId: userId,
		},
		// attributes: ["id", "eventId", "userId", "status"],
		attributes: { exclude: ["updatedAt", "createdAt"] },
	});
	const isOrganizer = currUserId === specificGroup.organizerId;
	console.log("isOrganizer????:    ", isOrganizer);
	// findout if cohost
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
	const coHostsIDs = coHostsPOJO.map((member) => member.userId);
	console.log("cohosts:       ", coHostsIDs);
	const iscoHost = coHostsIDs.includes(currUserId);
	console.log("currUserId:       ", currUserId);
	console.log("iscoHost?????:    ", iscoHost);
	//AUTHORIZATION: either organizer or co-host status
	if (isOrganizer || iscoHost) {
		//Error response: If changing the attendance status to "pending".
		if (status === "pending") {
			res.status(400);
			return res.json({
				message: "Cannot change an attendance status to pending",
				statusCode: 400,
			});
		}
		//Error response: If attendance does not exist
		if (!specificAttendance) {
			res.status(404);
			return res.json({
				message: "Attendance between the user and the event does not exist",
				statusCode: 404,
			});
		}
		const resultPayload = {};
		let updateAttendance = await specificAttendance.update({
			status: status,
		});
		updateAttendance = updateAttendance.toJSON();
		resultPayload.id = updateAttendance.id;
		resultPayload.eventId = updateAttendance.eventId;
		resultPayload.userId = updateAttendance.userId;
		resultPayload.status = updateAttendance.status;
		return res.json(resultPayload);
	} else {
		const err = new Error("");
		err.status = 403;
		err.message = "Not Authorized";
		return next(err);
	}
});

//Delete attendance to an event specified by id
router.delete("/:eventId/attendance", requireAuth, async (req, res, next) => {
	const currUserId = req.user.id;
	const eventId = Number(req.params.eventId);
	const specificEvent = await Event.findByPk(eventId);
	const { userId } = req.body;
	//Sample Body: {"userId": 1}
	//Error response: Couldn't find an Event with the specified id
	if (!specificEvent) {
		res.status(404);
		return res.json({
			message: "Event couldn't be found",
			statusCode: 404,
		});
	}
	const specificGroup = await Group.findOne({
		where: {
			id: specificEvent.groupId,
		},
	});
	const specificAttendance = await Attendance.findOne({
		where: {
			eventId: specificEvent.id,
			userId: userId,
		},
	});
	console.log("currUserId:       ", currUserId);
	console.log("specificGroup:     ", specificGroup.toJSON());
	//AUTHORIZATION : Host of the group or currUser === given userId
	if (currUserId === specificGroup.organizerId || currUserId === userId) {
		console.log('AUTHORIZED": DO SOMETHING');
		//Error response: Attendance does not exist for this User
		if (!specificAttendance) {
			res.status(404);
			return res.json({
				message: "Attendance does not exist for this User",
				statusCode: 404,
			});
		}
		console.log("specificAttendance:", specificAttendance.toJSON());
		await specificAttendance.destroy();
		return res.json({
			message: "Successfully deleted attendance from event",
		});
	} else {
		//Error response: Only the User or organizer may delete an Attendance
		res.status(403);
		return res.json({
			message: "Only the User or organizer may delete an Attendance",
			statusCode: 403,
		});
	}
});

module.exports = router;
