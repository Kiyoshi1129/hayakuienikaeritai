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
interface apiproto {
    recommendRoute: {
        duration: '17分',
        walkTime: '5分',
        limitTime: string,       // バス発車の5分前（建物を今から3分後に出れば間に合う計算）
        busStop: '正門バス停',
        via: 'ひ06経由',                       // 経由データ
        departureTime: string
        arrivalTime: string
        destination: '八王子駅'
    }
    otherRoutes: bus1[]
}

interface query {
    building?:string
    period?:string
}
app.get("/api/routes", (req:Request<any,any,any,query>, res:Response) => {
    if (req.query.building === undefined) {
        res.status(400).send("Need a param;building")
        return;
    }
    const building = SokaBuilding.getBuildingTime(req.query.building)
    if (building === undefined) {
        res.status(400).send(`BuildingData[${req.query.building} is not found]`)
        return
    }
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

app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});