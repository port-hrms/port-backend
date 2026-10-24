// Prepares attendance records for soft delete (safe to run on every start).
//  1. Older records get isDeleted:false (needed by the "one live record per day" index)
//  2. The old unique index (which also counted deleted records) is replaced
const Attendance = require("../models/Attendance");

const migrateAttendance = async () => {
  try {
    const res = await Attendance.updateMany(
      { isDeleted: { $exists: false } },
      { $set: { isDeleted: false } }
    ).setOptions({ withDeleted: true });
    if (res.modifiedCount) console.log(`Attendance: prepared ${res.modifiedCount} record(s) for soft delete`);

    const indexes = await Attendance.collection.indexes();
    const old = indexes.find((i) => i.name === "employee_1_date_1");
    if (old) {
      await Attendance.collection.dropIndex("employee_1_date_1");
      console.log("Attendance: replaced old unique index");
    }
    await Attendance.createIndexes();
  } catch (error) {
    console.error("Attendance migration failed:", error.message);
  }
};

module.exports = { migrateAttendance };
