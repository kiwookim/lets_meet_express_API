"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class Group extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
			Group.belongsTo(models.User, {
				foreignKey: "organizerId",
				onDelete: "cascade",
			});
			Group.hasMany(models.Venue, {
				foreignKey: "groupId",
				onDelete: "cascade",
			});
			Group.hasMany(models.GroupImage, {
				foreignKey: "groupId",
				onDelete: "cascade",
			});
			Group.belongsToMany(models.User, {
				foreignKey: "groupId",
				through: models.Membership,
			});
			Group.belongsToMany(models.Venue, {
				foreignKey: "groupId",
				through: models.Event,
			});
		}
	}
	Group.init(
		{
			organizerId: {
				type: DataTypes.INTEGER,
			},
			name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			about: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			type: {
				type: DataTypes.ENUM("In Person", "Online"),
				allowNull: false,
			},
			private: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
			},
			city: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			state: {
				type: DataTypes.STRING,
				allowNull: false,
			},
		},
		{
			sequelize,
			modelName: "Group",
		}
	);
	return Group;
};
