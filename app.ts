import express, { type Request, type Response } from "express";
import { SokaBuilding } from "./buildings.js";
import { SokaBusData } from "./module.js";

const app = express();

app.use(express.static("public"))

interface bus1{
    busStop: string;
    walkTime: number;
    via: string;
    departureTime: string;
    arrivalTime: string;
    duration: number;
    startTime:string
}

interface query {
    building?:string
    period?:string
    limit?:string
}
app.get("/api/routes", (req:Request<any,any,any,query>, res:Response) => {
    if (req.query.building === undefined) {
        res.status(400).send("Need a param;building")
        return;
    }
    if (!/^\d{1,2}/.test(req.query.limit || "4")) {
        res.status(400).send(`${req.query.limit} is not a number`)
        return;
    }
    const building = SokaBuilding.getBuildingTime(req.query.building)
    if (building === undefined) {
        res.status(400).send(`BuildingData[${req.query.building}] is not found`)
        return
    }
    let time = Temporal.Now.zonedDateTimeISO()
    switch (req.query.period) {
        case "1限終わり":time = time.with({hour:10,minute:30});break;
        case "2限終わり":time = time.with({hour:12,minute:15});break;
        case "3限終わり":time = time.with({hour:14,minute:35});break;
        case "4限終わり":time = time.with({hour:16,minute:20});break;
        case "5限終わり":time = time.with({hour:18,minute: 5});break;
        default:
            break;
    }
    const buses = SokaBusData.search(time,building,Number(req.query.limit || 4),0)
    const result:bus1[] = SokaBusData.decorator(buses).map(bus=>{return {
        busStop: bus.stop_name,
        walkTime: bus.walk,
        via: bus.route_name,
        departureTime: bus.dep,
        arrivalTime: bus.dest.slice(0,-3),
        duration: new Temporal.Duration(0,0,0,0,0,0,bus.duration).round({largestUnit:"minutes",smallestUnit:"minutes"}).minutes,
        startTime:bus.b_dep
    }})
    res.json(result);
});

const server = app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});

const stop = ()=>{
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    })
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);