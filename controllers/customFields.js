const CustomField = require("../models/customFields");
const mongoose = require("mongoose");

const createCustomField = async (req, res, next) => {
  try {
    const name = req.body.name;
    // console.log("nameeeeeeeeeeeeeeeeee",name);
    const existingField = await CustomField.findOne({ name });
    if (existingField) {
      return res
        .status(401)
        .json({ message: `field already exists with name ${name}` });
    }
    const newField = await CustomField.create(req.body);
    res.status(201).json({ success: true, result: newField });
  } catch (error) {
    next(error);
  }
};

const getAllCustomFields = async (req, res, next) => {
  try {
    const allCustomFields = await CustomField.find();
    res.status(200).json({ success: true, result: allCustomFields });
  } catch (error) {
    next(error);
  }
};

const deleteCustomField = async (req, res, next) => {
  try {
    const deleted_CustomField = await CustomField.findOneAndDelete(
      { name: req.body.name },
      { new: true }
    );

    if (!deleted_CustomField) {
      return res
        .status(404)
        .json({ message: `field not found with the name ${req.body.name}`});
    }
    res.status(200).json({ success: true, result: deleted_CustomField });
  } catch (error) {
    next(error);
  }
};
module.exports = { createCustomField, getAllCustomFields, deleteCustomField };
