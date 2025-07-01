const express = require("express");
const app = express();
const { dbConnect } = require("./config/db");
dbConnect();
const { port } = require("./config/dotenvconfig");
const cors = require("cors");
const { errorHandler } = require("./middlewares/errorHandler");
const cookieparser = require("cookie-parser");
const roleRouter = require("./routes/role");
const userRouter = require("./routes/user");
const permissionRouter = require("./routes/permission");
const departmentRouter = require("./routes/department");
const specialPermissionRouter = require("./routes/specialPermission");
const attendanceRouter = require("./routes/attendance");
const customFieldRouter = require("./routes/customFields");
const notificationRouter = require("./routes/notification");
const leaveRouter = require("./routes/leave");
const leaveApplicationRouter = require("./routes/leaveApplication");
const shiftRouter = require("./routes/shift")
const locationRouter = require("./routes/location")
const regularizationRouter = require("./routes/attendanceRegularize")
const { mongodbUri } = require("./config/dotenvconfig");
const Agenda = require("agenda");
const { autoValidateAttendance } = require("./controllers/attendance");
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(cookieparser());

app.use("/user", userRouter);
app.use("/role", roleRouter);
app.use("/permission", permissionRouter);
app.use("/department", departmentRouter);
app.use("/specialPermission", specialPermissionRouter);
app.use("/attendance", attendanceRouter);
app.use("/customField", customFieldRouter);
app.use("/notification", notificationRouter);
app.use("/leaveType", leaveRouter);
app.use("/leaveApplication", leaveApplicationRouter);
app.use("/location",locationRouter)
app.use("/shift",shiftRouter)
app.use("/regularize",regularizationRouter)
app.use(errorHandler);

//---------------------------------------------------------------------------------------------------

//  const agenda = new Agenda({
//             db: { address: mongodbUri, collection: 'agendaJobs', options: { useNewUrlParser: true, useUnifiedTopology: true } }
//         })

// Define your daily task
// agenda.define('validate daily attendance', async (job) => {
//     try {
//       await autoValidateAttendance()
//     console.log("job executed")
//     } catch (error) {
//       console.log(error.message)
//     }
// });

// // Schedule it to run every day at 10 PM
// (async function () {
//   await agenda.start();
//   await agenda.every('30 15 * * *', 'validate daily attendance', null, {
//     timezone: 'Asia/Kolkata',
//   });
//   await agenda.now('validate daily attendance')
// })();

//------------------------------------------------------------------------------------------------------

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
