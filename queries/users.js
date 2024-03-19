import { db } from "../db/dbConfig.js";

const createUser = async ({ firstName, lastName, email, photo_url, firebase_uid }) => {
  try {
    return await db.one(
      `INSERT INTO users ("firstName", "lastName", "email", photo_url, "firebase_uid") VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [firstName, lastName, email, photo_url, firebase_uid]);
  } catch (error) {
    throw new Error(`Error creating user: ${error}`);
  }
};

const getUserByEmail = async (email) => {
  try {
    const userByEmail = await db.oneOrNone(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    console.log(userByEmail);
    return userByEmail;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    throw error;
  }
};

const getAllUsers = async () => {
  try {
    const allUsers = await db.any("SELECT * FROM users");
    console.log(allUsers)
    return allUsers;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

// users.js(query):
// const db = require("../db/dbConfig.js");

// const createUser = async (user) => {
//     const { email, password, serviceBranch, yearsOfService } = user;
//     try {
//         const newUser = await db.one("INSERT INTO users (email, password, service_branch, years_of_service) VALUES ($1, $2, $3, $4) RETURNING *", [email, password, serviceBranch, yearsOfService]);
//         return newUser;
//     } catch (error) {
//         return error
//     }
// };

export { createUser, getUserByEmail, getAllUsers };
