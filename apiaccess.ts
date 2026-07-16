import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import axios from "axios";
const API_KEY = process.env.ODPTApiKey;
if (API_KEY === undefined) { throw Error("No API Key") }

export namespace apiAccess {
    export async function getGtfsRealtime() {
        const { data } = await axios.get<ArrayBuffer>(
            "https://api.odpt.org/api/v4/gtfs/realtime/odpt_NishiTokyoBus_NTBus_trip_update",
            {
                params: {
                    "acl:consumerKey": API_KEY,
                    // "date":"current",
                },
                responseType: "arraybuffer",
            }
        );
        // const data = readFileSync("raw/odpt_NishiTokyoBus_NTBus_trip_update").buffer;
        // console.log(GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(data)).entity[0]);
        return GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(data)).entity;
    };
    export async function getGtfs() {
        return axios.get("https://api.odpt.org/api/v4/files/odpt/NishiTokyoBus/NTBus.zip",{
            params:{
                "acl:consumerKey": API_KEY,
                "date":"current"
            }
        });
    }
}