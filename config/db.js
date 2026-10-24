const mongoose = require("mongoose");
const { seedCompanyDetails } = require("../seed/companySeeder");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Clean and simple auto-initialization seeder
    await seedCompanyDetails();
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error(`   Server is running but database is not connected.`);
  }
};

module.exports = connectDB;