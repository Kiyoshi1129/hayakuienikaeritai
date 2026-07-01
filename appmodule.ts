// バックエンド用：時刻を安全に計算するためのクラス
class DTime {
    // 内部では「0時からの経過分」で持つ（25:30なら 25*60 + 30 = 1530）  
    constructor(readonly Minutes: number, readonly Delay:number = 0) {
    }
  
    // GTFSやCSVの "HH:mm:ss" または "HH:mm" からインスタンスを作る
    static fromString(timeStr: string): DTime {
        const [h=0, m=0] = timeStr.split(":").map(Number);
        return new DTime(h * 60 + m);
    }
  
    // フロントエンドに渡しやすい文字列フォーマットに戻す
    toString(): string {
        const h = Math.floor(this.Minutes / 60).toString().padStart(2, "0");
        const m = (this.Minutes % 60).toString().padStart(2, "0");
        return `${h}:${m}`;
    }
    pastedOf(m:number): DTime {
        return new DTime(this.Minutes + m)
    }
}
interface SokaBuilding {
    name:string
    se:number
    so:number
    ei:number
}

interface Bus {
    id:number
    route:string
    realtime:boolean
    stop_se:DTime|null
    stop_so:DTime|null
    stop_ei:DTime|null
    a_time:DTime
}

interface BusExport {
    route:string                //系統
    stopFrom:string             //出発
    stopTo:string               //到着
    scheduledDeparture:number   //発車時刻
    scheduledAarrival:number    //到着時刻
    realime:boolean             //リアルタイム情報
    delay_D:number|null         //出発遅れ
    delay_A:number|null         //到着遅れ
}

interface frontexport {
    buses:BusExport[]
    time:Date
}

function getBuildingData(buildingname:string): SokaBuilding {
    /**
     * get from database
     */
    const name = buildingname;
    const se = 1;
    const so = 1;
    const ei = 1;
    return {name:name,se:se,so:so,ei:ei}
}

function get4(d_time:DTime,from:string): Bus[] {
    /**
     * get from database
     */
    return []
}

function find4(basetime:DTime, loc:SokaBuilding):Bus[] {
    const se_mon: Bus[] = get4(basetime.pastedOf(loc.se),"正門");
    const so_mon: Bus[] = get4(basetime.pastedOf(loc.so),"創大門");
    const ei_mon: Bus[] = get4(basetime.pastedOf(loc.ei),"栄光門");
    const uniq:Set<number> = new Set();
    return [...se_mon, ...so_mon, ...ei_mon].filter(b=>{
        if (uniq.has(b.id)) {
            return false;
        }
        uniq.add(b.id)
        return true;
    }).sort((a,b)=>a.a_time.Minutes-b.a_time.Minutes).splice(0,4)
}

console.log(find4(new DTime(0),{name:"a",se:1,so:1,ei:1}).map(b=>b.a_time))