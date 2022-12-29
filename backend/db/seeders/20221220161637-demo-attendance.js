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
		options.tableName = "Attendances";
		return queryInterface.bulkInsert(
			options,
			[
				{
					eventId: 1,
					userId: 1,
					status: "attending",
				},
				{
					eventId: 2,
					userId: 2,
					status: "attending",
				},
				{
					eventId: 3,
					userId: 3,
					status: "attending",
				},
				{
					eventId: 1,
					userId: 4,
					status: "pending",
				},
				{
					eventId: 2,
					userId: 5,
					status: "pending",
				},
				{
					eventId: 3,
					userId: 6,
					status: "pending",
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
		options.tableName = "Attendances";
		const Op = Sequelize.Op;
		return queryInterface.bulkDelete(
			options,
			{
				userId: {
					[Op.in]: [1, 2, 3],
				},
			},
			{}
		);
	},
};
