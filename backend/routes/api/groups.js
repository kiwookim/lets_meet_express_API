const express = require("express");
const router = express.Router();
const { Group, GroupImage, Membership } = require("../../db/models");
const { requireAuth } = require("../../utils/auth");

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
	res.json(payload);
});

router.get("/current", requireAuth, async (req, res, next) => {
	//getGroup that matchces with User.id
	//add numMembers
	//add previewImage

	const currUserGroups = await Group.findBy
});

module.exports = router;

// expected format
// URL: /api/groups/current
// Get all Groups joined or organized by the Current User
// {
//   "Groups":[
//     {
//       "id": 1,
//       "organizerId": 1,
//       "name": "Evening Tennis on the Water",
//       "about": "Enjoy rounds of tennis with a tight-nit group of people on the water facing the Brooklyn Bridge. Singles or doubles.",
//       "type": "In person",
//       "private": true,
//       "city": "New York",
//       "state": "NY",
//       "createdAt": "2021-11-19 20:39:36",
//       "updatedAt": "2021-11-19 20:39:36",
//       "numMembers": 10,
//       "previewImage": "image url",
//     }
//   ]
// }
