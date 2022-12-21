const express = require("express");
const { Event, Group, Venue, User } = require("../../db/models");
const router = express.Router();

router.get("/", async (req, res, next) => {
	const events = await Event.findAll();
	events.forEach(async (event) => {
		const group = await event.getGroup();
	});

	return res.json(events);
});

module.exports = router;

// {
//   "Events": [
//     {
//       "id": 1,
//       "groupId": 1,
//       "venueId": null,
//       "name": "Tennis Group First Meet and Greet",
//       "type": "Online",
//       "startDate": "2021-11-19 20:00:00",
//       "endDate": "2021-11-19 22:00:00",
//       "numAttending": 8,
//       "previewImage": "image url",
//       "Group": {
//         "id": 1,
//         "name": "Evening Tennis on the Water",
//         "city": "New York",
//         "state": "NY"
//       },
//       "Venue": null,
//     },
//     {
//       "id": 1,
//       "groupId": 1,
//       "venueId": 1,
//       "name": "Tennis Singles",
//       "type": "In Person",
//       "startDate": "2021-11-20 20:00:00",
//       "endDate": "2021-11-19 22:00:00",
//       "numAttending": 4,
//       "previewImage": "image url",
//       "Group": {
//         "id": 1,
//         "name": "Evening Tennis on the Water",
//         "city": "New York",
//         "state": "NY"
//       },
//       "Venue": {
//         "id": 1,
//         "city": "New York",
//         "state": "NY",
//       },
//     },
//   ]
// }
