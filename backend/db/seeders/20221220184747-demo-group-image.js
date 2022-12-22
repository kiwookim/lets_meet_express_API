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
		options.tableName = "GroupImages";
		await queryInterface.bulkInsert(
			options,
			[
				{
					groupId: 1,
					url: "group1 url",
					preview: true,
				},
				{
					groupId: 2,
					url: "group2 url",
					preview: true,
				},
				{
					groupId: 3,
					url: "group3 url",
					preview: true,
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
		options.tableName = "GroupImages";
		const Op = Sequelize.Op;
		await queryInterface.bulkDelete(
			options,
			{
				groupId: { [Op.in]: [1, 2, 3] },
			},
			{}
		);
	},
};
