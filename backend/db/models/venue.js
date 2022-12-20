"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class Venue extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
			Venue.belongsTo(models.Group, { foreignKey: "groupId" });
			Venue.belongsToMany(models.Group, {
				foreignKey: "venueId",
				through: models.Event,
			});
		}
	}
	Venue.init(
		{
			groupId: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			address: {
				type: DataTypes.STRING,
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
			lat: {
				type: DataTypes.DECIMAL,
				allowNull: false,
			},
			lng: { type: DataTypes.DECIMAL, allowNull: false },
		},
		{
			sequelize,
			modelName: "Venue",
		}
	);
	return Venue;
};
