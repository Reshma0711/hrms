const Leave = require("../models/leave");
const User = require("../models/user");

const createLeaveType = async(req,res,next)=>{
    try {
        // const {name,code, totalLeavesPerYear,carryForward, encashable,description} = req.body;
        const newLeaveType = await Leave.create(req.body);
        return res.status(201).json({success:true,result:newLeaveType}); 
    } catch (error) {
        next(error)
    }

}

const UpdateLeaveType = async (req, res, next) => {
  try {
    const {
      leaveType_id,
      name,
      code,
      totalLeavesPerYear,
      assignLeavePer,
      carryForward,
      encashable,
      description,
    } = req.body;

    // 1. Find the leave type
    const existingLeaveType = await Leave.findById(leaveType_id);
    if (!existingLeaveType) {
      return res.status(404).json({
        success: false,
        message: "Leave type not found",
      });
    }

    // 2. Collect only fields that are defined
    const fieldsToUpdate = {
      ...(name !== undefined && { name }),
      ...(code !== undefined && { code }),
      ...(totalLeavesPerYear !== undefined && { totalLeavesPerYear }),
      ...(assignLeavePer !== undefined && { assignLeavePer }),
      ...(carryForward !== undefined && { carryForward }),
      ...(encashable !== undefined && { encashable }),
      ...(description !== undefined && { description }),
    };

    // 3. Apply updates
    Object.assign(existingLeaveType, fieldsToUpdate);
    await existingLeaveType.save();

    // 4. Success response
    res.status(200).json({
      success: true,
      message: "Leave type updated successfully",
      data: existingLeaveType,
    });
  } catch (error) {
    next(error);
  }
};


const deleteLeaveType = async (req,res,next) =>{
 try {
    const {leaveType_id} =req.body ;
    const deletedLeaveType = await Leave.findByIdAndDelete(leaveType_id,{new:true});
   return res.status(200).json({success:true,message:"deleted successfully",result:deletedLeaveType})
 } catch (error) {
   next(error)  
 }
}




module.exports = {createLeaveType,UpdateLeaveType,deleteLeaveType}


// const deductLeaves = async(req,res,next)=>{
//   try {
//       const {user_id,leaveTypeName,leaves} = req.body;
//     const existingUser = await User.findById(user_id);
//     if(!existingUser){
//         return res.status(404).json({success:false,message:"user not found"})
//     }

// await User.updateOne(
//   { _id: user_id, "leaveBalance.name": leaveTypeName },
//   {
//     $inc: {
//       "leaveBalance.$.balance": -leaves,
//       "leaveBalance.$.used": +leaves
//     }
//   }
// );

//    existingUser.save()

//    res.status(200).json({success:true,message:"successfully deducted"})

//   } catch (error) {
//     next(error)
//   }
// }




