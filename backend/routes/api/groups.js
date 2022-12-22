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
		let url = await GroupImage.findOne({
			where: {
				groupId: group.id,
			},
			attributes: ["url"],
		});
		if (url) {
			group.previewImage = url.url;
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
		const url = await GroupImage.findOne({
			where: {
				groupId: group.id,
			},
			attributes: ["url"],
		});
		if (url) {
			group.previewImage = url.url;
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
		next(err);
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
		.exists({ checkFalsy: true })
		.isLength({ max: 60 })
		.withMessage("Name must be 60 characters or less"),
	check("about")
		.exists({ checkFalsy: true })
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
			organizerId: req.user.id,
		});
		res.statusCode = 201;
		return res.json(newGroup);
	}
);

module.exports = router;
