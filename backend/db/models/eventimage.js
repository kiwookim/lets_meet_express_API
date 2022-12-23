"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
	class EventImage extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			// define association here
			// eventImage can belong to one event
			EventImage.belongsTo(models.Event, { foreignKey: "eventId" });
		}
	}
	EventImage.init(
		{
			id: {
				allowNull: false,
				primaryKey: true,
				autoIncrement: true,
			},
			eventId: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			url: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			preview: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
			},
		},
		{
			sequelize,
			modelName: "EventImage",
		}
	);
	return EventImage;
};
