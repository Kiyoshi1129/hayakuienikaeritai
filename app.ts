import express, { type Request, type Response } from "express";
import { SokaBuilding } from "./buildings.js";
import { SokaBusData } from "./module.js";

const app = express();

app.use(express.static("public"))

interface query {
    building?:string
    period?:string
}
app.get("/api/routes", (req:Request<any,any,any,query>, res:Response) => {
    console.log(req.query.building);
    console.log(req.query.period);
    res.send("a")
    return
});
app.get("/api/route", (req:Request<any,any,any,query>, res:Response) => {
    if (req.query.building === undefined) {
        res.status(400).send("Need a param;building")
        return;
    }
    const building = SokaBuilding.getBuildingTime(req.query.building)
    let time = Temporal.Now.zonedDateTimeISO()
    switch (req.query.period) {
        case "1限終わり":
            time = time.with({hour:10,minute:45})
            break;
        case "2限終わり":
            time = time.with({hour:12,minute:15})
            break;
        case "3限終わり":
            time = time.with({hour:14,minute:35})
            break;
        case "4限終わり":
            time = time.with({hour:16,minute:20})
            break;
        case "5限終わり":
            time = time.with({hour:18,minute:5})
            break;
        default:
            break;
    }
    const buses = SokaBusData.search(time,building,4,0)
    const result = SokaBusData.decorator(buses)
    res.json(result);
    console.log("sent.")
});

app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});