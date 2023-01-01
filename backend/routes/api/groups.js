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
const { Op } = require("sequelize");

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
	const currUSerOrganized = await Group.findAll({
		where: { organizerId: currUserId },
	});
	const payload = [];
	for (let group of currUSerOrganized) {
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
	const membershipInfos = await Membership.findAll({
		where: {
			userId: currUserId,
			[Op.or]: [{ status: "member" }, { status: "co-host" }],
		},
	});
	// not a organizer but JOINED group as a 'member' or 'co-host'
	for (let member of membershipInfos) {
		member = member.toJSON();
		const specificGroup = await Group.findOne({
			where: {
				id: member.groupId,
			},
		});
		specificGroup.numMembers = await Membership.count({
			where: {
				groupId: specificGroup.id,
				status: "member",
			},
		});
		let url = await GroupImage.findAll({
			where: {
				groupId: specificGroup.id,
				preview: true,
			},
			attributes: ["url"],
		});
		const lastPreviewImg = url[url.length - 1];
		if (url.length) {
			specificGroup.previewImage = lastPreviewImg.url;
		} else {
			specificGroup.previewImage = "No Preview Image Available";
		}

		payload.push(specificGroup);
	}

	return res.json({ Groups: payload });
});

//Get details of a Group from an id
router.get("/:groupId", async (req, res, next) => {
	const groupId = Number(req.params.groupId);
	//find Group by id
	let thisGroup = await Group.findByPk(groupId);

	if (!thisGroup) {
		// const err = new Error();
		// err.message = "Group could not be found";
		// err.status = 404;
		// return next(err);
		res.status(404);
		return res.json({
			message: "Group couldn't be found",
			statusCode: 404,
		});
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
//break;

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
	const specificGroup = await Group.findByPk(Number(req.params.groupId));
	if (!specificGroup) {
		res.status(404);
		return res.json({
			message: "Group couldn't be found",
			statusCode: 404,
		});
	}

	// Only the organizer of the group is authorized to add an image
	// authorization.....

	if (req.user.id !== specificGroup.organizerId) {
		res.status(403);
		return res.json({ message: "Forbidden", statusCode: 403 });
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
router.put("/:groupId", requireAuth, async (req, res, next) => {
	const { name, about, type, private, city, state } = req.body;
	const specificGroup = await Group.findByPk(Number(req.params.groupId));
	if (!specificGroup) {
		// const err = new Error("");
		// err.status = 404;
		// err.message = "Group could not be found";
		// return next(err);
		res.status(404);
		return res.json({
			message: "Group couldn't be found",
			statusCode: 404,
		});
	}

	// Only the organizer of the group is authorized edit group
	if (req.user.id !== specificGroup.organizerId) {
		res.status(403);
		return res.json({ message: "Forbidden", statusCode: 403 });
	} else {
		const typeSelection = ["Online", "In person"];
		const errors = {};
		if (name && name.length > 60) {
			errors.name = "Name must be 60 characters or less";
		}
		if (about && about.length < 50) {
			errors.about = "About must be 50 characters or more";
		}
		if (type && !typeSelection.includes(type)) {
			errors.type = "Type must be 'Online' or 'In person'";
		}
		if (private && typeof private !== "boolean") {
			errors.private = "Private must be a boolean";
		}
		if (!city) {
			errors.city = "City is required";
		}
		if (!state) {
			errors.state = "State is required";
		}
		if (Object.keys(errors).length) {
			res.status(400);
			return res.json({
				message: "Validation Error",
				statusCode: 400,
				errors: errors,
			});
		}
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
});
//Delete a Group
router.delete("/:groupId", requireAuth, async (req, res, next) => {
	const specificGroup = await Group.findByPk(Number(req.params.groupId));
	if (!specificGroup) {
		res.status(404);
		return res.json({
			message: "Group couldn't be found",
			statusCode: 404,
		});
	}

	// Only the organizer of the group is authorized to delete group
	if (req.user.id !== specificGroup.organizerId) {
		res.status(403);
		return res.json({ message: "Forbidden", statusCode: 403 });
	} else {
		await specificGroup.destroy();
		return res.json({
			message: "Successfully deleted",
			statusCode: 200,
		});
	}
});

//Get All Venues for a Group specified by its id
router.get("/:groupId/venues", requireAuth, async (req, res, next) => {
	const currUser = req.user.id;
	const groupId = Number(req.params.groupId);
	const specificGroup = await Group.findByPk(groupId);

	//Error response: Couldn't find a Group with the specified id
	if (!specificGroup) {
		res.status(404);
		return res.json({
			message: "Group couldn't be found",
			statusCode: 404,
		});
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
		currUser === specificGroup.organizerId ||
		authorizedMemberIds.includes(currUser)
	) {
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
	} else {
		res.status(403);
		return res.json({ message: "Forbidden", statusCode: 403 });
	}
});
//break
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
		const groupId = Number(req.params.groupId);
		const currUserId = req.user.id;
		const specificGroup = await Group.findByPk(groupId);
		const { address, city, state, lat, lng } = req.body;
		//Error response: Couldn't find a Group with the specified id
		if (!specificGroup) {
			res.status(404);
			return res.json({
				message: "Group couldn't be found",
				statusCode: 404,
			});
		}
		//Current User must be the organizer of the group or a member
		//of the group with a status of "co-host"
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
		// console.log("currUSerID", currUserId);
		// console.log("organizer", specificGroup.organizerId);
		if (
			currUserId === specificGroup.organizerId ||
			authorizedMemberIds.includes(currUserId)
		) {
			const resultPayload = {};
			let newVenue = await Venue.create({
				address,
				city,
				state,
				lat,
				lng,
				groupId: groupId,
			});
			newVenue = newVenue.toJSON();
			// console.log(newVenue);
			for (let key in newVenue) {
				if (key !== "createdAt" && key !== "updatedAt") {
					resultPayload[key] = newVenue[key];
				}
			}
			return res.json(resultPayload);
		} else {
			res.status(403);
			return res.json({ message: "Forbidden", statusCode: 403 });
		}
	}
);

//Get all Events of a Group specified by its id
router.get("/:groupId/events", async (req, res, next) => {
	const groupId = Number(req.params.groupId);
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

	const associatedGroup = await Group.findOne({
		where: {
			id: groupId,
		},
	});
	if (!associatedGroup) {
		res.status(404);
		return res.json({ message: "Group couldn't be found", statusCode: 404 });
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

//Create an Event for a Group specified by its id
router.post("/:groupId/events", requireAuth, async (req, res, next) => {
	const groupId = Number(req.params.groupId);
	//curr user must be organizer of the Group OR member of the group with status 'co-host'
	const currUserId = req.user.id;
	const specificGroup = await Group.findByPk(groupId);
	if (!specificGroup) {
		res.status(404);
		return res.json({
			message: "Group couldn't be found",
			statusCode: 404,
		});
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
	console.log(price, "PRICE");
	if (
		currUserId === specificGroup.organizerId ||
		authorizedMemberIds.includes(currUserId)
	) {
		const newEvent = await Event.create({
			venueId,
			groupId: groupId,
			name,
			capacity,
			type,
			price: price,
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
	} else {
		res.status(403);
		return res.json({ message: "Forbidden", statusCode: 403 });
	}
});
//Get all Members of a Group specified by its id
router.get("/:groupId/members", async (req, res, next) => {
	const groupId = Number(req.params.groupId);
	const currUserId = req.user !== null ? req.user.id : null;
	const specificGroup = await Group.findByPk(groupId);

	//Error response: Couldn't find a Group with the specified id
	if (!specificGroup) {
		res.status(404);
		return res.json({
			message: "Group couldn't be found",
			statusCode: 404,
		});
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
	const resultPayload = {};
	let allMembers = await Membership.findAll({
		where: {
			groupId: specificGroup.id,
		},
	});
	const allMembersInfo = [];
	for (let member of allMembers) {
		member = member.toJSON();
		let userInfo = await User.findOne({
			where: {
				id: member.userId,
			},
			attributes: ["id", "firstName", "lastName"],
		});
		userInfo = userInfo.toJSON();

		if (
			currUserId === specificGroup.organizerId ||
			authorizedMemberIds.includes(currUserId)
		) {
			//Successful Response: If you ARE the organizer or a co-host of the group.
			//Shows all members and their statuses.
			userInfo.Membership = { status: member.status };

			console.log("AUTHORIZED: organizer or co-host", "--> show all statuses");
		} else {
			//Successful Response: If you ARE NOT the organizer of the group.
			//Shows only members that don't have a status of "pending"
			if (member.status !== "pending")
				userInfo.Membership = { status: member.status };
		}
		allMembersInfo.push(userInfo);
	}
	return res.json({
		Members: allMembersInfo,
	});
});

//Request a Membership for a Group based on the Group's id
router.post("/:groupId/membership", requireAuth, async (req, res, next) => {
	const groupId = Number(req.params.groupId);
	const specificGroup = await Group.findByPk(groupId);
	const currUserID = req.user.id;
	//Error response: Couldn't find a Group with the specified id
	if (!specificGroup) {
		res.status(404);
		return res.json({
			message: "Group couldn't be found",
			statusCode: 404,
		});
	}
	if (currUserID === specificGroup.organizerId) {
		res.status(400);
		return res.json({
			message: "User is already a member of the group",
			statusCode: 400,
		});
	}
	//can only have one membership.......
	let currUserMembership = await Membership.findOne({
		where: {
			userId: currUserID,
			groupId: specificGroup.id,
		},
	});
	if (!currUserMembership) {
		const resultPayload = {};
		const newMemberToGroup = await Membership.create({
			userId: currUserID,
			groupId: groupId,
			status: "pending",
		});
		resultPayload.groupId = newMemberToGroup.groupId;
		resultPayload.memberId = newMemberToGroup.userId;
		resultPayload.status = newMemberToGroup.status;
		return res.json(resultPayload);
	}

	//Error response: Current User is already an accepted member of the group
	if (
		currUserMembership.status === "member" ||
		currUserMembership.status === "co-host" ||
		currUserID === specificGroup.organizerId
	) {
		console.log("pring");
		res.status(400);
		return res.json({
			message: "User is already a member of the group",
			statusCode: 400,
		});
	}
	//Error response: Current User already has a pending membership for the group
	if (currUserMembership.status === "pending") {
		console.log("PENDING");
		res.status(400);
		return res.json({
			message: "Membership has already been requested",
			statusCode: 400,
		});
	}
});

//Change the status of a membership for a group specified by id
router.put("/:groupId/membership", requireAuth, async (req, res, next) => {
	const groupId = Number(req.params.groupId);
	const currUserId = req.user.id;
	const specificGroup = await Group.findByPk(groupId);
	const { memberId, status } = req.body;
	const givenUser = await User.findByPk(memberId);
	//Error response: Couldn't find a User with the specified memberId
	if (!givenUser) {
		res.status(400);
		return res.json({
			message: "Validation Error",
			statusCode: 400,
			errors: {
				memberId: "User couldn't be found",
			},
		});
	}
	//Error response: Couldn't find a Group with the specified id
	if (!specificGroup) {
		res.status(404);
		return res.json({
			message: "Group couldn't be found",
			statusCode: 404,
		});
	}
	// finding co-hosts
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
	console.log(authorizedMemberIds);

	//Error response with status 404 is given when a membership between the user
	//and group does not exist
	let givenMemberId = await Membership.findOne({
		where: {
			userId: memberId,
			groupId: specificGroup.id,
		},
		attributes: { exclude: ["createdAt", "updatedAt"] },
	});
	if (!givenMemberId) {
		res.status(404);
		return res.json({
			message: "Membership between the user and the group does not exits",
			statusCode: 404,
		});
	}
	console.log("USER IS FOUND", givenMemberId.toJSON());
	//validation Error response: If changing the membership status to "pending".
	if (status === "pending") {
		res.status(400);
		return res.json({
			message: "Validations Error",
			statusCode: 400,
			errors: {
				status: "Cannot change a membership status to pending",
			},
		});
	}

	//AUTHORIZATION:
	//-----"member"  ---> "co-host": currUser must be the SOLE ORGANIZER
	console.log(currUserId, "currUserId");
	console.log(specificGroup.organizerId, "organizerId");
	if (
		currUserId === specificGroup.organizerId &&
		!authorizedMemberIds.includes(currUserId)
	) {
		const resultPayload = {};
		let changeMembership = await givenMemberId.update({
			status,
		});
		changeMembership = changeMembership.toJSON();
		resultPayload.id = changeMembership.id;
		resultPayload.groupId = changeMembership.groupId;
		resultPayload.memberId = changeMembership.userId;
		resultPayload.status = changeMembership.status;
		return res.json(resultPayload);
	} else if (authorizedMemberIds.includes(currUserId)) {
		//-----"pending" ---> "member":  currUser must be ORGANIZER or COHOST
		console.log("I am NOT organizer of this group BUT co-host");
		const resultPayload = {};
		if (status === "member") {
			let changeMembership = await givenMemberId.update({
				status,
			});
			changeMembership = changeMembership.toJSON();
			resultPayload.id = changeMembership.id;
			resultPayload.groupId = changeMembership.groupId;
			resultPayload.memberId = changeMembership.userId;
			resultPayload.status = changeMembership.status;
			return res.json(resultPayload);
		} else if (status === "co-host") {
			const err = new Error("");
			err.status = 403;
			err.message = "Not Authorized";
			return next(err);
		}
	} else {
		const err = new Error("");
		err.status = 403;
		err.message = "Not Authorized";
		return next(err);
	}
});

//Delete membership to a group specified by id
router.delete("/:groupId/membership", requireAuth, async (req, res, next) => {
	const groupId = Number(req.params.groupId);
	const currUserId = req.user.id;
	const specificGroup = await Group.findByPk(groupId);
	const { memberId } = req.body;
	const givenUser = await User.findByPk(memberId);
	//Error response: Couldn't find a User with the specified memberId
	if (!givenUser) {
		res.status(400);
		return res.json({
			message: "Validation Error",
			statusCode: 400,
			errors: {
				memberId: "User couldn't be found",
			},
		});
	}
	// Error response: Couldn't find a Group with the specified id
	if (!specificGroup) {
		res.status(404);
		return res.json({
			message: "Group couldn't be found",
			statusCode: 404,
		});
	}
	//Error response: Membership does not exist for this User
	//Error response with status 404 is given when a membership between the user
	//and group does not exist
	let givenMemberId = await Membership.findOne({
		where: {
			userId: memberId,
			groupId: specificGroup.id,
		},
		attributes: { exclude: ["createdAt", "updatedAt"] },
	});
	if (!givenMemberId) {
		res.status(404);
		return res.json({
			message: "Membership between the user and the group does not exits",
			statusCode: 404,
		});
	}
	console.log("USER IS FOUND", givenMemberId.toJSON());

	//AUTHORIZATION
	//currUserId === organizerId or currUserId === memberId
	console.log("memberId:          ", memberId);
	console.log("currUserId         ", currUserId);
	if (currUserId === specificGroup.organizerId || currUserId === memberId) {
		console.log("AUTHORIZED: Let's delete this Membership");
		await givenMemberId.destroy();
		return res.json({
			message: "Successfully deleted membership from group",
		});
	} else {
		const err = new Error("");
		err.status = 403;
		err.message = "Not Authorized";
		return next(err);
	}
});

module.exports = router;
