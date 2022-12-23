"use strict";
// /** @type {import('sequelize-cli').Migration} */
let options = {};
if (process.env.NODE_ENV === "production") {
	options.schema = process.env.SCHEMA; // define your schema in options object
}
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable(
			"Events",
			{
				id: {
					allowNull: false,
					autoIncrement: true,
					primaryKey: true,
					type: Sequelize.INTEGER,
				},
				venueId: {
					type: Sequelize.INTEGER,
					references: {
						model: "Venues",
					},
					onDelete: "cascade",
				},
				groupId: {
					type: Sequelize.INTEGER,
					allowNull: false,
					references: {
						model: "Groups",
					},
					onDelete: "cascade",
				},
				name: {
					type: Sequelize.STRING,
					allowNull: false,
				},
				description: {
					type: Sequelize.TEXT,
					allowNull: false,
				},
				type: {
					type: Sequelize.ENUM("In person", "Online"),
					allowNull: false,
				},
				capacity: {
					type: Sequelize.INTEGER,
					allowNull: false,
				},
				price: {
					type: Sequelize.INTEGER,
					allowNull: false,
				},
				startDate: {
					type: Sequelize.DATE,
					allowNull: false,
				},
				endDate: {
					type: Sequelize.DATE,
					allowNull: false,
				},
				createdAt: {
					allowNull: false,
					type: Sequelize.DATE,
					defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
				},
				updatedAt: {
					allowNull: false,
					type: Sequelize.DATE,
					defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
				},
			},
			options
		);
	},
	async down(queryInterface, Sequelize) {
		options.tableName = "Events";
		await queryInterface.dropTable(options);
	},
};
