"use strict";
const bcrypt = require("bcryptjs");

let options = {};
if (process.env.NODE_ENV === "production") {
	options.schema = process.env.SCHEMA; // define your schema in options object
}

module.exports = {
	up: async (queryInterface, Sequelize) => {
		options.tableName = "Users";
		return queryInterface.bulkInsert(
			options,
			[
				{
					firstName: "Demo",
					lastName: "Lition",
					email: "demo@user.io",
					username: "Demo-lition",
					hashedPassword: bcrypt.hashSync("password"),
				},
				{
					firstName: "Fake",
					lastName: "User",
					email: "user1@user.io",
					username: "FakeUser1",
					hashedPassword: bcrypt.hashSync("password2"),
				},
				{
					firstName: "NotReal",
					lastName: "Thing",
					email: "user2@user.io",
					username: "FakeUser2",
					hashedPassword: bcrypt.hashSync("password3"),
				},
				{
					firstName: "Who",
					lastName: "Lim",
					email: "whoisthis@gmail.com",
					username: "identity1",
					hashedPassword: bcrypt.hashSync("password4"),
				},
				{
					firstName: "Real",
					lastName: "Kim",
					email: "realkim@gmail.com",
					username: "RealUser",
					hashedPassword: bcrypt.hashSync("password5"),
				},
				{
					firstName: "someone",
					lastName: "Oops",
					email: "oops@hotmail.com",
					username: "Someone2",
					hashedPassword: bcrypt.hashSync("password6"),
				},
			],
			{}
		);
	},

	down: async (queryInterface, Sequelize) => {
		options.tableName = "Users";
		const Op = Sequelize.Op;
		return queryInterface.bulkDelete(
			options,
			{
				username: { [Op.in]: ["Demo-lition", "FakeUser1", "FakeUser2"] },
			},
			{}
		);
	},
};
