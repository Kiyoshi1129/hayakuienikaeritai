import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import * as fs from 'fs';

(async () => {
    try {
        const buffer = fs.readFileSync("./raw/odpt_NishiTokyoBus_NTBus_trip_update")
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
            new Uint8Array(buffer)
        );
        const timed = feed.entity[0]?.tripUpdate?.stopTimeUpdate?.at(0)?.departure?.time;
        let r:bigint;
        if (typeof(timed) != "number" && timed) {
            r = timed.toBigInt();
        }else{
            r = BigInt(timed || 0);
        }
        console.log(r);
    }
    catch (error) {
        console.log(error);
        process.exit(1);
    }
})();