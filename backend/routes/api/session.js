// backend/routes/api/session.js
const express = require("express");
const { setTokenCookie, restoreUser } = require("../../utils/auth");
const { User } = require("../../db/models");
const { check } = require("express-validator");
const { handleValidationErrors } = require("../../utils/validation");
const router = express.Router();

//Make a middleware called validateLogin that
//will check these keys and validate them
const validateLogin = [
	check("credential")
		.exists({ checkFalsy: true })
		.notEmpty()
		.withMessage("Please provide a valid email or username."),
	check("password")
		.exists({ checkFalsy: true })
		.withMessage("Please provide a password."),
	handleValidationErrors,
];

router.post("/", validateLogin, async (req, res, next) => {
	const { credential, password } = req.body;

	const user = await User.login({ credential, password });

	//original authenticate me code
	// if (!user) {
	// 	const err = new Error("Login failed");
	// 	err.status = 401;
	// 	err.title = "Login failed";
	// 	err.errors = ["The provided credentials were invalid."];
	// 	return next(err);
	// }

	// ki cocde
	if (!user) {
		// const err = new Error("Invalid credentials");
		// err.status = 401;
		// err.title = "Invalid credentials";
		// err.message = "Invalid credentials";
		// return next(err);
		res.status(401);
		return res.json({
			message: "Invalid credentials",
			statusCode: 401,
		});
	}

	await setTokenCookie(res, user);

	return res.json({
		user: user,
	});
});

// backend/routes/api/session.js
// Log out
router.delete("/", (_req, res) => {
	res.clearCookie("token");
	return res.json({ message: "success" });
});

// backend/routes/api/session.js

// Restore session user
router.get("/", restoreUser, (req, res) => {
	const { user } = req;
	if (user) {
		return res.json({
			user: user.toSafeObject(),
		});
	} else return res.json({ user: null });
});

module.exports = router;
