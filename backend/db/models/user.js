"use strict";
const { Model, Validator } = require("sequelize");
const bcrypt = require("bcryptjs");

module.exports = (sequelize, DataTypes) => {
	class User extends Model {
		toSafeObject() {
			const { id, firstName, lastName, username, email } = this; // context will be the User instance
			return { id, firstName, lastName, username, email };
		}
		validatePassword(password) {
			return bcrypt.compareSync(password, this.hashedPassword.toString());
		}
		static getCurrentUserById(id) {
			return User.scope("currentUser").findByPk(id);
		}
		static async login({ credential, password }) {
			const { Op } = require("sequelize");
			const user = await User.scope("loginUser").findOne({
				where: {
					[Op.or]: {
						username: credential,
						email: credential,
					},
				},
			});
			if (user && user.validatePassword(password)) {
				return await User.scope(["defaultScope", "loginUser"]).findByPk(
					user.id
				);
			}
		}
		static async signup({ firstName, lastName, username, email, password }) {
			const hashedPassword = bcrypt.hashSync(password);
			const user = await User.create({
				firstName,
				lastName,
				username,
				email,
				hashedPassword,
			});
			// original authenticate me code
			// return await User.scope("currentUser").findByPk(user.id);
			return await User.scope("currentUser").findByPk(user.id);
		}
		static associate(models) {
			// define association here
			// user belongs to many Events through Attendances
			User.belongsToMany(models.Event, {
				// through: models.Attendance,
				through: "Attendances",
				foreignKey: "userId",
				// otherKey: "eventId",
			});
			User.belongsToMany(models.Group, {
				through: models.Membership,
				foreignKey: "userId",
			});
			User.hasMany(models.Group, { foreignKey: "organizerId" });
		}
	}

	User.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
				allowNull: false,
			},
			firstName: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			lastName: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			username: {
				type: DataTypes.STRING,
				allowNull: false,
				validate: {
					len: [4, 30],
					isNotEmail(value) {
						if (Validator.isEmail(value)) {
							throw new Error("Cannot be an email.");
						}
					},
				},
			},
			email: {
				type: DataTypes.STRING,
				allowNull: false,
				validate: {
					len: [3, 256],
					isEmail: true,
				},
			},
			hashedPassword: {
				type: DataTypes.STRING.BINARY,
				allowNull: false,
				validate: {
					len: [60, 60],
				},
			},
		},
		{
			sequelize,
			modelName: "User",
			defaultScope: {
				attributes: {
					exclude: ["hashedPassword", "createdAt", "updatedAt"],
				},
			},
			scopes: {
				currentUser: {
					attributes: {
						exclude: ["hashedPassword", "username", "createdAt", "updatedAt"],
					},
				},
				loginUser: {
					attributes: { exclude: ["createdAt", "updatedAt"] },
				},
			},
		}
	);
	return User;
};
