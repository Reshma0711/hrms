const mongoose = require('mongoose');
const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true, // e.g., "Bangalore", "Delhi HQ", "Hyderabad Branch"
  },
  locationId:{
    type:String,
    unique: true
  },
  address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    country: String,
    pincode: String,
  },
  geo: {
    lat: {
      type: Number,
      default: null,
    }, 
    lng: {
      type: Number,
      default: null,
    },
  },
  distance:{
    type:Number,
    default:null
  }
}, { timestamps: true });
locationSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});
locationSchema.pre("save", async function (next) {
  if (this.locationId) return next();
  const lastLocation = await this.constructor.findOne().sort({ locationId: -1 });
  let newId = 100;
  if (lastLocation && lastLocation.locationId) {
    const lastNumber = parseInt(lastLocation.locationId.substring(1), 10);
    newId = lastNumber + 1;
  }
  this.locationId = `L${newId}`;
  next();
});





locationSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});
locationSchema.pre("save", async function (next) {
  if (this.locationId) return next();

  const lastLocation = await this.constructor.findOne().sort({ locationId: -1 });
  let newId = 100;

  if (lastLocation && lastLocation.locationId) { 
    const lastNumber = parseInt(lastLocation.locationId.substring(1), 10); 
    newId = lastNumber + 1;
  }

  this.locationId = `L${newId}`;
  next();
});









module.exports = mongoose.model('Location', locationSchema);
