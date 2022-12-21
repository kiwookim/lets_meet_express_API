const express = require("express");
const router = express.Router();
const { Group, GroupImage, Membership } = require("../../db/models");
const { restoreUser, requireAuth } = require("../../utils/auth");

router.get("/", async (req, res) => {
	const payload = [];
	const allGroups = await Group.findAll();
	for (let group of allGroups) {
		// console.log(group.toJSON());
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
		group.previewImage = url.url;
		payload.push(group);
	}
	res.json({ Groups: payload });
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
		group.previewImage = url.url;
		payload.push(group);
	}
	return res.json({ Groups: payload });
});

module.exports = router;
