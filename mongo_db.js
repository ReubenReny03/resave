import mongoose from "mongoose";
import dotenv from "dotenv";
import { User, Dbconfig } from "./custom_variables.js";

dotenv.config({ path: ".env" });

mongoose.connect(process.env.MONGO_URI, {}).then((result)=>{
    console.log("Mongo Connected Success")
});


export async function get_customer_info(customerNumber){
    let query = { phone_number: customerNumber };
    const users = await User.find(query)
    if(users.length == 0){
        console.log("User not found")
        const dbconfig = await Dbconfig.find()
        const zeroPad = (num, places) => String(num).padStart(places, '0')
        const new_num = dbconfig[0].user_count+1
        const new_id = zeroPad(new_num,8)

        let myquery = { main: "root" };
        const updateDocument = {
   $set: {
      user_count: new_num,
   },
};
        const val = await Dbconfig.updateOne(myquery,updateDocument)
        console.log(val)
        console.log("------------------")
        const new_user = new User({user_id:new_id,phone_number:customerNumber,count:0,last_user:0,state:1})
        new_user.save()
        return {user_id:new_id, status:"NEW_ID",count:0,last_used:0}
    }
    else{
        return {user_id: users[0].user_id, status:"OLD_ID",count:users[0].count,last_used:users[0].last_used}
    }
}
