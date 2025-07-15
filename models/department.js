const mongoose = require("mongoose");
const departmentSchema = new mongoose.Schema({
  departmentName: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  description: {
    type: String,
  },
  designations: [
    {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  ],
  departmentId: {
    type: String,
    unique: true,
  },
},{timestamps:true});

departmentSchema.pre("save", async function (next) {
  if (this.departmentId) return next();

  const lastDepartment = await this.constructor.findOne().sort({ departmentId: -1 });
  let newId = 101;

  if (lastDepartment && lastDepartment.departmentId) {
    const lastNumber = parseInt(lastDepartment.departmentId.substring(1), 10);
    newId = lastNumber + 1;
  }

  this.departmentId = `D${newId}`;
  next();
});
module.exports = mongoose.model("Department", departmentSchema);
