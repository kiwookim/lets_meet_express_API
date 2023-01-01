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
const validateVenue = [
	check("address").notEmpty().withMessage("Street address is required"),
	check("city").notEmpty().withMessage("City is required"),
	check("state").notEmpty().withMessage("State is required"),
	check("lat").not().isString().withMessage("Latitude is not valid"),
	check("lng").not().isString().withMessage("Longitute is not valid"),
	handleValidationErrors,
];
//Edit a Venue specified by its id
router.put("/:venueId", requireAuth, validateVenue, async (req, res, next) => {
	const venueId = Number(req.params.venueId);
	const currUserId = req.user.id;
	const specificVenue = await Venue.findOne({
		where: {
			id: venueId,
		},
		attributes: { exclude: ["createdAt", "updatedAt"] },
	});

	if (!specificVenue) {
		res.status(404);
		return res.json({
			message: "Venue couldn't be found",
			statusCode: 404,
		});
	}
	const associatedGroup = await Group.findOne({
		where: {
			id: specificVenue.groupId,
		},
	});
	//finding co-host logic
	const cohostList = await Membership.findAll({
		where: {
			groupId: associatedGroup.id,
		},
	});
	const cohostListPOJO = [];
	for (let member of cohostList) {
		cohostListPOJO.push(member.toJSON());
	}
	const cohostIDs = cohostListPOJO.map((member) => member.userId);

	if (
		currUserId === associatedGroup.organizerId ||
		cohostIDs.includes(currUserId)
	) {
		const { address, city, state, lat, lng } = req.body;
		const resultPayload = {};
		let updatedVenue = await specificVenue.update({
			address,
			city,
			state,
			lat,
			lng,
		});
		updatedVenue = updatedVenue.toJSON();
		for (let key in updatedVenue) {
			if (key !== "createdAt" && key !== "updatedAt") {
				resultPayload[key] = updatedVenue[key];
			}
		}
		return res.json(resultPayload);
	} else {
		res.status(403);
		return res.json({ message: "Forbidden", statusCode: 403 });
	}
});

module.exports = router;
