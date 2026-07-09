import Database from "better-sqlite3";
export namespace SokaBusData{

    /**
     * データ形式
     */

    export interface busRoute {//バスのルート情報
        trip_id: string              //識別子
        route_short_name: string    //ルート名
        departureStopId: number     //出発バス停ID
        departureStopName: string   //出発バス停名
        departureTime: string       //出発時間
        arrivalTimeA: string        //目的地到着時間A
        arrivalTimeB: string        //目的地到着時間B
    }

    interface sokaBuilding {//建物名とバス停までの時間(分)
        name:string
        main_gate:Temporal.DurationLike
        sodaimon_gate:Temporal.DurationLike
        eikomon_gate:Temporal.DurationLike
    }

    interface reqresult {
        trip_id: string
        route_short_name: string
        destA: string
        destB: string
        dep_time_940: number|null
        dep_time_943: number|null
        dep_time_890: number|null
    }
    interface translate {
        stop_name:string
    }

    /**
     * 関数
     */

    /**
     * Bus取得
     * @param time 検索基本時刻
     * @param building 建物情報
     * @param [limit=5] 取得数
     * @param [stop=0] 目的地の選択(0:JR,1:京王)
     */
    export function get(time:Temporal.Instant,building:sokaBuilding,limit=5,stop=0): busRoute[] {
        const zonedtime = time.toZonedDateTimeISO("Asia/Tokyo");
        const plainbase = zonedtime.toPlainTime().round({smallestUnit:"seconds"});
        const main_gate_d = Temporal.Duration.from(building.main_gate)
        const sodaimon_gate_d = Temporal.Duration.from(building.sodaimon_gate)
        const eikomon_gate_d = Temporal.Duration.from(building.eikomon_gate)
        const main_gate = plainbase.add(main_gate_d)
        const sodaimon_gate = plainbase.add(sodaimon_gate_d)
        const eikomon_gate = plainbase.add(eikomon_gate_d)
        const db = Database("data/gtfs.db",{
            fileMustExist:true,
            readonly:true,
            timeout:1
        });
        const stopnames:Map<number,string> = new Map();
        stopnames.set(940,(db.prepare('SELECT stop_name FROM stops WHERE stop_id = ?').get("940") as translate).stop_name);
        stopnames.set(943,(db.prepare('SELECT stop_name FROM stops WHERE stop_id = ?').get("943") as translate).stop_name);
        stopnames.set(890,(db.prepare('SELECT stop_name FROM stops WHERE stop_id = ?').get("890") as translate).stop_name);
        const u = db.prepare(`
        SELECT
        trips.trip_id,
        routes.route_short_name,

        dest.arrival_time AS destA,
        kst.arrival_time AS destB,

        max(CASE WHEN st.stop_id LIKE '940%' AND st.departure_time >= ? THEN st.departure_timestamp END) AS dep_time_940,
        max(CASE WHEN st.stop_id LIKE '943%' AND st.departure_time >= ? THEN st.departure_timestamp END) AS dep_time_943,
        max(CASE WHEN st.stop_id LIKE '890%' AND st.departure_time >= ? THEN st.departure_timestamp END) AS dep_time_890

        FROM stop_times AS dest
        INNER JOIN trips ON dest.trip_id = trips.trip_id
        INNER JOIN routes ON trips.route_id = routes.route_id
        INNER JOIN stop_times AS st ON dest.trip_id = st.trip_id AND st.stop_sequence < dest.stop_sequence
        INNER JOIN calendar as c ON trips.service_id = c.service_id
        LEFT  JOIN stop_times AS kst ON (kst.stop_id LIKE '10%' AND (st.trip_id = kst.trip_id AND st.stop_sequence < kst.stop_sequence))
        WHERE dest.stop_id LIKE '390%'
        AND c.${[0,'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][zonedtime.dayOfWeek]} = 1
        GROUP BY trips.trip_id, routes.route_short_name, dest.arrival_time
        HAVING dep_time_940 IS NOT NULL
            OR dep_time_943 IS NOT NULL
            OR dep_time_890 IS NOT NULL
        ORDER BY destA ASC
        LIMIT ?;
        `);
        const datas = u.all(main_gate.toString(),sodaimon_gate.toString(),eikomon_gate.toString(),limit) as reqresult[];
        db.close();
        let result:busRoute[] = [];
        let best = new Temporal.Duration(0);
        let bestt = 0;
        let beststop = 0;
        datas.forEach(route => {
            if (route.dep_time_940!==null) {
                const c = new Temporal.Duration(0,0,0,0,0,0,route.dep_time_940).subtract(main_gate_d);
                if (Temporal.Duration.compare(best,c) === -1) {
                    best = c;
                    bestt = route.dep_time_940;
                    beststop = 940;
                }
            }
            if (route.dep_time_943!==null) {
                const c = new Temporal.Duration(0,0,0,0,0,0,route.dep_time_943).subtract(sodaimon_gate_d);
                if (Temporal.Duration.compare(best,c) === -1) {
                    best = c;
                    bestt = route.dep_time_943;
                    beststop = 943;
                }
            }
            if (route.dep_time_890!==null) {
                const c = new Temporal.Duration(0,0,0,0,0,0,route.dep_time_890).subtract(eikomon_gate_d);
                if (Temporal.Duration.compare(best,c) === -1) {
                    best = c;
                    bestt = route.dep_time_890;
                    beststop = 890;
                }
            }
            result.push({
                trip_id:route.trip_id,
                route_short_name:route.route_short_name,
                arrivalTimeA:route.destA,
                arrivalTimeB:route.destB,
                departureStopId:beststop,
                departureStopName:stopnames.get(beststop) || "undef",
                departureTime:new Temporal.Duration(0,0,0,0,0,0,bestt).round({largestUnit:"hours"}).toString()
            })
        });
        return result;
    }
}
console.log(SokaBusData.get(Temporal.Now.instant(),{name:"",eikomon_gate:{minutes:8},main_gate:{minutes:11},sodaimon_gate:{minutes:7}},10))
