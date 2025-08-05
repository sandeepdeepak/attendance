// Script to create an initial admin user
const axios = require("axios");
const readline = require("readline");
const express = require("express");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function createAdminUser() {
  try {
    console.log("=== Create Initial Admin User ===");

    // Get admin details from user input
    const email = await askQuestion("Enter admin email: ");
    const password = await askQuestion("Enter admin password: ");
    const gymName = await askQuestion("Enter gym name: ");

    console.log("\nCreating admin user...");

    const app = express();
    const port = 7777;

    // Make API request to create admin user

    const response = await axios.post(`/api/admin/setup`, {
      email,
      password,
      gymName,
    });

    if (response.data && response.data.success) {
      console.log("\n✅ Admin user created successfully!");
      console.log(`\nEmail: ${email}`);
      console.log(`Gym Name: ${gymName}`);
      console.log("\nYou can now log in with these credentials.");
    } else {
      console.log("\n❌ Failed to create admin user.");
      console.log("Response:", response.data);
    }
  } catch (error) {
    console.error("\n❌ Error creating admin user:");
    if (error.response && error.response.data) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  } finally {
    rl.close();
  }
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Create config.js if it doesn't exist
const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "config.js");
if (!fs.existsSync(configPath)) {
  console.log("Creating config.js file...");
  fs.writeFileSync(
    configPath,
    `module.exports = {
  API_URL: process.env.API_URL || 'http://localhost:7777'
};\n`
  );
  console.log("Config file created.");
}

// Run the script
createAdminUser();
