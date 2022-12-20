"use strict";

/** @type {import('sequelize-cli').Migration} */

let options = {};
if (process.env.NODE_ENV === "production") {
	options.schema = process.env.SCHEMA; // define your schema in options object
}
module.exports = {
	async up(queryInterface, Sequelize) {
		/**
		 * Add seed commands here.
		 *
		 * Example:
		 * await queryInterface.bulkInsert('People', [{
		 *   name: 'John Doe',
		 *   isBetaMember: false
		 * }], {});
		 */
		options.tableName = "Events";
		return queryInterface.bulkInsert(
			options,
			[
				{
					id: 1,
					groupId: 1,
					venueId: 1,
					name: "Tennis Group First Meet and Greet",
					description:
						"First meet and greet event for the evening tennis on the water group! Join us online for happy times!",
					type: "Online",
					capacity: 10,
					price: 18.5,
					startDate: "2021-11-19 20:00:00",
					endDate: "2021-11-19 22:00:00",
				},
				{
					id: 2,
					groupId: 2,
					venueId: 2,
					name: "Jazz Trio Jam Session",
					description: "jam with fellow jazz musicians",
					type: "In Person",
					capacity: 9,
					price: 10,
					startDate: "2022-12-21 20:00:00",
					endDate: "2022-12-21 22:00:00",
				},
				{
					id: 3,
					groupId: 3,
					venueId: 3,
					name: "New Year gravel bike ride",
					description: "New Year gravel bike ride in Bronx",
					type: "In Person",
					capacity: 20,
					price: 15,
					startDate: "2023-01-01 06:00:00",
					endDate: "2023-01-01 09:00:00",
				},
			],
			{}
		);
	},

	async down(queryInterface, Sequelize) {
		/**
		 * Add commands to revert seed here.
		 *
		 * Example:
		 * await queryInterface.bulkDelete('People', null, {});
		 */
		options.tableName = "Events";
		const Op = Sequelize.Op;
		return queryInterface.bulkDelete(
			options,
			{
				name: {
					[Op.in]: [
						"Tennis Group First Meet and Greet",
						"Jazz Trio Jam Session",
						"New Year gravel bike ride",
					],
				},
			},
			{}
		);
	},
};
