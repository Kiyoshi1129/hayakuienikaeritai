import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import * as fs from 'fs';

(async () => {
    try {
        const buffer = fs.readFileSync("./raw/odpt_NishiTokyoBus_NTBus_trip_update")
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
            new Uint8Array(buffer)
        );
        const timed = feed.entity[0]?.tripUpdate?.stopTimeUpdate;
        console.log(timed);
    }
    catch (error) {
        console.log(error);
        process.exit(1);
    }
})();