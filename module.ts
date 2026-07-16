import Database from "better-sqlite3";
import { apiAccess } from "./apiaccess.js";
import GtfsRealtimeBindings from "gtfs-realtime-bindings"

export namespace SokaBusData {
    type tripid = string

    export enum busstate {
        NONE,
        DELAY,
        NEW,
        DUPLICATED,
        REPLACEMENT
    }

    export interface buses {
        type:busstate;      //データ状態種別
        route_name: string; //運行名
        stop_name: string;  //停留所名
        arrtime_a: string;  //JR到着時刻
        arrtime_b:string;   //京王到着時刻
        arrnum:  number;    //到着タイムスタンプ
        deptime: string;    //出発時刻
        b_deptime: string;  //建物出発時刻
        walk: number;       //徒歩時間
        delay?: number      //遅れ（分）
        arrfix_a?: string;  //到着修正a
        arrfix_b?: string;  //到着修正b
        depfix?: string;    //出発修正
        duration: number;   //所要時間（分）
        extra_walk: number; //追加徒歩時間
    }
    export function searchBus(zonedtime: Temporal.ZonedDateTime, building: SokaBuildings.sokaBuilding, limit = 5, stop = 0):buses[] {
        const plainbase = zonedtime.toPlainTime().round({ smallestUnit: "second" });
        const main_gate_d = Temporal.Duration.from({ minutes: building.main_gate });
        const sodaimon_gate_d = Temporal.Duration.from({ minutes: building.sodaimon_gate });
        const eikomon_gate_d = Temporal.Duration.from({ minutes: building.eikomon_gate });
        const main_gate_sec = plainbase.add(main_gate_d).since({second:0}).total("second");
        const sodaimon_gate_sec = plainbase.add(sodaimon_gate_d).since({second:0}).total("second");
        const eikomon_gate_sec = plainbase.add(eikomon_gate_d).since({second:0}).total("second");
        const main_gate_s = main_gate_d.total("second");
        const sodaimon_gate_s = sodaimon_gate_d.total("second");
        const eikomon_gate_s = eikomon_gate_d.total("second");
        const db = Database("data/gtfs.db", {
            fileMustExist: true,
            readonly: true,
            timeout: 1
        });
        const stopnames: Map<number, string> = new Map();
        stopnames.set(940, (db.prepare('SELECT stop_name as n FROM stops WHERE stop_id = ?').get("940") as {n:string}).n);
        stopnames.set(943, (db.prepare('SELECT stop_name as n FROM stops WHERE stop_id = ?').get("943") as {n:string}).n);
        stopnames.set(890, (db.prepare('SELECT stop_name as n FROM stops WHERE stop_id = ?').get("890") as {n:string}).n);
        const datas = db.prepare(`
        SELECT
        trips.trip_id,
        routes.route_short_name,

        dest.arrival_time AS destA,
        dest.arrival_timestamp AS desttA,
        kst.arrival_time AS destB,
        kst.arrival_timestamp AS desttB,

        max(CASE WHEN st.stop_id LIKE '940%' THEN st.departure_time END) AS dep_940,
        max(CASE WHEN st.stop_id LIKE '943%' THEN st.departure_time END) AS dep_943,
        max(CASE WHEN st.stop_id LIKE '890%' THEN st.departure_time END) AS dep_890,
        max(CASE WHEN st.stop_id LIKE '940%' THEN st.departure_timestamp END) AS dep_time_940,
        max(CASE WHEN st.stop_id LIKE '943%' THEN st.departure_timestamp END) AS dep_time_943,
        max(CASE WHEN st.stop_id LIKE '890%' THEN st.departure_timestamp END) AS dep_time_890

        FROM stop_times AS dest
        INNER JOIN trips ON dest.trip_id = trips.trip_id
        INNER JOIN routes ON trips.route_id = routes.route_id
        INNER JOIN stop_times AS st ON dest.trip_id = st.trip_id AND st.stop_sequence < dest.stop_sequence
        INNER JOIN calendar as c ON trips.service_id = c.service_id
        LEFT  JOIN stop_times AS kst ON (kst.stop_id LIKE '10%' AND (st.trip_id = kst.trip_id AND st.stop_sequence < kst.stop_sequence))
        WHERE dest.stop_id LIKE '390%'
        AND c.${[0, 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][zonedtime.dayOfWeek]} = 1
        GROUP BY trips.trip_id, routes.route_short_name, dest.arrival_time
        HAVING dep_time_940 IS NOT NULL
            OR dep_time_943 IS NOT NULL
            OR dep_time_890 IS NOT NULL
        ORDER BY destA ASC
        `).all() as {trip_id: string,route_short_name: string,destA: string,desttA: number,destB: string|null,desttB: number|null,dep_time_940: number | null,dep_time_943: number | null,dep_time_890: number | null,dep_890: string | null,dep_940: string | null,dep_943: string | null}[];
        db.close();
        const ed:buses[] = [];
        const nd:buses[] = [];
        datas.forEach(route=>{
            type bestobj = {i:number,dl:number,dr:number,d:string,w:number,de:number}
            if (RealtimeData.delaynow.has(route.trip_id)) {
                const dd = RealtimeData.delay.get(route.trip_id);
                let d940:number|undefined|null;
                let d943:number|undefined|null;
                let d890:number|undefined|null;
                let d390:number|undefined|null;
                dd?.tripUpdate?.stopTimeUpdate?.forEach(element => {
                    if (/^940_\d+$/.test(element.stopId || "")) d940 = element.departure?.delay;
                    if (/^943_\d+$/.test(element.stopId || "")) d943 = element.departure?.delay;
                    if (/^890_\d+$/.test(element.stopId || "")) d890 = element.departure?.delay;
                    if (/^390_\d+$/.test(element.stopId || "")) d390 = element.departure?.delay;
                });
                let fix940:number|undefined;
                let fix943:number|undefined;
                let fix890:number|undefined;
                let fix390:number|undefined;
                const times:bestobj[] = [];
                if (d940 === undefined ||d940 === null) d940 = dd?.tripUpdate?.stopTimeUpdate?.at(-1)?.departure?.delay as number;
                if (d943 === undefined ||d943 === null) d943 = dd?.tripUpdate?.stopTimeUpdate?.at(-1)?.departure?.delay as number;
                if (d890 === undefined ||d890 === null) d890 = dd?.tripUpdate?.stopTimeUpdate?.at(-1)?.departure?.delay as number;
                if (d390 === undefined ||d390 === null) d390 = dd?.tripUpdate?.stopTimeUpdate?.at(-1)?.departure?.delay as number;
                if (route.dep_time_940) fix940 = route.dep_time_940 + d940;
                if (route.dep_time_943) fix943 = route.dep_time_943 + d943;
                if (route.dep_time_890) fix890 = route.dep_time_890 + d890;
                fix390 = route.desttA + d390
                if (fix940 && fix940>main_gate_sec) times.push({i:940,dl:fix940-main_gate_s,dr:fix940,d:route.dep_940 as string,w:building.main_gate,de:d940});
                if (fix943 && fix943>sodaimon_gate_sec) times.push({i:943,dl:fix943-sodaimon_gate_s,dr:fix943,d:route.dep_943 as string,w:building.sodaimon_gate,de:d943});
                if (fix890 && fix890>eikomon_gate_sec) times.push({i:890,dl:fix890-eikomon_gate_s,dr:fix890,d:route.dep_890 as string,w:building.eikomon_gate,de:d890});
                if (times.length<1) return;
                const best = times.sort((a,b)=>b.dl-a.dl);
                ed.push({
                    type: busstate.DELAY,
                    route_name: route.route_short_name,
                    stop_name: stopnames.get((best[0] as bestobj).i)||"null",
                    arrtime_a: cutSecond(Temporal.PlainTime.from(route.destA).round({smallestUnit:"minute"})),
                    arrnum:route.desttA,
                    deptime: cutSecond(Temporal.PlainTime.from((best[0] as bestobj).d).round({smallestUnit:"minute"})),
                    arrtime_b: route.destB ? cutSecond(Temporal.PlainTime.from(route.destB)) : toTimeString(route.desttA+5*60),
                    b_deptime: toTimeString((best[0] as bestobj).dl),
                    walk: (best[0] as bestobj).w,
                    duration: new Temporal.Duration(0, 0, 0, 0, 0, 0, route.desttA-(best[0] as bestobj).dl).round({smallestUnit:"minute"}).total("minute"),
                    delay:Math.floor((best[0] as bestobj).de/60),
                    arrfix_a:toTimeString(fix390),
                    arrfix_b:toTimeString(fix390 + 5*60),
                    depfix:toTimeString(best[0]?.dr as number),
                    extra_walk: stop && route.destB===null ? 5*60 : 0,
                });
            } else {
                type bestobj = {i:number,dl:number,d:string,w:number}
                const times:bestobj[] = [];
                if (route.dep_time_940 && route.dep_time_940>main_gate_sec) times.push({i:940,dl:route.dep_time_940-main_gate_s,d:route.dep_940 as string,w:building.main_gate});
                if (route.dep_time_943 && route.dep_time_943>sodaimon_gate_sec) times.push({i:943,dl:route.dep_time_943-sodaimon_gate_s,d:route.dep_943 as string,w:building.sodaimon_gate});
                if (route.dep_time_890 && route.dep_time_890>eikomon_gate_sec) times.push({i:890,dl:route.dep_time_890-eikomon_gate_s,d:route.dep_890 as string,w:building.eikomon_gate});
                if (times.length<1) return;
                const best = times.sort((a,b)=>b.dl-a.dl);
                nd.push({
                    type:busstate.NONE,
                    route_name: route.route_short_name,
                    stop_name: stopnames.get((best[0] as bestobj).i)||"null",
                    arrtime_a: cutSecond(Temporal.PlainTime.from(route.destA).round({smallestUnit:"minute"})),
                    arrnum:route.desttA,
                    deptime: cutSecond(Temporal.PlainTime.from((best[0] as bestobj).d).round({smallestUnit:"minute"})),
                    b_deptime: toTimeString((best[0] as bestobj).dl),
                    walk: (best[0] as bestobj).w,
                    duration: new Temporal.Duration(0, 0, 0, 0, 0, 0, route.desttA-(best[0] as bestobj).dl).round({smallestUnit:"minute"}).total("minute"),
                    extra_walk: stop && route.destB===null ? 5*60 : 0,
                    arrtime_b: route.destB || toTimeString(route.desttA)
                });
            }
        });
        return [...ed,...nd].sort((a,b)=>a.arrnum-b.arrnum).slice(0,limit);
    }
    function toTimeString(time_n: number): string {
        const t = new Temporal.Duration(0, 0, 0, 0, 0, 0, time_n).round({ largestUnit: "hours", smallestUnit: "minutes" })
        return `${t.hours.toString().padStart(2, "0")}:${t.minutes.toString().padStart(2, "0")}`
    }
    function cutSecond(time: Temporal.PlainTime): string {
        return `${time.hour.toString().padStart(2, "0")}:${time.minute.toString().padStart(2, "0")}`
    }

    export function getTripIds(): Set<tripid> {
        const db = Database("data/gtfs.db", {
            fileMustExist:true,
            readonly:true,
            timeout:1
        });
        const s = new Set((db.prepare(`
            SELECT trips.trip_id FROM trips
            INNER JOIN stop_times ON stop_times.trip_id = trips.trip_id AND stop_times.stop_id LIKE '390%'
            INNER JOIN stop_times AS st ON trips.trip_id = st.trip_id AND st.stop_sequence < stop_times.stop_sequence
            INNER JOIN stops ON stops.stop_id = stop_times.stop_id
            GROUP BY trips.trip_id HAVING
            max(CASE WHEN st.stop_id LIKE '940%' THEN st.departure_timestamp END) IS NOT NULL OR
            max(CASE WHEN st.stop_id LIKE '943%' THEN st.departure_timestamp END) IS NOT NULL OR
            max(CASE WHEN st.stop_id LIKE '890%' THEN st.departure_timestamp END) IS NOT NULL;
            `).all() as {trip_id:string}[]).map(b=>b.trip_id));
        db.close();
        return s;
    }
    export function getRouteIds(): Map<string,string> {
        const db = Database("data/gtfs.db", {
            fileMustExist:true,
            readonly:true,
            timeout:1
        });
        const m = new Map();
        (db.prepare(`
            SELECT trips.route_id as a,routes.route_short_name as b FROM trips
            INNER JOIN routes ON trips.route_id = routes.route_id
            INNER JOIN stop_times ON stop_times.trip_id = trips.trip_id AND stop_times.stop_id LIKE '390%'
            INNER JOIN stop_times AS st ON trips.trip_id = st.trip_id AND st.stop_sequence < stop_times.stop_sequence
            INNER JOIN stops ON stops.stop_id = stop_times.stop_id
            GROUP BY trips.route_id HAVING
            max(CASE WHEN st.stop_id LIKE '940%' THEN st.departure_timestamp END) IS NOT NULL OR
            max(CASE WHEN st.stop_id LIKE '943%' THEN st.departure_timestamp END) IS NOT NULL OR
            max(CASE WHEN st.stop_id LIKE '890%' THEN st.departure_timestamp END) IS NOT NULL
            ;`).all() as {a:string,b:string}[]).forEach(e=>m.set(e.a,e.b));
            db.close();
            return m;
    }
    export function getStations(stop:string) {
        const db = Database("data/gtfs.db", {
            fileMustExist:true,
            readonly:true,
            timeout:1
        });
        const s = (db.prepare("SELECT st.stop_id as s FROM stops as st WHERE st.parent_station = ?;").all() as {s:string}[]).map(e=>e.s);
        db.close();
        return new Set(s);
    }
}

export namespace SokaBuildings {
    export interface sokaBuilding {//建物名とバス停までの時間(分)
        name:string;
        main_gate:number;
        sodaimon_gate:number;
        eikomon_gate:number;
    }

    export function getBuildingTime(name:string): sokaBuilding|undefined { //dummy
        const db = Database('./data/buildings.db');
        const data = db.prepare("SELECT * FROM buildings WHERE buildings.name = ?;").get(name) as sokaBuilding|undefined;
        db.close();
        return data;
    }
}

// import { readFileSync } from "fs";

export namespace RealtimeData {
    export let delay = new Map<string,GtfsRealtimeBindings.transit_realtime.IFeedEntity>();
    export let delaynow = new Set<string>();
    export let lastupdate = Temporal.Now.plainTimeISO()
    // export let newbus:any;
    // const s940 = SokaBusData.getStations('940');
    // const s943 = SokaBusData.getStations('943');
    // const s890 = SokaBusData.getStations('890');

    const tripfilter = SokaBusData.getTripIds();
    // const routefilter = SokaBusData.getRouteIds();

    export async function updateDelayData() {
        try {
            // const rtdata = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(readFileSync("C:\\Users\\ibuki\\Downloads\\odpt_NishiTokyoBus_NTBus_trip_update")).entity;
            const rtdata = await apiAccess.getGtfsRealtime();
            const ftd = new Map();
            rtdata.filter(et=>tripfilter.has(et.tripUpdate?.trip.tripId || "")).forEach(et=>ftd.set(et.tripUpdate?.trip.tripId,et));
            delay = ftd;
            const s = new Set<string>();
            ftd.forEach(element => {
                if (element.tripUpdate?.trip?.tripId) {
                    s.add(element.tripUpdate.trip.tripId);
                }
            });
            delaynow = s;/*
            const n = rtdata.filter(et=>et.tripUpdate?.trip.scheduleRelationship === GtfsRealtimeBindings.transit_realtime.TripDescriptor.ScheduleRelationship.NEW).filter(e=>routefilter.has(e.tripUpdate?.trip.routeId || "")).filter(e=>e.tripUpdate?.stopTimeUpdate);
            newbus = n.map(e=>{
                const lastdelay = e.tripUpdate?.stopTimeUpdate?.at(-1)?.departure?.delay || 0;
                let _940 = lastdelay;
                let _943 = lastdelay;
                let _890 = lastdelay;
                e.tripUpdate?.stopTimeUpdate?.forEach(element => {
                    if (s940.has(element.stopId||"")) {
                        if (typeof element.departure?.delay === 'number') {
                            _940 = element.departure.delay;
                        }
                    }
                    if (s943.has(element.stopId||"")) {
                        if (typeof element.departure?.delay === 'number') {
                            _943 = element.departure.delay;
                        }
                    }
                    if (s890.has(element.stopId||"")) {
                        if (typeof element.departure?.delay === 'number') {
                            _890 = element.departure.delay;
                        }
                    }
                });
                return []
            });*/
            console.log("Realtime:update");
        } catch (error) {
            console.log(`Can't update by:${error}`);
        }
    }
}
