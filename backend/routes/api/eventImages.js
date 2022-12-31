const express = require("express");
const router = express.Router();
const { EventImage, Group, Event, Membership } = require("../../db/models");
const { restoreUser, requireAuth } = require("../../utils/auth");

router.delete("/:imageId", requireAuth, async (req, res, next) => {
	const currUserId = req.user.id;
	const imageId = Number(req.params.imageId);
	const specificImage = await EventImage.findByPk(imageId);
	// Error response: Couldn't find an Image with the specified id
	if (!specificImage) {
		res.status(404);
		return res.json({
			message: "Event Image couldn't be found",
			statusCode: 404,
		});
	}
	const specificEvent = await Event.findOne({
		where: {
			id: specificImage.eventId,
		},
	});
	const specificGroup = await Group.findOne({
		where: {
			id: specificEvent.groupId,
		},
	});
	const organizerId = specificGroup.organizerId;
	const coHosts = await Membership.findAll({
		where: {
			groupId: specificGroup.id,
			status: "co-host",
		},
	});
	const coHostsPOJO = [];
	for (let coHost of coHosts) {
		coHostsPOJO.push(coHost.toJSON());
	}
	const coHostsIDs = coHostsPOJO.map((cohost) => cohost.userId);
	console.log("currUserId:    ", currUserId);
	console.log("organizerId:   ", organizerId);
	console.log("COHOSTS Ids:   ", coHostsIDs);
	//AUTHORIZATION: Current user must be the organizer or "co-host" of the Group that the Event belongs to
	if (currUserId === organizerId || coHostsIDs.includes(currUserId)) {
		console.log("AUTHORIZED DO SOMETHING");
		await specificImage.destroy();
		return res.json({
			message: "Successfully deleted",
			statusCode: 200,
		});
	} else {
		const err = new Error("");
		err.status = 403;
		err.message = "Not Authorized";
		return next(err);
	}
});
module.exports = router;
