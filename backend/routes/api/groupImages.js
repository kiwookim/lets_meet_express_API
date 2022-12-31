const express = require("express");
const router = express.Router();
const { GroupImage, Group, Membership } = require("../../db/models");
const { restoreUser, requireAuth } = require("../../utils/auth");

router.delete("/:imageId", requireAuth, async (req, res, next) => {
	const imageId = req.params.imageId;
	const currUserId = req.user.id;
	console.log("Current User Id:     ", currUserId);
	const specificImage = await GroupImage.findByPk(imageId);
	//Error response: Couldn't find an Image with the specified id
	if (!specificImage) {
		res.status(404);
		return res.json({
			message: "Group Image couldn't be found",
			statusCode: 404,
		});
	}
	const specificGroup = await Group.findOne({
		where: {
			id: specificImage.groupId,
		},
	});
	const organizerID = specificGroup.organizerId;
	console.log(specificGroup.toJSON());
	console.log("OrganizerId:       ", organizerID);
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
	console.log("COHOSTS Ids:        ", coHostsIDs);
	// AUTHORIZATION: Current user must be the organizer or "co-host" of the Groups
	if (currUserId === organizerID || coHostsIDs.includes(currUserId)) {
		console.log("AUTHORIZED : DO SOMETHING");
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
