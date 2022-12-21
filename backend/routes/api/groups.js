const express = require("express");
const router = express.Router();
const { Group, GroupImage, Membership } = require("../../db/models");
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

//expected format

// {
//   "id": 1,
//   "organizerId": 1,
//   "name": "Evening Tennis on the Water",
//   "about": "Enjoy rounds of tennis with a tight-nit group of people on the water facing the Brooklyn Bridge. Singles or doubles.",
//   "type": "In person",
//   "private": true,
//   "city": "New York",
//   "state": "NY",
//   "createdAt": "2021-11-19 20:39:36",
//   "updatedAt": "2021-11-19 20:39:36",
//   "numMembers": 10,
//   "GroupImages": [
//     {
//       "id": 1,
//       "url": "image url",
//       "preview": true
//     },
//     {
//       "id": 2,
//       "url": "image url",
//       "preview": false
//     }
//   ],
//   "Organizer": {
//     "id": 1,
//     "firstName": "John",
//     "lastName": "Smith"
//   },
//   "Venues": [
//     {
//       "id": 1,
//       "groupId": 1,
//       "address": "123 Disney Lane",
//       "city": "New York",
//       "state": "NY",
//       "lat": 37.7645358,
//       "lng": -122.4730327
//     }
//   ]
// }
