const fetch = require("node-fetch");

const { User } = require("./../model/user");
const { Token } = require("./../model/token");
const { InvalidPasswordError } = require("./../errors/validation_errors");

class UserController {
  // create new user, return bearer token
  // validate user doesn't exist already (login)
  // validate params are correct
  static async create(req, res) {
    const { login, password, firstName, lastName, address } = req.body;
    if (!login) {
      res.statusMessage = "Must specify 'login' to create account";
      return res.status(400).end();
    }

    if (!password) {
      res.statusMessage = "Must provide 'password'";
      return res.status(400).end();
    }

    if (!firstName || !lastName) {
      res.statusMessage = "'firstName' and 'lastName' must be specified";
      return res.status(400).end();
    }
    var user;
    try {
      user = await User.create({ login, password, firstName, lastName });
    } catch (e) {
      if (e.message.includes("duplicate")) {
        res.statusMessage = `User already exists with login ${login}`;
        return res.status(403).end();
      }
      return res.status(500).end();
    }
    var response;
    try {
      response = await fetch("http://wallet:8082/account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user: user }),
      });
    } catch (e) {
      console.log(e);
    }

    if (address) {
      try {
        response = await fetch("http://shipping:8084/address", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user: user, body: { address: address } }),
        });
      } catch (e) {
        console.log(e);
      }
    }
    const token = await Token.create(user);
    res.status(201).json(token);
  }

  static async change_password(req, res) {
    const { authorization } = req.headers;
    const token = await Token.find_by_token(authorization);
    if (!token) {
      return res.status(403).end();
    }
    const user = token.user;
    const { old_password, new_password } = req.body;
    if (!new_password) {
      res.statusMessage = "please provide a new password";
      return res.status(400).end();
    }
    try {
      user.change_password(old_password, new_password);
    } catch (e) {
      if (e instanceof InvalidPasswordError) {
        res.statusMessage = e.message;
        return res.status(400).end();
      }
    }

    await Token.delete_all_by_user_id(user.id);
    const newToken = await Token.create(user);
    res.json(newToken);
  }

  static async change_user_info(req, res) {
    const { authorization } = req.headers;
    const token = await Token.find_by_token(authorization);
    if (!token) {
      return res.status(403).end();
    }
    const user = token.user;
    const [firstName, lastName] = [req.body.first_name, req.body.last_name];
    await user.update_name(firstName, lastName);
    res.json(user);
  }

  static async login(req, res) {
    const { login, password } = req.body;
    if (!login) {
      res.statusMessage = "Please provide username";
      return res.status(400).end();
    }
    if (!password) {
      res.statusMessage = "please provide a password";
      return res.status(400).end();
    }
    const user = await User.find_by_login(login);
    const authorized = await user.authenticate(password);
    if (!authorized) {
      res.statusMessage = "invalid password";
      return res.status(403).end();
    }
    const token = await Token.create(user);
    res.json(token);
  }

  static async logout(req, res) {
    const { authorization } = req.headers;
    const token = await Token.find_by_token(authorization);
    if (!token) {
      return res.status(403).end();
    }
    await token.delete();
    res.status(204).end();
  }

  static async logout_all(req, res) {
    const { authorization } = req.headers;
    const token = await Token.find_by_token(authorization);
    if (!token) {
      return res.status(403).end();
    }
    Token.delete_all_by_user_id(token.user.id);
    res.status(204).end();
  }

  static async validate_user(req, res) {
    const { authorization } = req.headers;
    const token = await Token.find_by_token(authorization);
    if (!token) {
      return res.status(403).end();
    }
    res.status(200).end();
  }

  static async delete() {}
}

exports.UserController = UserController;
