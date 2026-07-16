import express, { type Request, type Response } from "express";
import { SokaBusData, SokaBuildings, RealtimeData } from "./module.js";


const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({extended:false}));

interface query {
    building?:string
    period?:string
    limit?:string
    destination?:string
}

interface busJson {
    type:SokaBusData.busstate;      //データ状態種別
    route_name: string; //運行名
    stop_name: string;  //停留所名
    arrtime: string;    //到着時刻
    arrnum:  number;    //到着タイムスタンプ
    deptime: string;    //出発時刻
    b_deptime: string;  //建物出発時刻
    walk: number;       //徒歩時間
    delay: number|undefined;     //遅れ（分）
    arrfix: string|undefined;    //到着修正
    depfix: string|undefined;    //出発修正
    duration: number;   //所要時間（分）
    extra_walk: number; //追加徒歩時間
}


app.get("/api/routes", (req:Request<any,any,any,query>, res:Response) => {
    if (req.query.building === undefined) {
        res.status(400).send("Need a param;building");return;
    }
    if (!/^\d{1,2}/.test(req.query.limit || "4")) {
        res.status(400).send(`${req.query.limit} is not a number`);return;
    }
    const building = SokaBuildings.getBuildingTime(req.query.building);
    if (building === undefined) {
        res.status(400).send(`BuildingData[${req.query.building}] is not found`);return;
    }
    let time = Temporal.Now.zonedDateTimeISO();
    switch (req.query.period) {
        case "1限終わり":time = time.with({hour:10,minute:30});break;
        case "2限終わり":time = time.with({hour:12,minute:15});break;
        case "3限終わり":time = time.with({hour:14,minute:35});break;
        case "4限終わり":time = time.with({hour:16,minute:20});break;
        case "5限終わり":time = time.with({hour:18,minute: 5});break;
        default:
            break;
    }
    const stop = req.query.destination === "Keio" ? 1 : 0;
    const result:busJson[] = SokaBusData.searchBus(time,building,Number(req.query.limit || 4),stop).map(e=>({
        type:e.type,
        route_name:e.route_name,
        stop_name:e.stop_name,
        arrtime:stop ? e.arrtime_b : e.arrtime_a, 
        arrnum:  e.arrnum,
        deptime: e.deptime,
        b_deptime: e.b_deptime,
        walk: e.walk,
        delay: e.delay,
        arrfix: e.delay ? (stop ? e.arrfix_b : e.arrfix_a):undefined,
        depfix: e.delay ? e.depfix:undefined,
        duration: e.duration,
        extra_walk: e.extra_walk
    }))
    res.json(result);
});
RealtimeData.updateDelayData();
const i_id = setInterval(RealtimeData.updateDelayData,60000);

app.post("/proccess/close",(req,res)=>{
    if (req.body.key == process.env.ODPTApiKey) {
        setTimeout(stop, 500);
        res.sendStatus(204);
    } else res.sendStatus(404);
})

const server = app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});

const stop = ()=>{
    console.log('Close request received: closing HTTP server');
    clearInterval(i_id);
    server.close(() => {
        console.log('HTTP server closed');
    })
}
process.on('SIGTERM', stop);
