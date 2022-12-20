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
		options.tableName = "Groups";
		await queryInterface.bulkInsert(
			options,
			[
				{
					organizerId: 1,
					name: "Evening Tennis on the Water",
					about:
						"Enjoy rounds of tennis with a tight-nit group of people on the water facing the Brooklyn Bridge. Singles or doubles.",
					type: "In person",
					private: true,
					city: "New York",
					state: "NY",
				},
				{
					organizerId: 2,
					name: "New Year Jam Session",
					about:
						"Let's jam on New Years day with fellow jazz musicians, all instruments are welcome",
					type: "In person",
					private: true,
					city: "New York",
					state: "NY",
				},
				{
					organizerId: 3,
					name: "bike ride along Hudson River",
					about: "Enjoy morning bike ride along Hudson River",
					type: "In person",
					private: false,
					city: "New York",
					state: "NY",
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
		options.tableName = "Groups";
		const Op = Sequelize.Op;
		await queryInterface.bulkDelete(
			options,
			{
				name: {
					[Op.in]: [
						"Evening Tennis on the Water",
						"New Year Jam Session",
						"bike ride along Hudson River",
					],
				},
			},
			{}
		);
	},
};
