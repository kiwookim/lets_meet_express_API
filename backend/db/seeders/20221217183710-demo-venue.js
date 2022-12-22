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
		options.tableName = "Venues";
		await queryInterface.bulkInsert(
			options,
			[
				{
					groupId: 1,
					address: "123 Disney Lane",
					city: "New York",
					state: "NY",
					lat: 37.764,
					lng: -122.473,
				},
				{
					groupId: 2,
					address: "456 Universal Lane",
					city: "Los Angeles",
					state: "CA",
					lat: 90.764,
					lng: -722.473,
				},
				{
					groupId: 3,
					address: "789 Knotts Lane",
					city: "Norristown",
					state: "PA",
					lat: 17.764,
					lng: -22.473,
				},
				{
					groupId: 1,
					address: "my house",
					city: "Los Angeles",
					state: "CA",
					lat: 37.764,
					lng: -122.473,
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
		options.tableName = "Venues";
		const Op = Sequelize.Op;
		await queryInterface.bulkDelete(
			options,
			{
				address: {
					[Op.in]: ["123 Disney Lane", "456 Universal Lane", "789 Knotts Lane"],
				},
			},
			{}
		);
	},
};
