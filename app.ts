import express, { type Request, type Response } from "express";
import { SokaBuilding } from "./buildings.js";
import { SokaBusData } from "./module.js";

const app = express();

app.use(express.static("public"))

interface query {
    building?:string
    period?:string
}
app.get("/api/routs", (req:Request<any,any,any,query>, res:Response) => {
    if (req.query.building === undefined) {
        res.status(400).send("Need a param;building")
        return;
    }
    const building = SokaBuilding.getBuildingTime(req.query.building)
    let time = Temporal.Now.zonedDateTimeISO()
    switch (req.query.period) {
        case "u":
            time = time.with({})
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