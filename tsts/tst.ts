import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import * as fs from 'fs';

(async () => {
    try {
        const buffer = fs.readFileSync("./raw/odpt_NishiTokyoBus_NTBus_trip_update")
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
            new Uint8Array(buffer)
        );
        console.log(feed.entity[0]?.tripUpdate?.stopTimeUpdate?.at(0)?.departure);
    }
    catch (error) {
        console.log(error);
        process.exit(1);
    }
})();