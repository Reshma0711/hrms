const mongoose = require("mongoose");

const customFieldsSchema = new mongoose.Schema(
  {
    name: String,
    section:String,
    type: {type:String,enum:["text", "file", "number", "dropdown",""]},
    values: {type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);


                                                                        
module.exports = mongoose.model("customField", customFieldsSchema);

