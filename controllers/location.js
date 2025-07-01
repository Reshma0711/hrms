const Location = require("../models/location");

// Create a new location
exports.createLocation = async (req, res, next) => {
  try {
    const { name, address = {}, geo = {}, distance = null } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({
        success: false,
        message: "Location name is required and must be a string.",
      });
    }

    const locationData = {
      name: name.trim(),
      address: {
        line1: address.line1 || "",
        line2: address.line2 || "",
        city: address.city || "",
        state: address.state || "",
        country: address.country || "",
        pincode: address.pincode || "",
      },
      geo: {
        lat: typeof geo.lat === "number" ? geo.lat : null,
        lng: typeof geo.lng === "number" ? geo.lng : null,
      },
      distance: typeof distance === "number" ? distance : null,
    };

    const location = await Location.create(locationData);
    res.status(201).json({ success: true, data: location });
  } catch (err) {
    next(err);
  }
};

// Get all locations
exports.getAllLocations = async (req, res, next) => {
  try {
    const locations = await Location.find();
    res.status(200).json({ success: true, data: locations });
  } catch (error) {
    next(error);
  }
};
        
// Get location by ID
exports.getLocationById = async (req, res, next) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res
        .status(404)
        .json({ success: false, message: "Location not found" });
    }
    res.status(200).json({ success: true, data: location });
  } catch (error) {
    next(error);
  }
};

// Update location
exports.updateLocation = async (req, res, next) => {
  try {
    const { address = {}, geo = {}, distance } = req.body;

    const updateData = { ...req.body };

    if (address) {
      updateData.address = {
        ...(address.line1 && { line1: address.line1 }),
        ...(address.line2 && { line2: address.line2 }),
        ...(address.city && { city: address.city }),
        ...(address.state && { state: address.state }),
        ...(address.country && { country: address.country }),
        ...(address.pincode && { pincode: address.pincode }),
      };
    }

    if (geo) {
      updateData.geo = {
        ...(typeof geo.lat === "number" && { lat: geo.lat }),
        ...(typeof geo.lng === "number" && { lng: geo.lng }),
      };
    }
     if(typeof distance==="number"){
      updateData.distance=distance
     }

    if (typeof distance === "number") {
      updateData.distance = distance;
    }

    const updatedLocation = await Location.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedLocation) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }
    res.status(200).json({ success: true, data: updatedLocation });
  } catch (error) {
    next(error);  
  }
};

// Delete location (hard delete)
exports.deleteLocation = async (req, res, next) => {
  try {
    const deletedLocation = await Location.findByIdAndDelete(req.params.id);

    if (!deletedLocation) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Location deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
