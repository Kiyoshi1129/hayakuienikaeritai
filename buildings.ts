export namespace SokaBuilding {
    interface sokaBuilding {//建物名とバス停までの時間(分)
        name:string
        main_gate:Temporal.DurationLike
        sodaimon_gate:Temporal.DurationLike
        eikomon_gate:Temporal.DurationLike
    }

    export function getBuildingTime(name:string): sokaBuilding { //dummy
        return {name:"中央教育棟",main_gate:{minutes:14},sodaimon_gate:{minutes:7},eikomon_gate:{minutes:8}}
    }
}