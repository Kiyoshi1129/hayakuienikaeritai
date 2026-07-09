import Database from "better-sqlite3";

const db = new Database("./data/gtfs.db",{readonly:true,fileMustExist:true});
console.log(db.prepare("SELECT * FROM trips ?").bind());
db.close();