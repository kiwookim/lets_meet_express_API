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
	const venueId = req.params.venueId;
	const currUserId = req.user.id;
	const specificVenue = await Venue.findOne({
		where: {
			id: venueId,
		},
		attributes: { exclude: ["createdAt", "updatedAt"] },
	});

	if (!specificVenue) {
		const err = new Error("");
		err.status = 404;
		err.message = "Venue could not be found";
		return next(err);
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

	//currUser must be Organizer and Co-Host status
	if (
		currUserId !== associatedGroup.organizerId &&
		!cohostIDs.includes(currUserId)
	) {
		const err = new Error("");
		err.status = 403;
		err.message = "Not authorized";
		return next(err);
	}

	//if passes through error handler --> AUTHORIZED
	const { address, city, state, lat, lng } = req.body;
	const updatedVenue = await specificVenue.update({
		address,
		city,
		state,
		lat,
		lng,
	});
	return res.json(updatedVenue);
});

module.exports = router;
