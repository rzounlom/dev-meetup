const express = require("express");
const router = express.Router();
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
//express validator setup
const { check, validationResult } = require("express-validator");

const User = require("../../models/User");

//@route GET api/users
//desc   Register user
//@access Public

router.post(
  "/",
  [
    check("name", "Name is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    //get body params
    const { name, email, password } = req.body;

    try {
      //See if user exists
      let user = await User.findOne({ email: email });
      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "User already exists" }] });
      }

      //Get Users Gravatar
      const avatar = gravatar.url(email, {
        //size
        s: "200",
        //rating
        r: "pg",
        //default icon
        d: "mm",
      });

      //update user variable to new user object
      user = new User({
        name,
        email,
        avatar,
        password,
      });

      //Encrypt password
      //salt the password
      const salt = await bcrypt.genSalt(10);

      //hash the password
      user.password = await bcrypt.hash(password, salt);

      //save user in DB
      await user.save();
      //Return jsonwebtoken
      const payload = {
        user: {
          id: user.id,
        },
      };

      //create auth token with jwt
      jwt.sign(
        payload,
        config.get("jwtSecret"),
        { expiresIn: 360000 },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

module.exports = router;
