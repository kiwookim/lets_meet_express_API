"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class Membership extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
		}
	}
	Membership.init(
		{
			id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				primaryKey: true,
			},
			userId: {
				allowNull: false,
				type: DataTypes.INTEGER,
			},
			groupId: {
				allowNull: false,
				type: DataTypes.INTEGER,
			},
			status: {
				type: DataTypes.ENUM(["co-host", "member", "pending"]),
				allowNull: false,
			},
		},
		{
			sequelize,
			modelName: "Membership",
		}
	);
	return Membership;
};
