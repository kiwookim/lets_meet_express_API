"use strict";
/** @type {import('sequelize-cli').Migration} */
let options = {};
if (process.env.NODE_ENV === "production") {
	options.schema = process.env.SCHEMA; // define your schema in options object
}
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable(
			"Attendances",
			{
				id: {
					allowNull: false,
					autoIncrement: true,
					primaryKey: true,
					type: Sequelize.INTEGER,
				},
				eventId: {
					type: Sequelize.INTEGER,
					allowNull: false,
					references: {
						model: "Events",
						// foreignKey: "eventId",
					},
					onDelete: "cascade",
				},
				userId: {
					type: Sequelize.INTEGER,
					allowNull: false,
					references: {
						model: "Users",
						// foreignKey: "userId",
					},
					onDelete: "cascade",
				},
				status: {
					type: Sequelize.ENUM("member", "waitlist", "pending"),
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
		options.tableName = "Attendances";
		await queryInterface.dropTable(options);
	},
};
