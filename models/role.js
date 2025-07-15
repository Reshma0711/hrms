const mongoose = require("mongoose");

const RoleSchema = new mongoose.Schema({
  roleName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
  },
  permissions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Permission",
      required: true,
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  roleId: {
    type: String,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// RoleSchema.index({
//   roleName:1
// })

RoleSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});
RoleSchema.pre("save", async function (next) {
  if (this.roleId) return next();

  const lastRole = await this.constructor.findOne().sort({ roleId: -1 });
  let newId = 100;

  if (lastRole && lastRole.roleId) { 
    const lastNumber = parseInt(lastRole.roleId.substring(1), 10); 
    newId = lastNumber + 1;
  }

  this.roleId = `R${newId}`;
  next();
});

module.exports = mongoose.model("Role", RoleSchema);
