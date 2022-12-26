const express = require("express");
const { check } = require("express-validator");
const { handleValidationErrors } = require("../../utils/validation");
const router = express.Router();
const {
	Group,
	GroupImage,
	Membership,
	User,
	Venue,
	Event,
	Attendance,
	EventImage,
} = require("../../db/models");
const { restoreUser, requireAuth } = require("../../utils/auth");

router.get("/", async (req, res) => {
	const payload = [];
	const allGroups = await Group.findAll();
	for (let group of allGroups) {
		group = group.toJSON();
		group.numMembers = await Membership.count({
			where: {
				groupId: group.id,
				status: "member",
			},
		});
		let url = await GroupImage.findAll({
			where: {
				groupId: group.id,
				preview: true,
			},
			attributes: ["url"],
		});
		const lastPreviewImg = url[url.length - 1];
		if (url.length) {
			group.previewImage = lastPreviewImg.url;
		} else {
			group.previewImage = "No Preview Image Available";
		}

		payload.push(group);
	}

	return res.json({ Groups: payload });
});

router.get("/current", requireAuth, async (req, res) => {
	const currUserId = req.user.id;
	const currUserGroups = await Group.findAll({
		where: { organizerId: currUserId },
	});
	const payload = [];
	for (let group of currUserGroups) {
		group = group.toJSON();
		group.numMembers = await Membership.count({
			where: {
				groupId: group.id,
				status: "member",
			},
		});
		// const url = await GroupImage.findOne({
		// 	where: {
		// 		groupId: group.id,
		// 	},
		// 	attributes: ["url"],
		// });
		// if (url) {
		// 	group.previewImage = url.url;
		// }
		let url = await GroupImage.findAll({
			where: {
				groupId: group.id,
				preview: true,
			},
			attributes: ["url"],
		});
		const lastPreviewImg = url[url.length - 1];
		if (url.length) {
			group.previewImage = lastPreviewImg.url;
		} else {
			group.previewImage = "No Preview Image Available";
		}

		payload.push(group);
	}
	return res.json({ Groups: payload });
});
router.get("/:groupId", async (req, res, next) => {
	const groupId = req.params.groupId;
	//find Group by id
	let thisGroup = await Group.findByPk(groupId);

	if (!thisGroup) {
		const err = new Error();
		err.message = "Group could not be found";
		err.status = 404;
		return next(err);
	}

	//convert it to POJO
	thisGroup = thisGroup.toJSON();
	//find out numMembers
	thisGroup.numMembers = await Membership.count({
		where: {
			groupId: groupId,
			status: "member",
		},
	});
	//get associated GroupImage data
	const groupImageData = await GroupImage.findAll({
		where: {
			groupId: groupId,
		},
		attributes: ["id", "url", "preview"],
	});
	let imgPayload = [];
	for (let imageData of groupImageData) {
		imgPayload.push(imageData.toJSON());
	}
	thisGroup.GroupImages = imgPayload;
	//get user info by organizerId and ALIAS(rename it)
	let user = await User.findOne({
		where: { id: thisGroup.organizerId },
		attributes: ["id", "firstName", "lastName"],
	});
	user = user.toJSON();
	thisGroup.Organizer = user;
	//get Venues info by groupId
	const venues = await Venue.findAll({
		where: {
			groupId: thisGroup.id,
		},
		attributes: { exclude: ["createdAt", "updatedAt"] },
	});
	const venuePayload = [];
	for (let venue of venues) {
		venuePayload.push(venue.toJSON());
	}
	thisGroup.Venues = venuePayload;
	return res.json(thisGroup);
});
const validateCreateGroup = [
	// also validate firstName and lastName
	check("name")
		// .exists({ checkFalsy: true })
		.exists()
		.isLength({ max: 60, min: 1 })
		.withMessage("Name must be 60 characters or less and required"),
	check("about")
		.exists()
		.isLength({ min: 50 })
		.withMessage("About must be 50 characters or more"),
	check("type")
		.isIn(["In person", "Online"])
		.withMessage("Type must be 'Online' or 'In person'"),
	check("private").isBoolean().withMessage("Private must be a boolean"),
	check("city").notEmpty().withMessage("City is required"),
	check("state").notEmpty().withMessage("State is required"),
	handleValidationErrors,
];

//Create a Group
router.post(
	"/",
	[requireAuth, ...validateCreateGroup],
	async (req, res, next) => {
		// const currUserId = req.user.id;
		// console.log(currUserId);
		const { name, about, type, private, city, state } = req.body;

		const newGroup = await Group.create({
			name,
			about,
			type,
			private,
			city,
			state,
			organizerId: Number(req.user.id),
		});
		res.statusCode = 201;
		return res.json(newGroup);
	}
);

//Add an Image to a Group based on the Group's id
router.post("/:groupId/images", requireAuth, async (req, res, next) => {
	const { url, preview } = req.body;
	const specificGroup = await Group.findByPk(req.params.groupId);
	if (!specificGroup) {
		const err = new Error("");
		err.status = 404;
		err.message = "Group could not be found";
		return next(err);
	}

	// Only the organizer of the group is authorized to add an image
	// authorization.....

	if (req.user.id !== specificGroup.organizerId) {
		const err = new Error("");
		err.status = 403;
		err.message = "Not authorized";
		return next(err);
	}

	let newImage = await GroupImage.create({
		url,
		preview,
		groupId: Number(req.params.groupId),
	});
	if (newImage.preview === true) {
		Group.previewImage = newImage.preview;
	}
	const responsePayload = {};
	newImage = newImage.toJSON();
	responsePayload.id = newImage.id;
	responsePayload.url = newImage.url;
	responsePayload.preview = newImage.preview;
	return res.json(responsePayload);
});

//Edit a group
router.put(
	"/:groupId",
	requireAuth,
	validateCreateGroup,
	async (req, res, next) => {
		const { name, about, type, private, city, state } = req.body;
		const specificGroup = await Group.findByPk(req.params.groupId);
		if (!specificGroup) {
			const err = new Error("");
			err.status = 404;
			err.message = "Group could not be found";
			return next(err);
		}

		// Only the organizer of the group is authorized edit group
		if (req.user.id !== specificGroup.organizerId) {
			const err = new Error("");
			err.status = 403;
			err.message = "Not authorized";
			return next(err);
		} else {
			const updatedGroup = await specificGroup.update({
				name,
				about,
				type,
				private,
				city,
				state,
			});
			return res.json(updatedGroup);
		}
	}
);

router.delete("/:groupId", requireAuth, async (req, res, next) => {
	const specificGroup = await Group.findByPk(req.params.groupId);
	if (!specificGroup) {
		const err = new Error("");
		err.status = 404;
		err.message = "Group could not be found";
		return next(err);
	}

	// Only the organizer of the group is authorized to delete group
	if (req.user.id !== specificGroup.organizerId) {
		const err = new Error("");
		err.status = 403;
		err.message = "Not authorized";
		return next(err);
	} else {
		await specificGroup.destroy();
	}

	return res.json({
		message: "Successfully deleted",
		statusCode: 200,
	});
});

//Get All Venues for a Group specified by its id
router.get("/:groupId/venues", requireAuth, async (req, res, next) => {
	const currUser = req.user.id;
	const groupId = req.params.groupId;
	const specificGroup = await Group.findByPk(groupId);

	//Error response: Couldn't find a Group with the specified id
	if (!specificGroup) {
		const err = new Error("");
		err.status = 404;
		err.message = "Group could not be found";
		return next(err);
	}
	//Current User must be the organizer of the group or a member of the group with a status of "co-host"
	// const coHost = await Membership.findOne({ where: { groupId: groupId } });

	// const isHost = coHost.status === "co-host";
	const coHosts = await Membership.findAll({
		where: {
			groupId: groupId,
			status: "co-host",
		},
	});
	const coHostsPOJO = [];
	for (let member of coHosts) {
		coHostsPOJO.push(member.toJSON());
	}
	const authorizedMemberIds = coHostsPOJO.map((member) => member.userId);

	if (
		currUser !== specificGroup.organizerId &&
		!authorizedMemberIds.includes(currUser)
	) {
		const err = new Error("");
		err.status = 403;
		err.message = "Not authorized";
		return next(err);
	}

	// Else if passes error handler...
	const allVenues = await Venue.findAll({
		where: {
			groupId: specificGroup.id,
		},
		attributes: { exclude: ["createdAt", "updatedAt"] },
	});
	const venuePayload = [];
	for (let venue of allVenues) {
		venuePayload.push(venue.toJSON());
	}
	return res.json({
		Venues: venuePayload,
	});
});
//venue body validation
const validateVenue = [
	check("address").notEmpty().withMessage("Street address is required"),
	check("city").notEmpty().withMessage("City is required"),
	check("state").notEmpty().withMessage("State is required"),
	check("lat").not().isString().withMessage("Latitude is not valid"),
	check("lng").not().isString().withMessage("Longitute is not valid"),
	handleValidationErrors,
];

// Create a new Venue for a Group specified by its id
router.post(
	"/:groupId/venues",
	requireAuth,
	validateVenue,
	async (req, res, next) => {
		const groupId = req.params.groupId;
		const currUserId = req.user.id;
		const specificGroup = await Group.findByPk(groupId);
		const { address, city, state, lat, lng } = req.body;
		//Error response: Couldn't find a Group with the specified id
		if (!specificGroup) {
			const err = new Error("");
			err.status = 404;
			err.message = "Group could not be found";
			return next(err);
		}
		//Current User must be the organizer of the group or a member of the group with a status of "co-host"
		const coHosts = await Membership.findAll({
			where: {
				groupId: groupId,
				status: "co-host",
			},
		});
		const coHostsPOJO = [];
		for (let member of coHosts) {
			coHostsPOJO.push(member.toJSON());
		}
		const authorizedMemberIds = coHostsPOJO.map((member) => member.userId);

		if (
			currUserId !== specificGroup.organizerId &&
			!authorizedMemberIds.includes(currUserId)
		) {
			const err = new Error("");
			err.status = 403;
			err.message = "Not authorized";
			return next(err);
		}
		let newVenue = await Venue.create({
			address,
			city,
			state,
			lat,
			lng,
			groupId: groupId,
		});
		const latestInsert = await Venue.findAll({
			limit: 1,
			order: [["createdAt", "DESC"]],
			attributes: { exclude: ["createdAt", "updatedAt"] },
		});

		return res.json(...latestInsert);
	}
);

//Get all Events of a Group specified by its id
router.get("/:groupId/events", async (req, res, next) => {
	const groupId = req.params.groupId;
	const events = await Event.findAll({
		where: {
			groupId: groupId,
		},
		attributes: [
			"id",
			"groupId",
			"venueId",
			"name",
			"type",
			"startDate",
			"endDate",
		],
	});
	if (!events.length) {
		const err = new Error();
		(err.message = "Group could not be found"), (err.status = 404);
		return next(err);
	}
	const payload = [];
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
// const validateEvent = [
// 	check("venueId").notEmpty().withMessage("Venue does not exist"),
// 	check("name")
// 		.exists({ checkFalsy: true })
// 		.withMessage("Name must be at least 5 characters"),
// 	check("type")
// 		.exists({ checkFalsy: true })
// 		.isIn(["Online", "In person"])
// 		.withMessage("Type must be Online or In person"),
// 	check("capacity")
// 		.exists({ checkFalsy: true })
// 		.isInt()
// 		.withMessage("Capacity must be an integer"),
// 	check("price")
// 		.exists({ checkFalsy: true })
// 		.isInt()
// 		.isDecimal()
// 		.withMessage("Price is invalid"),
// 	check("description")
// 		.exists({ checkFalsy: true })
// 		.withMessage("Description is required"),

// 	handleValidationErrors,
// ];

//Create an Event for a Group specified by its id
router.post("/:groupId/events", requireAuth, async (req, res, next) => {
	const groupId = req.params.groupId; //curr user must be organizer of the Group OR member of the group with status 'co-host'
	const currUserId = req.user.id;
	const specificGroup = await Group.findByPk(Number(groupId));
	if (!specificGroup) {
		const err = new Error("");
		err.status = 404;
		err.message = "Group could not be found";
		return next(err);
	}
	const coHosts = await Membership.findAll({
		where: {
			groupId: groupId,
			status: "co-host",
		},
	});
	const coHostsPOJO = [];
	for (let member of coHosts) {
		coHostsPOJO.push(member.toJSON());
	}
	const authorizedMemberIds = coHostsPOJO.map((member) => member.userId);

	if (
		currUserId !== specificGroup.organizerId &&
		!authorizedMemberIds.includes(currUserId)
	) {
		const err = new Error("");
		err.status = 403;
		err.message = "Not authorized";
		return next(err);
	}

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

	//Event Body Validation
	const validationErrors = {};
	const foundVenue = await Venue.findByPk(venueId);
	const eventType = ["In person", "Online"];

	if (!foundVenue) validationErrors.venueId = "Venue does not exist";
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

	const newEvent = await Event.create({
		venueId,
		groupId: Number(groupId),
		name,
		capacity,
		type,
		price,
		description,
		startDate,
		endDate,
	});
	const newEventResponse = {};
	for (let key in newEvent.toJSON()) {
		if (key === "createdAt" || key === "updatedAt") {
			break;
		}
		newEventResponse[key] = newEvent[key];
	}
	return res.json(newEventResponse);
});

module.exports = router;
