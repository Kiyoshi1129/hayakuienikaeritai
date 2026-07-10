import Database from "better-sqlite3"

export namespace SokaBuilding {
    interface sokaBuilding {//建物名とバス停までの時間(分)
        name:string
        main_gate:number
        sodaimon_gate:number
        eikomon_gate:number
    }

    export function getBuildingTime(name:string): sokaBuilding|undefined { //dummy
        const db = Database('./data/buildings.db');
        const data = db.prepare("SELECT * FROM buildings WHERE buildings.name = ?;").get(name) as sokaBuilding|undefined
        db.close();
        return data
    }
}
